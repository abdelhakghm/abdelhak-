import React from 'react';
import { Income, Expense } from '../types';

interface TransactionListProps {
  title: string;
  incomes: Income[];
  expenses: Expense[];
  onRefresh: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ title, incomes, expenses }) => {
  const merged = [
    ...incomes.map(i => ({ ...i, type: 'income' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const, source: e.title })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="premium-card overflow-hidden shadow-xl">
      {title && (
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          <span className="text-[9px] bg-blue-500/10 text-blue-400 font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {merged.length} Events
          </span>
        </div>
      )}
      
      <div className="divide-y divide-white/5">
        {merged.length === 0 ? (
          <div className="text-center py-16 opacity-30">
            <p className="text-slate-400 text-sm font-medium italic">Empty vault.</p>
          </div>
        ) : (
          merged.map((tx, idx) => (
            <div 
              key={tx.id} 
              className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group interactive-active"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                  tx.type === 'income' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {tx.type === 'income' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-sm tracking-tight truncate pr-2">
                    {tx.source}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] mt-1">
                    {tx.type === 'expense' ? (tx as any).category : 'Deposit'} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-black tracking-tight ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                </p>
                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">DA</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;