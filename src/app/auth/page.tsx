'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');

    const { error } = await getSupabase().auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Ensure user record exists in our DB
      await fetch('/api/auth/ensure-user', { method: 'POST' });
      window.location.href = '/';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">R</div>
          <h1 className="auth-brand-name">RevNote</h1>
          <p className="auth-subtitle">Your AI-ready workspace for notes & knowledge</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <label className="auth-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                'Continue with Email'
              )}
            </button>
            <p className="auth-hint">
              We&apos;ll send you a one-time verification code
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <p className="auth-otp-sent">
              Code sent to <strong>{email}</strong>
            </p>
            <label className="auth-label" htmlFor="otp">
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              className="auth-input auth-otp-input"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
              maxLength={6}
              inputMode="numeric"
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError('');
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
