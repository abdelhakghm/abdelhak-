
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Income, Expense, Debt, Person, DashboardStats, SavingsGoal } from '../types';
import TransactionList from './TransactionList';
import Modal from './Modal';

const Icons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10Z" />
    </svg>
  ),
  History: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7V12L15 15" />
    </svg>
  ),
  Savings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  Vault: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  ),
  Profile: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  Reset: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [activeView, setActiveView] = useState<View>('home');
  const [stats, setStats] = useState<DashboardStats>({
    totalCash: 0, totalIncome: 0, totalExpenses: 0, totalOwedToMe: 0, totalIOwe: 0, netBalance: 0, totalSavings: 0,
  });
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'income' | 'expense' | 'debt' | 'cash' | 'savings_goal' | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: cash }, { data: inc }, { data: exp }, { data: dbt }, { data: ppl }, { data: gls }] = await Promise.all([
        supabase.from('cash').select('*').maybeSingle(),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*, people(*)').order('date', { ascending: false }),
        supabase.from('people').select('*'),
        supabase.from('savings_goals').select('*').order('created_at', { ascending: false })
      ]);

      // If no cash record exists yet, create one
      if (!cash && !loading) {
        const { data: newCash } = await supabase.from('cash').insert([{ user_id: user.id, amount: 0 }]).select().single();
        if (newCash) setStats(prev => ({ ...prev, totalCash: 0 }));
      }

      const totalCash = cash?.amount ? Number(cash.amount) : 0;
      const totalIncome = inc?.reduce((a, b) => a + Number(b.amount), 0) || 0;
      const totalExpenses = exp?.reduce((a, b) => a + Number(b.amount), 0) || 0;
      const totalOwedToMe = dbt?.filter(d => d.type === 'owe_me').reduce((a, b) => a + Number(b.amount), 0) || 0;
      const totalIOwe = dbt?.filter(d => d.type === 'i_owe').reduce((a, b) => a + Number(b.amount), 0) || 0;
      const totalSavings = gls?.reduce((a, b) => a + Number(b.saved_amount), 0) || 0;

      setStats({
        totalCash, totalIncome, totalExpenses, totalOwedToMe, totalIOwe, totalSavings,
        netBalance: totalCash + totalOwedToMe - totalIOwe + totalSavings,
      });
      setIncomes(inc || []); setExpenses(exp || []); setDebts(dbt || []); setPeople(ppl || []); setGoals(gls || []);
    } catch (e) { 
      console.warn("Drahmi fetch error:", e); 
    } finally { 
      setLoading(false); 
    }
  }, [user.id]); // Removed 'loading' from dependencies to avoid potential loop

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetCash = async () => {
    if (!window.confirm('Reset liquid cash to 0.00 DA?')) return;
    try {
      const { error } = await supabase.from('cash').update({ amount: 0 }).eq('user_id', user.id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!window.confirm('Dissolve this savings goal? Funds already saved are calculated in your net worth.')) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchData();
  };

  const deleteDebt = async (id: string) => {
    if (!window.confirm('Clear this debt record?')) return;
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchData();
  };

  const TabItem = ({ view, label, icon: Icon }: { view: View, label: string, icon: any }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 interactive-active ${
        activeView === view ? 'text-blue-500' : 'text-slate-500'
      }`}
    >
      <Icon />
      <span className="text-[8px] font-black uppercase tracking-[0.1em]">{label}</span>
    </button>
  );

  if (loading && incomes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-container px-5 pt-8">
        <header className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-white">Drahmi</h1>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveModal('income')} className="h-11 glass rounded-2xl text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-2 interactive-active">
              <Icons.Plus /> Inflow
            </button>
            <button onClick={() => setActiveModal('expense')} className="h-11 bg-white text-slate-950 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center interactive-active">
              Outflow
            </button>
          </div>
        </header>

        {activeView === 'home' && (
          <div className="space-y-6 animate-fade-in">
            <div className="premium-card p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Net Capital</p>
                <button onClick={() => setActiveModal('cash')} className="text-blue-500 text-[8px] font-black uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-lg">Update</button>
              </div>
              <h3 className="text-3xl font-black tracking-tighter text-white mb-6">
                <span className="text-blue-500 text-lg mr-1">DA</span>
                {stats.netBalance.toLocaleString()}
              </h3>
              <div className="flex justify-between border-t border-white/5 pt-4">
                <div className="flex flex-col group relative" onClick={resetCash}>
                  <span className="text-[8px] text-slate-500 font-bold uppercase flex items-center gap-1 cursor-pointer">Liquid <Icons.Reset /></span>
                  <span className="text-sm font-bold">{stats.totalCash.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Vaulted</span>
                  <span className="text-sm font-bold text-emerald-400">{stats.totalSavings.toLocaleString()}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Lent</span>
                  <span className="text-sm font-bold text-blue-400">{stats.totalOwedToMe.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {goals.some(g => g.status === 'active') && (
              <div className="space-y-3">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Objectives</h4>
                {goals.filter(g => g.status === 'active').slice(0, 2).map(goal => (
                  <div key={goal.id} className="premium-card p-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-white truncate max-w-[150px]">{goal.name}</span>
                      <span className="text-emerald-400">
                        {((Number(goal.saved_amount) / Number(goal.target_amount)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (Number(goal.saved_amount) / Number(goal.target_amount)) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <TransactionList title="Recent Flux" incomes={incomes.slice(0, 5)} expenses={expenses.slice(0, 5)} onRefresh={fetchData} />
          </div>
        )}

        {activeView === 'history' && (
          <div className="animate-fade-in">
            <TransactionList title="Master Ledger" incomes={incomes} expenses={expenses} onRefresh={fetchData} />
          </div>
        )}
        
        {activeView === 'savings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black text-white">The Vault</h2>
              <button onClick={() => setActiveModal('savings_goal')} className="h-8 px-4 bg-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white interactive-active">New Goal</button>
            </div>
            {goals.length === 0 ? (
              <div className="text-center py-20 opacity-20 italic text-sm">No active objectives.</div>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className="premium-card p-5 space-y-4 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-lg">{goal.name}</h4>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Goal: {Number(goal.target_amount).toLocaleString()} DA</p>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center interactive-active">
                      <Icons.Trash />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black">{Number(goal.saved_amount).toLocaleString()}</span>
                    <span className="text-slate-500 text-xs font-bold">DA</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (Number(goal.saved_amount)/Number(goal.target_amount))*100)}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeView === 'debts' && (
          <div className="space-y-6 animate-fade-in">
             <div className="premium-card p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">Receivables</h3>
                <div className="space-y-2">
                  {debts.filter(d => d.type === 'owe_me').length === 0 && <p className="text-[10px] text-slate-700 italic">No outstanding credit.</p>}
                  {debts.filter(d => d.type === 'owe_me').map(d => (
                    <div key={d.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="min-w-0">
                        <span className="font-bold text-sm block truncate text-white">{d.person?.name}</span>
                        <span className="text-[8px] text-slate-500 uppercase">{new Date(d.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold text-sm">+{Number(d.amount).toLocaleString()}</span>
                        <button onClick={() => deleteDebt(d.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             <div className="premium-card p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-4">Payables</h3>
                <div className="space-y-2">
                  {debts.filter(d => d.type === 'i_owe').length === 0 && <p className="text-[10px] text-slate-700 italic">No outstanding debt.</p>}
                  {debts.filter(d => d.type === 'i_owe').map(d => (
                    <div key={d.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="min-w-0">
                        <span className="font-bold text-sm block truncate text-white">{d.person?.name}</span>
                        <span className="text-[8px] text-slate-500 uppercase">{new Date(d.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-rose-400 font-bold text-sm">-{Number(d.amount).toLocaleString()}</span>
                        <button onClick={() => deleteDebt(d.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             <button onClick={() => setActiveModal('debt')} className="w-full h-12 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-[9px] text-white interactive-active">New Entry</button>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="animate-fade-in">
            <div className="premium-card p-8 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-2xl font-black mx-auto mb-4">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-black">{user.email?.split('@')[0]}</h3>
              <p className="text-slate-500 text-[10px] mb-8 uppercase tracking-widest">{user.email}</p>
              <div className="space-y-3">
                 <button onClick={() => supabase.auth.signOut()} className="w-full h-12 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest interactive-active">Logout</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 z-50 flex px-2 bg-slate-950/80" style={{ height: 'calc(64px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <TabItem view="home" label="Core" icon={Icons.Home} />
        <TabItem view="history" label="Ledger" icon={Icons.History} />
        <TabItem view="savings" label="Vault" icon={Icons.Savings} />
        <TabItem view="debts" label="Credit" icon={Icons.Vault} />
        <TabItem view="settings" label="Profile" icon={Icons.Profile} />
      </nav>

      {activeModal && <Modal type={activeModal} people={people} onClose={() => setActiveModal(null)} onSuccess={() => { setActiveModal(null); fetchData(); }} />}
    </div>
  );
};

type View = 'home' | 'history' | 'debts' | 'savings' | 'settings';
export default Dashboard;
