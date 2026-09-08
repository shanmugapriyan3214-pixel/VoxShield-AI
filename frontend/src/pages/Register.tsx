import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Shield, User } from 'lucide-react';

export const Register: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await register(displayName, username, email, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-cyber-surface border border-cyber-border rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan shadow-cyan-glow mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-cyber-text tracking-wide">
            REGISTER FOR <span className="text-cyber-cyan">VOXSHIELD</span>
          </h1>
          <p className="text-xs text-cyber-muted mt-1 font-mono">
            Zero-Server-Audio Protected Voice Security
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-cyber-crimson/15 border border-cyber-crimson/40 text-cyber-crimson text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
              Full Name / Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-cyber-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice Vance"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
              Username
            </label>
            <div className="relative">
              <span className="text-xs text-cyber-muted font-mono absolute left-3.5 top-1/2 -translate-y-1/2">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="alice_vance"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cyber-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@voxshield.io"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cyber-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cyber-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-card border border-cyber-border rounded-xl text-xs text-cyber-text placeholder:text-cyber-muted/50 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-cyber-cyan text-cyber-bg font-semibold text-xs rounded-xl shadow-cyan-glow hover:bg-cyan-300 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-mono tracking-wider uppercase"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-cyber-bg border-t-transparent rounded-full animate-spin" />
                <span>CREATING ACCOUNT...</span>
              </>
            ) : (
              <span>CREATE SECURE ACCOUNT</span>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-cyber-muted">
          Already registered?{' '}
          <Link to="/login" className="text-cyber-cyan hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
