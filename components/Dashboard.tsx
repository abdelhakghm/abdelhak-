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
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignOut = () => supabase.auth.signOut();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const NavItem = ({ view, label, icon }: { view: View, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex flex-col items-center gap-1.5 py-2 flex-1 transition-all ${
        activeView === view ? 'text-blue-500 scale-105' : 'text-slate-600 hover:text-slate-400'
      }`}
    >
      <div className={`${activeView === view ? 'bg-blue-500/10 p-2 rounded-xl' : 'p-2'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto px-6 pt-8">
      {/* Dynamic Header */}
      <header className="flex items-center justify-between mb-10">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{getTimeGreeting()},</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {user.email?.split('@')[0]}
          </h1>
        </div>
        <div className="flex gap-3">
          {activeView === 'home' && (
             <button 
              onClick={() => setActiveModal('cash')}
              className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-full hover:border-blue-500/50 transition-all text-slate-400 hover:text-blue-400 shadow-lg"
              title="Update Wallet"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/></svg>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Areas */}
      <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-3">
        {activeView === 'home' && (
          <div className="space-y-8">
            {/* Hero Net Worth Card */}
            <div className="relative overflow-hidden glass-card rounded-[32px] p-8 bg-gradient-to-br from-blue-600/20 via-indigo-950/20 to-slate-950 border-white/5 shadow-2xl">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Net Financial Worth</p>
                <h2 className="text-4xl font-extrabold text-white flex items-baseline tracking-tighter">
                  <span className="text-blue-500 mr-2 text-xl font-medium">DA</span>
                  {stats.netBalance.toLocaleString()}
                </h2>
                
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Liquid Cash</p>
                    <p className="text-lg font-bold text-slate-200">{stats.totalCash.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Credit/Debt</p>
                    <p className={`text-lg font-bold ${(stats.totalOwedToMe - stats.totalIOwe) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {((stats.totalOwedToMe - stats.totalIOwe) >= 0 ? '+' : '')}{(stats.totalOwedToMe - stats.totalIOwe).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              {/* Abstract Background Elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-[80px]" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-[80px]" />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5 rounded-3xl border-slate-800/50 hover:border-emerald-500/20 transition-all group">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Income</p>
                <p className="text-lg font-bold text-white tracking-tight">{stats.totalIncome.toLocaleString()} <span className="text-[10px] text-slate-600">DA</span></p>
              </div>
              <div className="glass-card p-5 rounded-3xl border-slate-800/50 hover:border-rose-500/20 transition-all group">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Spent</p>
                <p className="text-lg font-bold text-white tracking-tight">{stats.totalExpenses.toLocaleString()} <span className="text-[10px] text-slate-600">DA</span></p>
              </div>
            </div>

            {/* Smart Insights Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-[0.3em] px-2">Smart Insights</h3>
              <div className="glass-card p-6 rounded-3xl bg-slate-900/30 border-slate-800/40">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Burn Rate</p>
                    <p className="text-lg font-bold text-white">
                      {((stats.totalExpenses / (stats.totalIncome || 1)) * 100).toFixed(0)}% <span className="text-[10px] font-normal text-slate-500">of income</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${stats.totalIncome >= stats.totalExpenses ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stats.totalIncome >= stats.totalExpenses ? 'Sustainable' : 'High Usage'}
                    </p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${stats.totalIncome >= stats.totalExpenses ? 'bg-blue-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, (stats.totalExpenses / (stats.totalIncome || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setActiveView('history')}
              className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 text-sm font-semibold hover:bg-slate-800 hover:text-white transition-all shadow-xl shadow-black/20"
            >
              Manage Transactions
            </button>
          </div>
        )}

        {activeView === 'history' && (
          <div className="space-y-8">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveModal('income')}
                className="flex-1 py-6 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 font-bold rounded-3xl shadow-xl transition-all transform active:scale-95 flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em]">Add Income</span>
              </button>
              <button 
                onClick={() => setActiveModal('expense')}
                className="flex-1 py-6 bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-400 font-bold rounded-3xl shadow-xl transition-all transform active:scale-95 flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em]">Add Expense</span>
              </button>
            </div>
            
            <TransactionList 
              title="Transaction Ledger" 
              incomes={incomes} 
              expenses={expenses} 
              onRefresh={fetchData} 
            />
          </div>
        )}

        {activeView === 'debts' && (
          <div className="space-y-8">
             <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 rounded-3xl border-slate-800/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Receivables</p>
                <p className="text-xl font-bold text-emerald-400">{stats.totalOwedToMe.toLocaleString()} <span className="text-xs font-normal">DA</span></p>
              </div>
              <div className="glass-card p-6 rounded-3xl border-slate-800/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Payables</p>
                <p className="text-xl font-bold text-amber-400">{stats.totalIOwe.toLocaleString()} <span className="text-xs font-normal">DA</span></p>
              </div>
            </div>
            <button 
              onClick={() => setActiveModal('debt')}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-3xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              Register New Debt
            </button>
            <div className="glass-card p-8 rounded-[32px] border-slate-800/40">
              <h2 className="text-lg font-bold mb-8 text-white flex items-center gap-3">
                Current Debtors & Creditors
                <span className="bg-slate-800 text-slate-500 text-[10px] px-2.5 py-1 rounded-full">{debts.length}</span>
              </h2>
              {debts.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800/50">
                  <p className="text-slate-600 italic text-sm">No outstanding debts recorded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {debts.map(debt => (
                    <div key={debt.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition-colors">
                      <div>
                        <p className="font-bold text-white mb-0.5">{debt.person?.name || 'Contact'}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${debt.type === 'owe_me' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {debt.type === 'owe_me' ? 'Receivable' : 'Payable'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{Number(debt.amount).toLocaleString()} DA</p>
                        <p className="text-[10px] text-slate-600 mt-1">{new Date(debt.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-8">
            <div className="glass-card p-8 rounded-[32px] border-slate-800/40">
              <div className="flex flex-col items-center text-center mb-12">
                <div className="relative mb-6">
                  <div className="w-28 h-28 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-5xl font-bold shadow-2xl border-4 border-slate-900">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-slate-900 rounded-full" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{user.email?.split('@')[0]}</h2>
                <p className="text-slate-500 text-sm mt-1">{user.email}</p>
              </div>
              
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-5 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl transition-all border border-slate-800/60 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <span className="text-slate-300 font-semibold text-sm">Account Preferences</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </button>
                <button className="w-full flex items-center justify-between p-5 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl transition-all border border-slate-800/60 group">
                   <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/></svg>
                    </div>
                    <span className="text-slate-300 font-semibold text-sm">Currency (DA)</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>

              <button 
                onClick={handleSignOut}
                className="w-full mt-12 py-5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 rounded-[24px] font-bold transition-all border border-rose-500/10 active:scale-95 shadow-lg"
              >
                End Active Session
              </button>
            </div>
            
            <div className="text-center pb-8">
              <p className="text-[10px] text-slate-700 uppercase tracking-[0.5em] font-bold">Drahmi • Secure Fintech</p>
            </div>
          </div>
        )}
      </div>

      {/* Modern High-End Floating Nav */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-3xl border border-white/5 px-8 py-3 flex items-center justify-between z-40 w-[92%] max-w-md rounded-[32px] shadow-2xl shadow-black">
        <NavItem 
          view="home" 
          label="Home" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>} 
        />
        <NavItem 
          view="history" 
          label="History" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
        />
        <NavItem 
          view="debts" 
          label="Debts" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>} 
        />
        <NavItem 
          view="settings" 
          label="Settings" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} 
        />
      </nav>

      {/* Interaction Modals */}
      {activeModal && (
        <Modal 
          type={activeModal} 
          people={people} 
          onClose={() => setActiveModal(null)} 
          onSuccess={() => {
            setActiveModal(null);
            fetchData();
          }} 
        />
      )}
    </div>
  );
};

export default Dashboard;