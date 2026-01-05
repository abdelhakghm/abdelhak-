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
    <div className="glass rounded-[40px] p-8 border-white/5">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-2xl font-black text-white tracking-tighter">{title}</h2>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 font-black px-4 py-2 rounded-full uppercase tracking-widest border border-blue-500/10">
          {merged.length} Events
        </span>
      </div>
      
      <div className="space-y-4">
        {merged.length === 0 ? (
          <div className="text-center py-24 opacity-20">
            <p className="text-slate-400 font-medium italic">Empty vault.</p>
          </div>
        ) : (
          merged.map((tx, idx) => (
            <div 
              key={tx.id} 
              className="flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/5 active-bounce transition-all group animate-fade-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-transform group-active:scale-90 ${
                  tx.type === 'income' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {tx.type === 'income' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-black text-base tracking-tight truncate max-w-[140px]">
                    {tx.source}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5">
                    {tx.type === 'expense' ? (tx as any).category : 'Deposit'} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black tracking-tighter ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                </p>
                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-1">DA</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;