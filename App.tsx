import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Online/Offline listeners
    const handleOnline = () => {
      setIsOffline(false);
      // Re-trigger auth check when back online
      checkUser();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial session check
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Auth session fetch error (might be offline):", error);
        }
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Auth session exception:", err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight mb-1">Drahmi</h1>
            <p className="text-slate-500 text-sm animate-pulse">Establishing Secure Connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 transition-colors duration-300">
      {/* Enhanced Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-rose-600/90 backdrop-blur-md text-white py-3 px-4 shadow-2xl animate-in slide-in-from-top duration-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 5.636a9 9 0 010 12.728m0-12.728L5.636 18.364m12.728-12.728L5.636 5.636m12.728 12.728L5.636 18.364"/></svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Network Interrupted</p>
                <p className="text-[10px] opacity-80 font-medium">Data synchronization paused. UI remains active.</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
              Retry
            </button>
          </div>
        </div>
      )}

      {user ? (
        <Dashboard user={user} />
      ) : (
        <Auth />
      )}
    </div>
  );
};

export default App;