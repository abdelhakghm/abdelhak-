
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Person, SavingsGoal } from '../types';

interface ModalProps {
  type: 'income' | 'expense' | 'debt' | 'cash' | 'savings_goal';
  people: Person[];
  onClose: () => void;
  onSuccess: () => void;
}

const Modal: React.FC<ModalProps> = ({ type, people, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [deductionNotice, setDeductionNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    title: '',
    category: 'Lifestyle',
    date: new Date().toISOString().split('T')[0],
    person_name: '',
    person_id: '',
    debt_type: 'owe_me' as 'owe_me' | 'i_owe',
    goal_name: '',
    target_amount: '',
    recurring_amount: '',
    frequency: 'monthly' as 'daily' | 'monthly'
  });

  const updateLiquidCash = async (userId: string, adjustment: number) => {
    const { data: currentCash, error: fetchError } = await supabase
      .from('cash')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (currentCash) {
      const newAmount = Math.max(0, Number(currentCash.amount) + adjustment);
      const { error: updateError } = await supabase
        .from('cash')
        .update({ 
          amount: newAmount,
          updated_at: new Date().toISOString() 
        })
        .eq('id', currentCash.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('cash')
        .insert([{ user_id: userId, amount: Math.max(0, adjustment) }]);
      if (insertError) throw insertError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDeductionNotice(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

      if (type === 'income') {
        const amt = parseFloat(formData.amount);
        if (isNaN(amt)) throw new Error("Invalid amount");
        let finalIncomeAmt = amt;
        
        // 1. Check for due savings goals
        const { data: activeGoals, error: goalError } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('status', 'active')
          .eq('user_id', user.id);

        if (goalError) console.warn("Goal check skipped:", goalError.message);

        if (activeGoals && activeGoals.length > 0) {
          const today = new Date();
          const todayKey = today.toISOString().split('T')[0];
          const monthKey = `${today.getFullYear()}-${today.getMonth()}`;

          for (const goal of activeGoals as SavingsGoal[]) {
            const lastDate = goal.last_deduction_date ? new Date(goal.last_deduction_date) : null;
            let isDue = false;

            if (!lastDate) {
              isDue = true;
            } else {
              if (goal.frequency === 'daily') {
                isDue = lastDate.toISOString().split('T')[0] !== todayKey;
              } else {
                const lastMonthKey = `${lastDate.getFullYear()}-${lastDate.getMonth()}`;
                isDue = lastMonthKey !== monthKey;
              }
            }

            if (isDue && Number(goal.monthly_amount) > 0) {
              const deduction = Math.min(Number(goal.monthly_amount), finalIncomeAmt);
              if (deduction > 0) {
                const newSaved = Number(goal.saved_amount) + deduction;
                
                const { error: updGoalErr } = await supabase.from('savings_goals').update({
                  saved_amount: newSaved,
                  last_deduction_date: today.toISOString(),
                  status: newSaved >= Number(goal.target_amount) ? 'completed' : 'active'
                }).eq('id', goal.id);

                if (!updGoalErr) {
                  finalIncomeAmt -= deduction;
                  setDeductionNotice(`${deduction.toLocaleString()} DA moved to "${goal.name}"`);
                  // Pause to let user see the feedback
                  await new Promise(r => setTimeout(r, 1200));
                }
              }
            }
          }
        }

        // 2. Add remaining amount to cash
        await updateLiquidCash(user.id, finalIncomeAmt);

        // 3. Record Income
        const { error: incError } = await supabase.from('incomes').insert([{ 
          user_id: user.id, 
          amount: amt, // We record the full amount in history but only 'final' went to cash
          source: formData.source, 
          date: formData.date 
        }]);
        if (incError) throw incError;
      } 
      else if (type === 'expense') {
        const amt = parseFloat(formData.amount);
        if (isNaN(amt)) throw new Error("Invalid amount");
        
        await updateLiquidCash(user.id, -amt);
        const { error: expError } = await supabase.from('expenses').insert([{ 
          user_id: user.id, 
          title: formData.title, 
          amount: amt, 
          category: formData.category, 
          date: formData.date 
        }]);
        if (expError) throw expError;
      } 
      else if (type === 'cash') {
        const amt = parseFloat(formData.amount);
        const { data: existing } = await supabase.from('cash').select('*').eq('user_id', user.id).maybeSingle();
        if (existing) {
          await supabase.from('cash').update({ amount: amt, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('cash').insert([{ user_id: user.id, amount: amt }]);
        }
      } 
      else if (type === 'debt') {
        const amt = parseFloat(formData.amount);
        let pId = formData.person_id;
        if (!pId && formData.person_name) {
          const { data: newPerson } = await supabase.from('people').insert([{ user_id: user.id, name: formData.person_name }]).select().single();
          pId = newPerson?.id;
        }
        if (pId) {
          const adjustment = formData.debt_type === 'owe_me' ? -amt : amt;
          await updateLiquidCash(user.id, adjustment);
          await supabase.from('debts').insert([{ 
            user_id: user.id, 
            person_id: pId, 
            amount: amt, 
            type: formData.debt_type, 
            date: formData.date 
          }]);
        }
      }
      else if (type === 'savings_goal') {
        const { error: goalInsErr } = await supabase.from('savings_goals').insert([{
          user_id: user.id,
          name: formData.goal_name,
          target_amount: parseFloat(formData.target_amount),
          monthly_amount: parseFloat(formData.recurring_amount),
          frequency: formData.frequency,
          saved_amount: 0,
          status: 'active',
          start_date: new Date().toISOString()
        }]);
        if (goalInsErr) throw goalInsErr;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Drahmi Error:", err);
      alert("Command Failed: Check if your Database tables are updated. (" + (err.message || "Unknown error") + ")");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="w-full max-w-xl glass rounded-[32px] p-8 shadow-2xl relative z-10 animate-fade-in border-white/10">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white capitalize">{type.replace('_', ' ')}</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Economic Protocol</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass rounded-xl text-slate-500 hover:text-white flex items-center justify-center interactive-active">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {deductionNotice && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-fade-in text-center">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">✨ Automated Allocation</p>
            <p className="text-white text-xs font-bold mt-1">{deductionNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'savings_goal' ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Asset Target Name</label>
                <input required type="text" placeholder="e.g. Dream Apartment" className="w-full h-14 glass rounded-xl px-4 text-white outline-none focus:border-blue-500/50" value={formData.goal_name} onChange={e => setFormData({...formData, goal_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Final Sum (DA)</label>
                  <input required type="number" placeholder="500000" className="w-full h-14 glass rounded-xl px-4 text-white outline-none" value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Frequency</label>
                  <select className="w-full h-14 glass rounded-xl px-4 text-white outline-none bg-slate-900" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
                    <option value="daily">Daily Save</option>
                    <option value="monthly">Monthly Save</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Recurring Amount (DA)</label>
                <input required type="number" placeholder="How much to auto-deduct?" className="w-full h-14 glass rounded-xl px-4 text-white outline-none" value={formData.recurring_amount} onChange={e => setFormData({...formData, recurring_amount: e.target.value})} />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Volume (DA)</label>
                <input required type="number" step="0.01" placeholder="0.00" className="w-full h-20 bg-transparent border-none text-center text-5xl font-black text-white outline-none placeholder:text-slate-800 tracking-tighter" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {type === 'income' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Capital Origin</label>
                    <input required type="text" placeholder="Salary, Bonus, Sale..." className="w-full h-14 glass rounded-xl px-4 text-white outline-none" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
                  </div>
                )}
                {type === 'expense' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Item/Service</label>
                      <input required type="text" placeholder="Description" className="w-full h-14 glass rounded-xl px-4 text-white outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sector</label>
                      <select className="w-full h-14 glass rounded-xl px-4 text-white outline-none bg-slate-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option>Lifestyle</option><option>Vitals</option><option>Fixed Assets</option><option>Misc</option>
                      </select>
                    </div>
                  </div>
                )}
                {type === 'debt' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Counterparty</label>
                      <input required type="text" placeholder="Full Name" className="w-full h-14 glass rounded-xl px-4 text-white outline-none" value={formData.person_name} onChange={e => setFormData({...formData, person_name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setFormData({...formData, debt_type: 'owe_me'})} className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.debt_type === 'owe_me' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'glass text-slate-500'}`}>I am Lender</button>
                      <button type="button" onClick={() => setFormData({...formData, debt_type: 'i_owe'})} className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.debt_type === 'i_owe' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'glass text-slate-500'}`}>I am Borrower</button>
                    </div>
                  </div>
                )}
                {type !== 'cash' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Log Date</label>
                    <input required type="date" className="w-full h-14 glass rounded-xl px-4 text-white outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                )}
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full h-16 bg-white text-slate-950 font-black text-sm rounded-2xl shadow-xl hover:bg-slate-200 disabled:opacity-50 uppercase tracking-[0.2em] transition-all interactive-active">
            {loading ? 'Processing Transaction...' : 'Confirm Action'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Modal;
