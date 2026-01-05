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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className={`auth-container glass-card ${isRightPanelActive ? 'right-panel-active' : ''}`}>
        
        {/* Sign Up Container */}
        <div className="form-container sign-up-container flex items-center justify-center bg-slate-900/40 p-10">
          <form onSubmit={handleSignUp} className="w-full max-w-xs space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-slate-500 text-sm">Join Drahmi to start tracking.</p>
            </div>
            
            <input
              type="email"
              required
              placeholder="Email"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <button
              disabled={loading}
              className="w-full bg-white text-slate-950 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all transform active:scale-95"
            >
              {loading ? 'Processing...' : 'Sign Up'}
            </button>
            
            <button type="button" onClick={togglePanel} className="sm:hidden w-full text-blue-400 text-sm font-semibold mt-4">
              Already have an account? Sign In
            </button>

            {message && (
              <p className={`text-xs text-center mt-4 ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {message.text}
              </p>
            )}
          </form>
        </div>

        {/* Sign In Container */}
        <div className="form-container sign-in-container flex items-center justify-center bg-slate-900/40 p-10">
          <form onSubmit={handleSignIn} className="w-full max-w-xs space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-slate-500 text-sm">Sign in to manage your finances.</p>
            </div>
            
            <input
              type="email"
              required
              placeholder="Email"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              placeholder="Password"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all transform active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>

            <button type="button" onClick={togglePanel} className="sm:hidden w-full text-blue-400 text-sm font-semibold mt-4">
              New here? Create an account
            </button>

            {message && (
              <p className="text-xs text-rose-400 text-center mt-4">
                {message.text}
              </p>
            )}
          </form>
        </div>

        {/* Overlay Container */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
              <p className="mb-8 opacity-80">To keep connected with us please login with your personal info</p>
              <button 
                onClick={togglePanel}
                className="bg-transparent border-2 border-white text-white font-bold py-3 px-10 rounded-xl hover:bg-white/10 transition-all"
              >
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1 className="text-4xl font-bold mb-4">Drahmi</h1>
              <p className="mb-8 opacity-80">Enter your personal details and start your journey with us</p>
              <button 
                onClick={togglePanel}
                className="bg-transparent border-2 border-white text-white font-bold py-3 px-10 rounded-xl hover:bg-white/10 transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;