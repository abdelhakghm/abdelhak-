
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
    monthly_amount: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amt = parseFloat(formData.amount);

      if (type === 'income') {
        let finalIncomeAmt = amt;
        
        // Smart Saving Deduction Logic
        const { data: activeGoals } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('status', 'active');

        if (activeGoals && activeGoals.length > 0) {
          const today = new Date();
          const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;

          for (const goal of activeGoals as SavingsGoal[]) {
            const lastDeduction = goal.last_deduction_date ? new Date(goal.last_deduction_date) : null;
            const lastMonthKey = lastDeduction ? `${lastDeduction.getFullYear()}-${lastDeduction.getMonth()}` : '';

            // If a deduction hasn't happened this month for this goal
            if (currentMonthKey !== lastMonthKey && goal.monthly_amount > 0) {
              const deduction = Math.min(Number(goal.monthly_amount), finalIncomeAmt);
              if (deduction > 0) {
                const newSaved = Number(goal.saved_amount) + deduction;
                
                await supabase.from('savings_goals').update({
                  saved_amount: newSaved,
                  last_deduction_date: today.toISOString(),
                  status: newSaved >= Number(goal.target_amount) ? 'completed' : 'active'
                }).eq('id', goal.id);

                finalIncomeAmt -= deduction;
                setDeductionNotice(`${deduction.toLocaleString()} DA diverted to "${goal.name}"`);
                // Wait briefly so the user sees the animation/notice
                await new Promise(r => setTimeout(r, 1200));
              }
              break; // Deduced from one goal per income for simplicity
            }
          }
        }

        await supabase.from('incomes').insert([{ 
          user_id: user.id, 
          amount: finalIncomeAmt, 
          source: formData.source, 
          date: formData.date 
        }]);
      } 
      else if (type === 'expense') {
        await supabase.from('expenses').insert([{ user_id: user.id, title: formData.title, amount: amt, category: formData.category, date: formData.date }]);
      } 
      else if (type === 'cash') {
        const { data: existing } = await supabase.from('cash').select('*').eq('user_id', user.id).maybeSingle();
        if (existing) {
          await supabase.from('cash').update({ amount: amt, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('cash').insert([{ user_id: user.id, amount: amt }]);
        }
      } 
      else if (type === 'debt') {
        let pId = formData.person_id;
        if (!pId && formData.person_name) {
          const { data: newPerson } = await supabase.from('people').insert([{ user_id: user.id, name: formData.person_name }]).select().single();
          pId = newPerson?.id;
        }
        if (pId) {
          await supabase.from('debts').insert([{ user_id: user.id, person_id: pId, amount: amt, type: formData.debt_type, date: formData.date }]);
        }
      }
      else if (type === 'savings_goal') {
        await supabase.from('savings_goals').insert([{
          user_id: user.id,
          name: formData.goal_name,
          target_amount: parseFloat(formData.target_amount),
          monthly_amount: parseFloat(formData.monthly_amount),
          saved_amount: 0,
          status: 'active',
          start_date: new Date().toISOString()
        }]);
      }

      onSuccess();
    } catch (err: any) {
      console.error("Submission error:", err);
      alert("Command failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="w-full max-w-xl glass rounded-t-[40px] sm:rounded-[32px] p-8 pb-12 sm:pb-8 shadow-2xl relative z-10 animate-bottom-sheet sm:animate-modal">
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden"></div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tighter text-white capitalize">{type.replace('_', ' ')}</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Registry Entry</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass rounded-xl text-slate-500 hover:text-white flex items-center justify-center interactive-active">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {deductionNotice && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-fade-in">
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest text-center">✨ Smart Saving Applied</p>
            <p className="text-white text-xs font-bold text-center mt-1">{deductionNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'savings_goal' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Objective Name</label>
                <input required type="text" placeholder="e.g., MacBook M3" className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.goal_name} onChange={e => setFormData({...formData, goal_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Target (DA)</label>
                    <input required type="number" placeholder="250000" className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Auto-Save (DA/mo)</label>
                    <input required type="number" placeholder="10000" className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.monthly_amount} onChange={e => setFormData({...formData, monthly_amount: e.target.value})} />
                 </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Volume (DA)</label>
                <input 
                  required type="number" step="0.01" placeholder="0.00"
                  className="w-full h-20 glass border-white/10 rounded-2xl px-6 text-4xl font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-800 tracking-tighter"
                  value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {type === 'income' && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Origin</label>
                    <input required type="text" placeholder="Salary, Gift, Sale..." className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
                  </div>
                )}

                {type === 'expense' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descriptor</label>
                      <input required type="text" placeholder="Item or Service" className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sector</label>
                      <select className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 appearance-none bg-slate-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option>Lifestyle</option><option>Vitals</option><option>Fixed Assets</option><option>Infrastructure</option><option>Misc</option>
                      </select>
                    </div>
                  </>
                )}

                {type === 'debt' && (
                  <>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Counterparty</label>
                      <input required type="text" placeholder="Person or Org Name" className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.person_name} onChange={e => setFormData({...formData, person_name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 col-span-2">
                      <button type="button" onClick={() => setFormData({...formData, debt_type: 'owe_me'})} className={`h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all interactive-active ${formData.debt_type === 'owe_me' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20' : 'glass text-slate-500 border-white/10'}`}>Asset (+)</button>
                      <button type="button" onClick={() => setFormData({...formData, debt_type: 'i_owe'})} className={`h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all interactive-active ${formData.debt_type === 'i_owe' ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/20' : 'glass text-slate-500 border-white/10'}`}>Liability (-)</button>
                    </div>
                  </>
                )}

                {type !== 'cash' && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Execution Date</label>
                    <input required type="date" className="w-full h-14 glass rounded-xl px-4 text-white outline-none border-white/5 focus:border-blue-500/50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-6">
            <button 
              type="submit" disabled={loading}
              className="w-full h-16 bg-white text-slate-950 font-black text-sm rounded-2xl shadow-xl hover:bg-slate-200 transition-all disabled:opacity-50 uppercase tracking-[0.2em] interactive-active"
            >
              {loading ? 'Authenticating...' : 'Commit Command'}
            </button>
          </div>
          <div className="h-safe sm:hidden"></div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
