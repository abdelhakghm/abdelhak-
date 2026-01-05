
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
    category: 'General',
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

      if (type === 'income') {
        await supabase.from('incomes').insert([{
          user_id: user.id,
          amount: parseFloat(formData.amount),
          source: formData.source,
          date: formData.date
        }]);
      } else if (type === 'expense') {
        await supabase.from('expenses').insert([{
          user_id: user.id,
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category,
          date: formData.date
        }]);
      } else if (type === 'cash') {
        const { data: existing } = await supabase.from('cash').select('*').single();
        if (existing) {
          await supabase.from('cash').update({ 
            amount: parseFloat(formData.amount),
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
        } else {
          await supabase.from('cash').insert([{ 
            user_id: user.id, 
            amount: parseFloat(formData.amount) 
          }]);
        }
      } else if (type === 'debt') {
        let pId = formData.person_id;
        if (!pId && formData.person_name) {
          const { data: newPerson } = await supabase.from('people').insert([{
            user_id: user.id,
            name: formData.person_name
          }]).select().single();
          pId = newPerson?.id;
        }

        if (pId) {
          await supabase.from('debts').insert([{
            user_id: user.id,
            person_id: pId,
            amount: parseFloat(formData.amount),
            type: formData.debt_type,
            date: formData.date
          }]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold capitalize text-white">Add {type}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Amount (DA)</label>
            <input 
              required type="number" step="0.01"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
            />
          </div>

          {type === 'income' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Source</label>
              <input 
                required type="text" placeholder="Salary, Gift, etc."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
              />
            </div>
          )}

          {type === 'expense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                <input 
                  required type="text" placeholder="Rent, Coffee, etc."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option>General</option>
                  <option>Food</option>
                  <option>Rent</option>
                  <option>Leisure</option>
                  <option>Tech</option>
                  <option>Health</option>
                </select>
              </div>
            </>
          )}

          {type === 'debt' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Person Name</label>
                {people.length > 0 ? (
                   <select 
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                   value={formData.person_id}
                   onChange={e => setFormData({...formData, person_id: e.target.value, person_name: ''})}
                 >
                   <option value="">-- New Person --</option>
                   {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
                ) : null}
                {!formData.person_id && (
                  <input 
                    required type="text" placeholder="Enter name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.person_name}
                    onChange={e => setFormData({...formData, person_name: e.target.value})}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, debt_type: 'owe_me'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.debt_type === 'owe_me' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-slate-700 text-slate-500'}`}
                  >
                    Owes Me
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, debt_type: 'i_owe'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.debt_type === 'i_owe' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'border-slate-700 text-slate-500'}`}
                  >
                    I Owe
                  </button>
                </div>
              </div>
            </>
          )}

          {type !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
              <input 
                required type="date"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
