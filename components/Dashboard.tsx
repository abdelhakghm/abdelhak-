import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { CashRecord, Income, Expense, Debt, Person, DashboardStats } from '../types';
import TransactionList from './TransactionList';
import Modal from './Modal';

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
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

      setStats({
        totalCash,
        totalIncome,
        totalExpenses,
        totalOwedToMe,
        totalIOwe,
        netBalance: totalCash + totalOwedToMe - totalIOwe,
      });

      setIncomes(incomeData || []);
      setExpenses(expenseData || []);
      setDebts(debtData || []);
      setPeople(peopleData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const SideNavItem = ({ view, label, icon }: { view: View, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 rounded-xl mb-2 ${
        activeView === view ? 'active-nav font-bold shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-72 glass border-r border-white/5 fixed inset-y-0 left-0 hidden xl:flex flex-col p-8 z-50">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-blue-500/20">D</div>
          <h1 className="text-2xl font-extrabold tracking-tighter">Drahmi</h1>
        </div>
        
        <nav className="flex-1">
          <SideNavItem view="home" label="Dashboard" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>} />
          <SideNavItem view="history" label="Activity Vault" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <SideNavItem view="debts" label="Counterparties" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857"/></svg>} />
          <SideNavItem view="settings" label="Account" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
        </nav>

        <div className="pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">{user.email?.charAt(0).toUpperCase()}</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black">Pro Member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 xl:ml-72 p-6 md:p-12 lg:p-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Your financial ecosystem is performing optimally.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveModal('cash')}
              className="px-6 py-3 glass rounded-xl text-sm font-bold border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              Set Reserve
            </button>
            <button 
              onClick={() => setActiveModal('expense')}
              className="px-6 py-3 bg-white text-slate-950 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all shadow-xl"
            >
              New Transaction
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-12">
          {activeView === 'home' && (
            <>
              {/* Massive Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="premium-card rounded-[32px] p-8 col-span-1 md:col-span-2 relative overflow-hidden">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6">Aggregate Net Worth</p>
                  <h3 className="text-6xl font-extrabold tracking-tighter mb-12 flex items-baseline">
                    <span className="text-blue-500 mr-4 text-3xl font-medium">DA</span>
                    {stats.netBalance.toLocaleString()}
                  </h3>
                  <div className="flex gap-10">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Cash Base</p>
                      <p className="text-2xl font-bold">{stats.totalCash.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Credit Spread</p>
                      <p className={`text-2xl font-bold ${stats.totalOwedToMe >= stats.totalIOwe ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(stats.totalOwedToMe - stats.totalIOwe).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="premium-card rounded-[32px] p-8 flex flex-col justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Cash Flow Delta</p>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-sm">Monthly In</span>
                        <span className="text-emerald-400 font-bold">+{stats.totalIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-sm">Monthly Out</span>
                        <span className="text-rose-400 font-bold">-{stats.totalExpenses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setActiveView('history')} className="w-full py-4 glass rounded-2xl text-[10px] uppercase font-black tracking-widest mt-8 border-white/5 hover:border-blue-500/30">
                    Deep Audit
                  </button>
                </div>
              </div>

              {/* Secondary Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <TransactionList title="Critical Operations" incomes={incomes} expenses={expenses} onRefresh={fetchData} />
                <div className="space-y-8">
                   <div className="premium-card rounded-[32px] p-8">
                      <h4 className="text-xl font-bold mb-6">Counterparty Risk</h4>
                      <div className="space-y-4">
                        {debts.slice(0, 3).map(debt => (
                          <div key={debt.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                            <span className="font-bold">{debt.person?.name}</span>
                            <span className={`font-black ${debt.type === 'owe_me' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {debt.type === 'owe_me' ? '+' : '-'}{debt.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <button onClick={() => setActiveView('debts')} className="w-full text-center text-sm text-blue-500 font-bold pt-4 hover:underline">View All Counterparties</button>
                      </div>
                   </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'history' && (
            <div className="animate-fade-up">
               <TransactionList title="Full Transaction Ledger" incomes={incomes} expenses={expenses} onRefresh={fetchData} />
            </div>
          )}

          {activeView === 'debts' && (
            <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="premium-card rounded-[32px] p-8">
                  <h2 className="text-2xl font-bold mb-8">Receivables</h2>
                  <div className="space-y-4">
                    {debts.filter(d => d.type === 'owe_me').map(debt => (
                      <div key={debt.id} className="flex items-center justify-between p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <span className="font-bold">{debt.person?.name}</span>
                        <span className="text-emerald-400 font-black">{debt.amount.toLocaleString()} DA</span>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="premium-card rounded-[32px] p-8">
                  <h2 className="text-2xl font-bold mb-8">Payables</h2>
                  <div className="space-y-4">
                    {debts.filter(d => d.type === 'i_owe').map(debt => (
                      <div key={debt.id} className="flex items-center justify-between p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                        <span className="font-bold">{debt.person?.name}</span>
                        <span className="text-amber-400 font-black">{debt.amount.toLocaleString()} DA</span>
                      </div>
                    ))}
                  </div>
               </div>
               <button onClick={() => setActiveModal('debt')} className="lg:col-span-2 py-6 bg-blue-600 rounded-3xl font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-600/20 active:scale-[0.98] transition-transform">
                 Register New Obligation
               </button>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-2xl mx-auto animate-fade-up">
               <div className="premium-card rounded-[48px] p-12 text-center">
                  <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl mx-auto mb-10">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-3xl font-black mb-2">{user.email?.split('@')[0]}</h3>
                  <p className="text-slate-500 mb-12">{user.email}</p>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <button className="py-4 glass rounded-2xl text-xs font-black uppercase tracking-widest border-white/5">Update Bio</button>
                    <button onClick={() => supabase.auth.signOut()} className="py-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/20">Sign Out</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Nav - Refined for Pro look */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 xl:hidden glass rounded-[32px] px-4 py-2 flex gap-4 shadow-2xl z-50 border-white/10 w-[90%] max-w-sm">
        <button onClick={() => setActiveView('home')} className={`flex-1 py-3 rounded-2xl flex flex-col items-center ${activeView === 'home' ? 'text-blue-500 bg-white/5' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        </button>
        <button onClick={() => setActiveView('history')} className={`flex-1 py-3 rounded-2xl flex flex-col items-center ${activeView === 'history' ? 'text-blue-500 bg-white/5' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <button onClick={() => setActiveView('debts')} className={`flex-1 py-3 rounded-2xl flex flex-col items-center ${activeView === 'debts' ? 'text-blue-500 bg-white/5' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857"/></svg>
        </button>
        <button onClick={() => setActiveView('settings')} className={`flex-1 py-3 rounded-2xl flex flex-col items-center ${activeView === 'settings' ? 'text-blue-500 bg-white/5' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        </button>
      </nav>

      {activeModal && <Modal type={activeModal} people={people} onClose={() => setActiveModal(null)} onSuccess={() => { setActiveModal(null); fetchData(); }} />}
    </div>
  );
};

export default Dashboard;