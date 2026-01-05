import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Person } from '../types';

interface ModalProps {
  type: 'income' | 'expense' | 'debt' | 'cash';
  people: Person[];
  onClose: () => void;
  onSuccess: () => void;
}

const Modal: React.FC<ModalProps> = ({ type, people, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    title: '',
    category: 'Vitals',
    date: new Date().toISOString().split('T')[0],
    person_name: '',
    person_id: '',
    debt_type: 'owe_me' as 'owe_me' | 'i_owe'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amt = parseFloat(formData.amount);
      if (isNaN(amt)) return;

      if (type === 'income') {
        await supabase.from('incomes').insert([{ user_id: user.id, amount: amt, source: formData.source, date: formData.date }]);
      } else if (type === 'expense') {
        await supabase.from('expenses').insert([{ user_id: user.id, title: formData.title, amount: amt, category: formData.category, date: formData.date }]);
      } else if (type === 'cash') {
        const { data: existing } = await supabase.from('cash').select('*').single();
        if (existing) {
          await supabase.from('cash').update({ amount: amt, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('cash').insert([{ user_id: user.id, amount: amt }]);
        }
      } else if (type === 'debt') {
        let pId = formData.person_id;
        if (!pId && formData.person_name) {
          const { data: newPerson } = await supabase.from('people').insert([{ user_id: user.id, name: formData.person_name }]).select().single();
          pId = newPerson?.id;
        }
        if (pId) {
          await supabase.from('debts').insert([{ user_id: user.id, person_id: pId, amount: amt, type: formData.debt_type, date: formData.date }]);
        }
      }
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="w-full max-w-xl premium-card rounded-[48px] p-12 shadow-2xl relative z-10 animate-modal">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tighter text-white capitalize">{type} Specification</h2>
            <p className="text-slate-500 text-sm mt-1">Registering value to the unified ledger.</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 glass rounded-2xl text-slate-500 hover:text-white transition-colors flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Quantum (DA)</label>
            <input 
              required type="number" step="0.01" placeholder="0.00"
              className="w-full h-24 glass border-white/10 rounded-[32px] px-10 text-5xl font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-800 tracking-tighter"
              value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {type === 'income' && (
              <div className="space-y-3 col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Asset Source</label>
                <input required type="text" placeholder="Consulting, Equity, etc." className="w-full h-16 glass rounded-2xl px-6 text-white outline-none border-white/5" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
              </div>
            )}

            {type === 'expense' && (
              <>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Capital Destination</label>
                  <input required type="text" placeholder="Vendor or Service" className="w-full h-16 glass rounded-2xl px-6 text-white outline-none border-white/5" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fiscal Category</label>
                  <select className="w-full h-16 glass rounded-2xl px-6 text-white outline-none border-white/5 appearance-none bg-slate-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Lifestyle</option><option>Vitals</option><option>Fixed Assets</option><option>Infrastructure</option><option>Misc</option>
                  </select>
                </div>
              </>
            )}

            {type === 'debt' && (
              <>
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Legal Name</label>
                  <input required type="text" placeholder="Individual or Institution" className="w-full h-16 glass rounded-2xl px-6 text-white outline-none border-white/5" value={formData.person_name} onChange={e => setFormData({...formData, person_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <button type="button" onClick={() => setFormData({...formData, debt_type: 'owe_me'})} className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${formData.debt_type === 'owe_me' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'glass text-slate-500 border-white/10'}`}>Credit Extended</button>
                  <button type="button" onClick={() => setFormData({...formData, debt_type: 'i_owe'})} className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${formData.debt_type === 'i_owe' ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'glass text-slate-500 border-white/10'}`}>Liability Incurred</button>
                </div>
              </>
            )}

            {type !== 'cash' && (
              <div className="space-y-3 col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Effective Date</label>
                <input required type="date" className="w-full h-16 glass rounded-2xl px-6 text-white outline-none border-white/5" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
            )}
          </div>

          <div className="pt-8">
            <button 
              type="submit" disabled={loading}
              className="w-full h-20 bg-white text-slate-950 font-black text-xl rounded-[32px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? 'Processing...' : 'Authorize Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;