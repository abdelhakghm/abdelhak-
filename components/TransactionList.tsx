
import React, { useState } from 'react';
import { Income, Expense } from '../types';
import { supabase } from '../lib/supabase';

interface TransactionListProps {
  title: string;
  incomes: Income[];
  expenses: Expense[];
  onRefresh: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ title, incomes, expenses, onRefresh }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const merged = [
    ...incomes.map(i => ({ ...i, type: 'income' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const, source: e.title })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = async (id: string, type: 'income' | 'expense') => {
    if (!window.confirm('Erase this record from history?')) return;
    
    setDeletingId(id);
    const table = type === 'income' ? 'incomes' : 'expenses';
    
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="premium-card overflow-hidden shadow-xl">
      {title && (
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h2>
          <span className="text-[9px] bg-blue-500/10 text-blue-400 font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
            {merged.length}
          </span>
        </div>
      )}
      
      <div className="divide-y divide-white/5">
        {merged.length === 0 ? (
          <div className="text-center py-12 opacity-30">
            <p className="text-slate-400 text-xs font-medium italic">Empty ledger.</p>
          </div>
        ) : (
          merged.map((tx) => (
            <div 
              key={`${tx.type}-${tx.id}`} 
              className={`flex items-center justify-between p-4 transition-all duration-300 ${deletingId === tx.id ? 'opacity-30 scale-95' : 'opacity-100'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                  tx.type === 'income' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {tx.type === 'income' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-xs truncate">
                    {tx.source}
                  </h3>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                    {tx.type === 'expense' ? (tx as any).category : 'Deposit'} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-xs font-black tracking-tight ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                  </p>
                </div>
                <button 
                  disabled={!!deletingId}
                  onClick={() => handleDelete(tx.id, tx.type)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 disabled:opacity-50"
                >
                  {deletingId === tx.id ? (
                    <div className="w-3 h-3 border-2 border-rose-500 border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;
