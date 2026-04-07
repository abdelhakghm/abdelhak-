
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
  const [personSearch, setPersonSearch] = useState('');
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

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const updateLiquidCash = async (userId: string, adjustment: number) => {
    try {
      const { data: currentCash } = await supabase
        .from('cash')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentCash) {
        const newAmount = Math.max(0, Number(currentCash.amount) + adjustment);
        await supabase
          .from('cash')
          .update({ 
            amount: newAmount,
            updated_at: new Date().toISOString() 
          })
          .eq('id', currentCash.id);
      } else {
        await supabase
          .from('cash')
          .insert({ 
            user_id: userId, 
            amount: Math.max(0, adjustment),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error: any) {
      console.error('Cash update error:', error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDeductionNotice(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("User session not found.");

      if (type === 'income') {
        const amt = parseFloat(formData.amount);
        if (isNaN(amt)) throw new Error("Invalid amount");
        let cashToAddToLiquid = amt;
        let totalDiverted = 0;
        
        // Auto-Save Protocol Logic
        const { data: activeGoals } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (activeGoals && activeGoals.length > 0) {
          const today = new Date();

          for (const goal of activeGoals) {
            const lastDate = goal.last_deduction_date ? new Date(goal.last_deduction_date) : new Date(goal.start_date);
            let isDue = false;
            let multiplier = 1;

            if (goal.frequency === 'daily') {
              const diffTime = Math.abs(today.getTime() - lastDate.getTime());
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays >= 1) {
                isDue = true;
                multiplier = diffDays;
              }
            } else {
              const isSameMonth = lastDate.getMonth() === today.getMonth() && lastDate.getFullYear() === today.getFullYear();
              if (!isSameMonth) {
                isDue = true;
              }
            }

            if (isDue && Number(goal.monthly_amount) > 0) {
              const singleDeduction = Number(goal.monthly_amount);
              const totalRequired = singleDeduction * multiplier;
              const actualDeduction = Math.min(totalRequired, cashToAddToLiquid);
              
              if (actualDeduction > 0) {
                const newSaved = Number(goal.saved_amount) + actualDeduction;
                await supabase
                  .from('savings_goals')
                  .update({
                    saved_amount: newSaved,
                    last_deduction_date: today.toISOString(),
                    status: newSaved >= Number(goal.target_amount) ? 'completed' : 'active'
                  })
                  .eq('id', goal.id);

                cashToAddToLiquid -= actualDeduction;
                totalDiverted += actualDeduction;
              }
            }
          }
        }

        if (totalDiverted > 0) {
          setDeductionNotice(`${totalDiverted.toLocaleString()} DA diverted to your Vault goals.`);
          await new Promise(r => setTimeout(r, 1200));
        }

        await updateLiquidCash(user.id, cashToAddToLiquid);
        await supabase
          .from('incomes')
          .insert({ 
            user_id: user.id, 
            amount: amt, 
            source: formData.source, 
            date: formData.date,
            created_at: new Date().toISOString()
          });

      } 
      else if (type === 'expense') {
        const amt = parseFloat(formData.amount);
        await updateLiquidCash(user.id, -amt);
        await supabase
          .from('expenses')
          .insert({ 
            user_id: user.id, 
            title: formData.title, 
            amount: amt, 
            category: formData.category, 
            date: formData.date,
            created_at: new Date().toISOString()
          });
      } 
      else if (type === 'cash') {
        const amt = parseFloat(formData.amount);
        const { data: existing } = await supabase
          .from('cash')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('cash')
            .update({ 
              amount: amt, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('cash')
            .insert({ 
              user_id: user.id, 
              amount: amt,
              updated_at: new Date().toISOString()
            });
        }
      } 
      else if (type === 'debt') {
        const amt = parseFloat(formData.amount);
        let pId = formData.person_id;
        
        if (!pId && personSearch) {
          const { data: newPerson } = await supabase
            .from('people')
            .insert({ 
              user_id: user.id, 
              name: personSearch,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          pId = newPerson?.id;
        } else if (!pId) {
          throw new Error("Counterparty required.");
        }

        const adjustment = formData.debt_type === 'owe_me' ? -amt : amt;
        await updateLiquidCash(user.id, adjustment);
        await supabase
          .from('debts')
          .insert({ 
            user_id: user.id, 
            person_id: pId, 
            amount: amt, 
            type: formData.debt_type, 
            date: formData.date,
            created_at: new Date().toISOString()
          });
      }
      else if (type === 'savings_goal') {
        await supabase
          .from('savings_goals')
          .insert({
            user_id: user.id,
            name: formData.goal_name,
            target_amount: parseFloat(formData.target_amount),
            monthly_amount: parseFloat(formData.recurring_amount),
            frequency: formData.frequency,
            saved_amount: 0,
            status: 'active',
            start_date: new Date().toISOString(),
            last_deduction_date: null,
            created_at: new Date().toISOString()
          });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Drahmi Error:", err);
      alert("Command Failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="w-full max-w-xl glass rounded-[40px] p-8 shadow-2xl relative z-10 animate-fade-in border-white/10 overflow-hidden">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white capitalize">{type.replace('_', ' ')}</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Wealth Command</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass rounded-full text-slate-500 hover:text-white flex items-center justify-center interactive-active">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {deductionNotice && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-fade-in text-center">
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">✨ Auto-Vault Active</p>
            <p className="text-white text-xs font-bold mt-1">{deductionNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {type === 'savings_goal' ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Asset Name</label>
                <input required type="text" placeholder="e.g. Emergency Fund" className="w-full h-14 glass rounded-2xl px-5 text-white outline-none focus:border-blue-500/50" value={formData.goal_name} onChange={e => setFormData({...formData, goal_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Final Target (DA)</label>
                  <input required type="number" placeholder="Sum" className="w-full h-14 glass rounded-2xl px-5 text-white outline-none" value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Frequency</label>
                  <select className="w-full h-14 glass rounded-2xl px-5 text-white outline-none bg-slate-900" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
                    <option value="daily">Daily Saving</option>
                    <option value="monthly">Monthly Saving</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Recurring Amt (DA)</label>
                <input required type="number" placeholder="Amount per cycle" className="w-full h-14 glass rounded-2xl px-5 text-white outline-none" value={formData.recurring_amount} onChange={e => setFormData({...formData, recurring_amount: e.target.value})} />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-center py-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">DA VOLUME</label>
                <input required type="number" step="0.01" placeholder="0.00" className="w-full h-20 bg-transparent border-none text-center text-6xl font-black text-white outline-none placeholder:text-slate-900 tracking-tighter" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {type === 'income' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Capital Source</label>
                    <input required type="text" placeholder="Salary, Side-hustle..." className="w-full h-14 glass rounded-2xl px-5 text-white outline-none" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
                  </div>
                )}
                {type === 'expense' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Item</label>
                      <input required type="text" placeholder="Description" className="w-full h-14 glass rounded-2xl px-5 text-white outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sector</label>
                      <select className="w-full h-14 glass rounded-2xl px-5 text-white outline-none bg-slate-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option>Lifestyle</option><option>Vitals</option><option>Fixed Assets</option><option>Misc</option>
                      </select>
                    </div>
                  </div>
                )}
                {type === 'debt' && (
                  <div className="space-y-4">
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Counterparty</label>
                      <input 
                        required type="text" placeholder="Name" 
                        className="w-full h-14 glass rounded-2xl px-5 text-white outline-none" 
                        value={personSearch} 
                        onChange={e => {
                          setPersonSearch(e.target.value);
                          setFormData({...formData, person_id: ''});
                        }} 
                      />
                      {personSearch && formData.person_id === '' && filteredPeople.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-50 shadow-2xl border border-white/10 max-h-40 overflow-y-auto">
                          {filteredPeople.map(p => (
                            <button 
                              key={p.id} type="button" 
                              onClick={() => {
                                setPersonSearch(p.name);
                                setFormData({...formData, person_id: p.id});
                              }}
                              className="w-full text-left px-5 py-4 hover:bg-white/10 text-sm font-bold border-b border-white/5 last:border-0 text-white"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setFormData({...formData, debt_type: 'owe_me'})} className={`h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.debt_type === 'owe_me' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'glass text-slate-500'}`}>Lent</button>
                      <button type="button" onClick={() => setFormData({...formData, debt_type: 'i_owe'})} className={`h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.debt_type === 'i_owe' ? 'bg-rose-600 text-white shadow-xl shadow-rose-500/20' : 'glass text-slate-500'}`}>Borrowed</button>
                    </div>
                  </div>
                )}
                {type !== 'cash' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Log Date</label>
                    <input required type="date" className="w-full h-14 glass rounded-2xl px-5 text-white outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full h-16 bg-white text-slate-950 font-black text-sm rounded-2xl shadow-2xl hover:bg-slate-200 disabled:opacity-50 uppercase tracking-[0.2em] transition-all interactive-active">
              {loading ? 'Executing...' : 'Confirm Entry'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Modal;
