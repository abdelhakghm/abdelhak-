import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Account created! Check your email for confirmation.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-end bg-[#020617] relative overflow-hidden">
      {/* Immersive Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute top-[20%] right-[-10%] w-[60%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full"></div>

      {/* Hero Brand Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 pt-safe">
        <div className="w-20 h-20 bg-blue-600 rounded-[28%] flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-8 rotate-[-3deg] transition-transform hover:rotate-0 duration-500">
          <span className="text-white text-4xl font-black italic tracking-tighter">D</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-4 text-center">
          Drahmi<span className="text-blue-500">.</span>
        </h1>
        <p className="text-slate-400 text-lg font-medium text-center max-w-[280px] leading-snug">
          Command your wealth with precision.
        </p>
      </div>

      {/* Modern Interaction Card */}
      <div className="glass rounded-t-[48px] p-8 pb-12 shadow-[0_-20px_80px_rgba(0,0,0,0.5)] border-t border-white/10 relative z-10 animate-bottom-sheet">
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10"></div>

        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            {isRegistering ? 'Create Profile' : 'Sign In'}
          </h2>
          <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase">
            {isRegistering ? 'Join the wealth ecosystem' : 'Access your command center'}
          </p>
        </div>

        <form onSubmit={isRegistering ? handleSignUp : handleSignIn} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Apple ID or Email"
                className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-white text-lg outline-none focus:bg-white/[0.07] focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Security Password"
                className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-white text-lg outline-none focus:bg-white/[0.07] focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold text-center animate-pulse ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="pt-4 space-y-4">
            <button
              disabled={loading}
              className="w-full h-16 bg-white text-slate-950 font-black text-lg rounded-2xl shadow-xl hover:bg-slate-200 transition-all active:scale-[0.97] disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? 'Validating...' : isRegistering ? 'Register' : 'Authorize'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage(null);
              }}
              className="w-full py-4 text-slate-400 font-bold text-sm hover:text-white transition-colors"
            >
              {isRegistering ? (
                <>Already a member? <span className="text-blue-500 ml-1">Log in</span></>
              ) : (
                <>New to the ecosystem? <span className="text-blue-500 ml-1">Create account</span></>
              )}
            </button>
          </div>
        </form>

        {/* Home Indicator safe area */}
        <div className="h-safe sm:hidden"></div>
      </div>
      
      <style>{`
        @keyframes bottomSheet {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-bottom-sheet {
          animation: bottomSheet 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Auth;