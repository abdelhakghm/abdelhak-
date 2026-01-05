import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Account created! Please check your email.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const togglePanel = () => {
    setIsRightPanelActive(!isRightPanelActive);
    setMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-12">
      <div className={`auth-container glass-card ${isRightPanelActive ? 'right-panel-active' : ''}`}>
        
        {/* Sign Up */}
        <div className="form-container sign-up-container flex items-center justify-center bg-slate-900/20 p-8 sm:p-12">
          <form onSubmit={handleSignUp} className="w-full max-w-sm space-y-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Join Drahmi</h2>
              <p className="text-slate-400 text-sm">Start your financial journey today.</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="email" required placeholder="Email address"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password" required minLength={6} placeholder="Secure password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Register'}
            </button>
            
            <p className="sm:hidden text-center text-slate-500 text-sm">
              Already have an account? <button type="button" onClick={togglePanel} className="text-blue-400 font-bold">Log In</button>
            </p>

            {message && (
              <p className={`text-xs text-center p-3 rounded-xl ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {message.text}
              </p>
            )}
          </form>
        </div>

        {/* Sign In */}
        <div className="form-container sign-in-container flex items-center justify-center bg-slate-900/20 p-8 sm:p-12">
          <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-6">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-600/10 mb-6">
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h2>
              <p className="text-slate-400 text-sm">Log in to manage your money.</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="email" required placeholder="Email address"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password" required placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <p className="sm:hidden text-center text-slate-500 text-sm">
              New to Drahmi? <button type="button" onClick={togglePanel} className="text-blue-400 font-bold">Register</button>
            </p>

            {message && (
              <p className="text-xs text-rose-400 text-center bg-rose-500/10 p-3 rounded-xl">
                {message.text}
              </p>
            )}
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Got Account?</h1>
              <p className="mb-8 text-blue-100/80 leading-relaxed">Securely log back into your dashboard and check your balances.</p>
              <button 
                onClick={togglePanel}
                className="bg-white/10 border-2 border-white/30 text-white font-bold py-3 px-10 rounded-2xl hover:bg-white hover:text-blue-900 transition-all"
              >
                Log In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1 className="text-4xl font-extrabold mb-4 tracking-tight">First Time?</h1>
              <p className="mb-8 text-blue-100/80 leading-relaxed">Join thousands of users who track their wealth with Drahmi's simple ecosystem.</p>
              <button 
                onClick={togglePanel}
                className="bg-white/10 border-2 border-white/30 text-white font-bold py-3 px-10 rounded-2xl hover:bg-white hover:text-blue-900 transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;