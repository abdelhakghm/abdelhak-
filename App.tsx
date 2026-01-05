
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
    const handleOnline = () => {
      setIsOffline(false);
      checkUser();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkUser = async () => {
      try {
        // Get session from persistent storage
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.warn("Session check error:", error);
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Auth session exception:", err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

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
            <p className="text-slate-500 text-sm animate-pulse">
              {isOffline ? 'Loading Offline Cache...' : 'Establishing Secure Connection...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 transition-colors duration-300">
      {/* Permanent Offline Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600/90 backdrop-blur-md text-white py-2 px-4 shadow-2xl flex justify-center items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Offline Mode Active</span>
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
