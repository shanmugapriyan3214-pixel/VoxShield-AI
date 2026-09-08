import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/app/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-cyber-surface border border-cyber-border rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan shadow-cyan-glow mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-cyber-text tracking-wide">
            VOXSHIELD <span className="text-cyber-cyan font-mono text-sm">AI</span>
          </h1>
          <p className="text-xs text-cyber-muted mt-1 font-mono">
            Zero-Trust Voice Security & Deepfake Defense
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-cyber-crimson/15 border border-cyber-crimson/40 text-cyber-crimson text-xs font-mono">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1.5 uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cyber-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1.5 uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cyber-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-text"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-cyber-cyan text-cyber-bg font-semibold text-xs rounded-xl shadow-cyan-glow hover:bg-cyan-300 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-mono tracking-wider uppercase"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-cyber-bg border-t-transparent rounded-full animate-spin" />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <span>SIGN IN TO VOXSHIELD</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-cyber-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyber-cyan hover:underline font-semibold">
            Register for access
          </Link>
        </div>
      </div>
    </div>
  );
};
