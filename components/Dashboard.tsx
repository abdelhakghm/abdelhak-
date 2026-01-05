import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { CashRecord, Income, Expense, Debt, Person, DashboardStats } from '../types';
import TransactionList from './TransactionList';
import Modal from './Modal';

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

type View = 'home' | 'history' | 'debts' | 'settings';

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeView, setActiveView] = useState<View>('home');
  const [stats, setStats] = useState<DashboardStats>({
    totalCash: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalOwedToMe: 0,
    totalIOwe: 0,
    netBalance: 0,
  });
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'income' | 'expense' | 'debt' | 'cash' | null>(null);

  // Load cache on mount
  useEffect(() => {
    getLocal().then(cached => {
      if (cached) {
        setStats(cached.stats);
        setIncomes(cached.incomes);
        setExpenses(cached.expenses);
        setDebts(cached.debts);
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
        { data: peopleData }
      ] = await Promise.all([
        supabase.from('cash').select('*').single(),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*, people(*)').order('date', { ascending: false }),
        supabase.from('people').select('*')
      ]);

      const totalCash = (cashData as CashRecord)?.amount || 0;
      const totalIncome = (incomeData as Income[])?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalExpenses = (expenseData as Expense[])?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalOwedToMe = (debtData as Debt[])?.filter(d => d.type === 'owe_me').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalIOwe = (debtData as Debt[])?.filter(d => d.type === 'i_owe').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      const newStats = {
        totalCash,
        totalIncome,
        totalExpenses,
        totalOwedToMe,
        totalIOwe,
        netBalance: totalCash + totalOwedToMe - totalIOwe,
      };

      const finalIncomes = incomeData || [];
      const finalExpenses = expenseData || [];
      const finalDebts = debtData || [];
      const finalPeople = peopleData || [];

      setStats(newStats);
      setIncomes(finalIncomes);
      setExpenses(finalExpenses);
      setDebts(finalDebts);
      setPeople(finalPeople);

      saveToLocal({
        stats: newStats,
        incomes: finalIncomes,
        expenses: finalExpenses,
        debts: finalDebts,
        people: finalPeople
      });

    } catch (err) {
      console.warn("Sync failed. Operating in offline mode.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const SideNavItem = ({ view, label, icon }: { view: View, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 rounded-xl mb-2 interactive-active ${
        activeView === view ? 'active-nav font-bold shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );

  const TabItem = ({ view, label, icon }: { view: View, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 interactive-active ${
        activeView === view ? 'text-blue-500' : 'text-slate-500'
      }`}
      style={{ height: '56px' }} // Thumb-friendly height
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* Sidebar Navigation (Desktop only) */}
      <aside className="w-72 glass border-r border-white/5 fixed inset-y-0 left-0 hidden xl:flex flex-col p-8 z-50">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-blue-500/20">D</div>
          <h1 className="text-2xl font-extrabold tracking-tighter">Drahmi</h1>
        </div>
        
        <nav className="flex-1">
          <SideNavItem view="home" label="Dashboard" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>} />
          <SideNavItem view="history" label="Activity" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <SideNavItem view="debts" label="Vault" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857"/></svg>} />
          <SideNavItem view="settings" label="Account" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
        </nav>

        <div className="pt-8 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">{user.email?.charAt(0).toUpperCase()}</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Pro Member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 xl:ml-72 px-4 md:px-12 lg:px-20 pt-8 pb-32 safe-area-pt">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-1">Drahmi</h2>
            <p className="text-slate-500 font-medium text-sm">Wealth Command Center</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <button 
              onClick={() => setActiveModal('cash')}
              className="h-12 px-4 glass rounded-xl text-xs font-bold border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2 interactive-active"
            >
              Set Reserve
            </button>
            <button 
              onClick={() => setActiveModal('expense')}
              className="h-12 px-4 bg-white text-slate-950 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all shadow-lg interactive-active"
            >
              Add Expense
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-10">
          {activeView === 'home' && (
            <>
              {/* Balance Card */}
              <div className="premium-card p-6 md:p-8 relative overflow-hidden flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Net Assets</p>
                  <div className="w-8 h-5 bg-white/10 rounded-md border border-white/5 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full blur-[2px] animate-pulse"></div>
                  </div>
                </div>
                
                <h3 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-8 break-all">
                  <span className="text-blue-500 mr-2 text-xl md:text-2xl font-medium">DA</span>
                  {stats.netBalance.toLocaleString()}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 mt-auto">
                  <div>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Liquid Reserve</p>
                    <p className="text-lg font-bold text-slate-100">{stats.totalCash.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Credit Delta</p>
                    <p className={`text-lg font-bold ${(stats.totalOwedToMe - stats.totalIOwe) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(stats.totalOwedToMe - stats.totalIOwe).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Decorative Orb */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none"></div>
              </div>

              {/* Fast Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setActiveModal('income')} className="premium-card p-5 border-emerald-500/10 bg-emerald-500/[0.03] interactive-active cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                  </div>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Inflow</p>
                  <p className="text-lg font-bold text-white">+{stats.totalIncome.toLocaleString()}</p>
                </div>
                <div onClick={() => setActiveModal('expense')} className="premium-card p-5 border-rose-500/10 bg-rose-500/[0.03] interactive-active cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg>
                  </div>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Outflow</p>
                  <p className="text-lg font-bold text-white">-{stats.totalExpenses.toLocaleString()}</p>
                </div>
              </div>

              {/* Recent Activity Mini-List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Activity</h4>
                   <button onClick={() => setActiveView('history')} className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">History</button>
                </div>
                <TransactionList title="" incomes={incomes.slice(0, 3)} expenses={expenses.slice(0, 3)} onRefresh={fetchData} />
              </div>
            </>
          )}

          {activeView === 'history' && (
            <div className="animate-fade-up">
               <TransactionList title="Transaction Ledger" incomes={incomes} expenses={expenses} onRefresh={fetchData} />
            </div>
          )}

          {activeView === 'debts' && (
            <div className="space-y-6 animate-fade-up">
               <div className="premium-card p-6">
                  <h2 className="text-xl font-bold mb-6 tracking-tight">Accounts Receivable</h2>
                  <div className="space-y-3">
                    {debts.filter(d => d.type === 'owe_me').length === 0 ? <p className="text-slate-600 text-xs italic py-4">No receivables.</p> :
                      debts.filter(d => d.type === 'owe_me').map(debt => (
                        <div key={debt.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <span className="font-bold text-sm">{debt.person?.name}</span>
                          <span className="text-emerald-400 font-bold text-sm">+{debt.amount.toLocaleString()}</span>
                        </div>
                      ))
                    }
                  </div>
               </div>
               <div className="premium-card p-6">
                  <h2 className="text-xl font-bold mb-6 tracking-tight">Accounts Payable</h2>
                  <div className="space-y-3">
                    {debts.filter(d => d.type === 'i_owe').length === 0 ? <p className="text-slate-600 text-xs italic py-4">No payables.</p> :
                      debts.filter(d => d.type === 'i_owe').map(debt => (
                        <div key={debt.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <span className="font-bold text-sm">{debt.person?.name}</span>
                          <span className="text-amber-400 font-bold text-sm">-{debt.amount.toLocaleString()}</span>
                        </div>
                      ))
                    }
                  </div>
               </div>
               <button onClick={() => setActiveModal('debt')} className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs text-white interactive-active">
                 Register Obligation
               </button>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-xl mx-auto animate-fade-up">
               <div className="premium-card p-8 text-center flex flex-col items-center shadow-xl">
                  <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg mb-8 rotate-3">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-bold mb-1 tracking-tight">{user.email?.split('@')[0]}</h3>
                  <p className="text-slate-500 text-sm mb-10">{user.email}</p>
                  
                  <div className="w-full space-y-3">
                    <button className="w-full h-12 glass rounded-xl text-xs font-black uppercase tracking-widest interactive-active">Settings</button>
                    <button onClick={() => supabase.auth.signOut()} className="w-full h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest interactive-active">Sign Out</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Native-Style Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 xl:hidden glass border-t border-white/5 z-[60] pb-safe flex px-2 bg-slate-950/80">
        <TabItem view="home" label="Home" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>} />
        <TabItem view="history" label="Activity" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <TabItem view="debts" label="Vault" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857"/></svg>} />
        <TabItem view="settings" label="Profile" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
      </nav>

      {activeModal && <Modal type={activeModal} people={people} onClose={() => setActiveModal(null)} onSuccess={() => { setActiveModal(null); fetchData(); }} />}
    </div>
  );
};

export default Dashboard;