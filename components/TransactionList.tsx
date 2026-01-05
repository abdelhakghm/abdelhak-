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
    <div className="glass-card p-8 rounded-[32px] border-slate-800/40">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        <span className="text-[10px] bg-slate-800 text-slate-500 font-bold px-3 py-1 rounded-full uppercase tracking-widest">
          {merged.length} Logs
        </span>
      </div>
      
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3 custom-scroll">
        {merged.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/10 rounded-3xl border border-dashed border-slate-800/30">
            <p className="text-slate-600 text-sm italic">No history found for this period.</p>
          </div>
        ) : (
          merged.map((tx) => (
            <div 
              key={tx.id} 
              className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/20 border border-slate-800/60 hover:border-blue-500/20 hover:bg-slate-950/50 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  tx.type === 'income' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {tx.type === 'income' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors">
                    {tx.source}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {tx.type === 'expense' ? (tx as any).category : 'Inflow'} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                </p>
                <p className="text-[8px] text-slate-600 uppercase tracking-widest font-bold">DA</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;