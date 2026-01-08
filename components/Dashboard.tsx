import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { CashRecord, Income, Expense, Debt, Person, DashboardStats, SavingsGoal } from '../types';
import TransactionList from './TransactionList';
import Modal from './Modal';

// Icons - iOS 26 Design System (Bold 2.5pt stroke)
const Icons = {
  Home: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10Z" />
    </svg>
  ),
  History: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7V12L15 15" />
      <path d="M12 3C7.02944 3 3 7.02944 3 12C3 12.3411 3.01897 12.6778 3.05609 13" />
    </svg>
  ),
  Savings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12H7" />
      <path d="M17 12H21" />
    </svg>
  ),
  Vault: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 8V10" />
      <path d="M12 14V16" />
    </svg>
  ),
  Profile: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
};

// IndexedDB Persistence Logic
const DB_NAME = 'DrahmiCache';
const STORE_NAME = 'lastState';

const saveToLocal = (data: any) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, 'dashboard');
  };
};

const getLocal = (): Promise<any> => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const getReq = tx.objectStore(STORE_NAME).get('dashboard');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
};

interface DashboardProps {
  user: User;
}

type View = 'home' | 'history' | 'debts' | 'savings' | 'settings';

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeView, setActiveView] = useState<View>('home');
  const [stats, setStats] = useState<DashboardStats>({
    totalCash: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalOwedToMe: 0,
    totalIOwe: 0,
    netBalance: 0,
    totalSavings: 0,
  });
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'income' | 'expense' | 'debt' | 'cash' | 'savings_goal' | null>(null);

  useEffect(() => {
    getLocal().then(cached => {
      if (cached) {
        setStats(cached.stats);
        setIncomes(cached.incomes);
        setExpenses(cached.expenses);
        setDebts(cached.debts);
        setGoals(cached.goals || []);
        setPeople(cached.people);
        setLoading(false);
      }
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [
        { data: cashData },
        { data: incomeData },
        { data: expenseData },
        { data: debtData },
        { data: peopleData },
        { data: goalData }
      ] = await Promise.all([
        supabase.from('cash').select('*').single(),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*, people(*)').order('date', { ascending: false }),
        supabase.from('people').select('*'),
        supabase.from('savings_goals').select('*').order('created_at', { ascending: false })
      ]);

      const totalCash = (cashData as CashRecord)?.amount || 0;
      const totalIncome = (incomeData as Income[])?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalExpenses = (expenseData as Expense[])?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalOwedToMe = (debtData as Debt[])?.filter(d => d.type === 'owe_me').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalIOwe = (debtData as Debt[])?.filter(d => d.type === 'i_owe').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalSavings = (goalData as SavingsGoal[])?.reduce((acc, curr) => acc + Number(curr.saved_amount), 0) || 0;

      const newStats = {
        totalCash,
        totalIncome,
        totalExpenses,
        totalOwedToMe,
        totalIOwe,
        totalSavings,
        netBalance: totalCash + totalOwedToMe - totalIOwe + totalSavings,
      };

      setStats(newStats);
      setIncomes(incomeData || []);
      setExpenses(expenseData || []);
      setDebts(debtData || []);
      setPeople(peopleData || []);
      setGoals(goalData || []);

      saveToLocal({
        stats: newStats,
        incomes: incomeData || [],
        expenses: expenseData || [],
        debts: debtData || [],
        people: peopleData || [],
        goals: goalData || []
      });

    } catch (err) {
      console.warn("Sync failed. Operating in offline mode.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const SideNavItem = ({ view, label, icon: Icon }: { view: View, label: string, icon: any }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 rounded-2xl mb-2 interactive-active ${
        activeView === view ? 'bg-blue-600/10 text-blue-500 font-bold shadow-lg shadow-blue-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      <Icon />
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );

  const TabItem = ({ view, label, icon: Icon }: { view: View, label: string, icon: any }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 interactive-active ${
        activeView === view ? 'text-blue-500' : 'text-slate-500'
      }`}
      style={{ height: '64px' }}
    >
      <div className={`transition-transform duration-300 ${activeView === view ? 'scale-110' : 'scale-100'}`}>
        <Icon />
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <aside className="w-72 glass border-r border-white/5 fixed inset-y-0 left-0 hidden xl:flex flex-col p-8 z-50">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-[30%] bg-blue-600 flex items-center justify-center text-xl font-black text-white shadow-xl shadow-blue-500/20">D</div>
          <h1 className="text-2xl font-extrabold tracking-tighter">Drahmi</h1>
        </div>
        
        <nav className="flex-1">
          <SideNavItem view="home" label="Dashboard" icon={Icons.Home} />
          <SideNavItem view="history" label="Activity" icon={Icons.History} />
          <SideNavItem view="savings" label="Savings" icon={Icons.Savings} />
          <SideNavItem view="debts" label="Vault" icon={Icons.Vault} />
          <SideNavItem view="settings" label="Account" icon={Icons.Profile} />
        </nav>
      </aside>

      <main className="flex-1 xl:ml-72 px-4 md:px-12 lg:px-20 pt-8 pb-32 safe-area-pt">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-1">Drahmi</h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Wealth Command</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <button onClick={() => setActiveModal('income')} className="h-14 px-5 glass rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2 interactive-active">
              <Icons.Plus /> Inflow
            </button>
            <button onClick={() => setActiveModal('expense')} className="h-14 px-5 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg interactive-active">
              Outflow
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-10">
          {activeView === 'home' && (
            <>
              <div className="premium-card p-8 md:p-10 relative overflow-hidden flex flex-col shadow-2xl">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Asset Portfolio</p>
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter mb-10 break-all leading-none">
                  <span className="text-blue-500 mr-2 text-2xl font-bold">DA</span>
                  {stats.netBalance.toLocaleString()}
                </h3>
                <div className="grid grid-cols-3 gap-6 border-t border-white/5 pt-8 mt-auto">
                  <div className="flex flex-col">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Liquid</p>
                    <p className="text-xl font-bold text-white">{stats.totalCash.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Vault</p>
                    <p className="text-xl font-bold text-emerald-400">{stats.totalSavings.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col text-right">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Credit</p>
                    <p className={`text-xl font-bold ${(stats.totalOwedToMe - stats.totalIOwe) >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {(stats.totalOwedToMe - stats.totalIOwe).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {goals.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Goals</h4>
                    <button onClick={() => setActiveView('savings')} className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Vault Access</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goals.filter(g => g.status === 'active').slice(0, 2).map(goal => {
                      const progress = Math.min((goal.saved_amount / goal.target_amount) * 100, 100);
                      return (
                        <div key={goal.id} className="premium-card p-6 border-emerald-500/10">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-base text-white">{goal.name}</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2.5 rounded-full mb-4 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${progress}%` }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Target: {goal.target_amount.toLocaleString()} DA</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Global Ledger</h4>
                </div>
                <TransactionList title="" incomes={incomes.slice(0, 3)} expenses={expenses.slice(0, 3)} onRefresh={fetchData} />
              </div>
            </>
          )}

          {activeView === 'savings' && (
            <div className="space-y-10 animate-fade-up">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white tracking-tighter">Savings Vault</h2>
                <button onClick={() => setActiveModal('savings_goal')} className="h-12 px-6 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 interactive-active">Init Goal</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {goals.map(goal => {
                  const progress = Math.min((goal.saved_amount / goal.target_amount) * 100, 100);
                  const remaining = goal.target_amount - goal.saved_amount;
                  const estMonths = goal.monthly_amount > 0 ? Math.ceil(remaining / goal.monthly_amount) : '∞';
                  
                  return (
                    <div key={goal.id} className={`premium-card p-8 flex flex-col relative overflow-hidden transition-all duration-500 ${goal.status === 'completed' ? 'border-emerald-500/50 scale-[1.02]' : ''}`}>
                      {goal.status === 'completed' && (
                         <div className="absolute top-6 right-6 bg-emerald-500 text-slate-950 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">COMPLETED</div>
                      )}
                      
                      <div className="mb-8">
                        <h4 className="text-2xl font-black text-white mb-2">{goal.name}</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Auto-Deduct: {goal.monthly_amount.toLocaleString()} DA / MO</p>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 mb-4">
                         <span className="text-4xl font-black text-white tracking-tighter">{goal.saved_amount.toLocaleString()}</span>
                         <span className="text-slate-500 text-sm font-bold">/ {goal.target_amount.toLocaleString()} DA</span>
                      </div>

                      <div className="w-full bg-white/5 h-5 rounded-full mb-8 overflow-hidden p-1">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.4)]" style={{ width: `${progress}%` }}></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-auto pt-8 border-t border-white/5">
                        <div className="flex flex-col">
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Maturity</p>
                           <p className="text-sm font-bold text-slate-100">{goal.status === 'completed' ? 'Realized' : `~ ${estMonths} Months`}</p>
                        </div>
                        <div className="flex flex-col text-right">
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Status</p>
                           <p className={`text-sm font-bold uppercase tracking-widest ${goal.status === 'active' ? 'text-blue-500' : 'text-emerald-500'}`}>{goal.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {goals.length === 0 && (
                <div className="text-center py-28 glass rounded-[40px] border-dashed border-2 border-white/5">
                  <div className="w-20 h-20 bg-white/5 rounded-[30%] flex items-center justify-center mx-auto mb-6 opacity-30">
                    <Icons.Savings />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Awaiting Goal Definitions</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'history' && <TransactionList title="Temporal Activity" incomes={incomes} expenses={expenses} onRefresh={fetchData} />}
          {activeView === 'debts' && (
            <div className="space-y-8 animate-fade-up">
               <div className="premium-card p-8">
                  <h2 className="text-xl font-black mb-8 tracking-tighter text-emerald-400 uppercase tracking-widest">Receivables</h2>
                  <div className="space-y-4">
                    {debts.filter(d => d.type === 'owe_me').length === 0 ? <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest text-center py-8">Zero exposure.</p> :
                      debts.filter(d => d.type === 'owe_me').map(debt => (
                        <div key={debt.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                          <span className="font-bold text-sm text-white">{debt.person?.name}</span>
                          <span className="text-emerald-400 font-black text-sm tracking-tight">+{debt.amount.toLocaleString()}</span>
                        </div>
                      ))
                    }
                  </div>
               </div>
               <div className="premium-card p-8">
                  <h2 className="text-xl font-black mb-8 tracking-tighter text-rose-400 uppercase tracking-widest">Liabilities</h2>
                  <div className="space-y-4">
                    {debts.filter(d => d.type === 'i_owe').length === 0 ? <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest text-center py-8">No obligations.</p> :
                      debts.filter(d => d.type === 'i_owe').map(debt => (
                        <div key={debt.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                          <span className="font-bold text-sm text-white">{debt.person?.name}</span>
                          <span className="text-rose-400 font-black text-sm tracking-tight">-{debt.amount.toLocaleString()}</span>
                        </div>
                      ))
                    }
                  </div>
               </div>
               <button onClick={() => setActiveModal('debt')} className="w-full h-16 bg-blue-600 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] text-white shadow-xl shadow-blue-500/20 interactive-active">Register Instrument</button>
            </div>
          )}
          {activeView === 'settings' && (
            <div className="max-w-xl mx-auto animate-fade-up">
               <div className="premium-card p-10 text-center flex flex-col items-center shadow-2xl">
                  <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[35%] flex items-center justify-center text-4xl font-black mb-8 rotate-3 shadow-2xl">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-3xl font-black mb-1 tracking-tighter">{user.email?.split('@')[0]}</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-12">{user.email}</p>
                  <button onClick={() => supabase.auth.signOut()} className="w-full h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] interactive-active">Terminate Session</button>
               </div>
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 xl:hidden glass border-t border-white/5 z-[60] pb-safe flex px-3 bg-[#020617]/90">
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

export default Dashboard;
