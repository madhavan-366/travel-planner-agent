import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TRAVEL_ICONS = ['✈', '🌍', '🗺', '🏔', '🏖', '🚂', '🧳', '🌅', '⛵', '🗼', '🎒', '🌴'];

const floatStyle = (i) => ({
  position: 'absolute',
  fontSize: `${18 + (i % 4) * 8}px`,
  opacity: 0.12 + (i % 3) * 0.06,
  top: `${(i * 37 + 10) % 90}%`,
  left: `${(i * 53 + 5) % 92}%`,
  animation: `floatIcon ${4 + (i % 4)}s ease-in-out infinite alternate`,
  animationDelay: `${i * 0.4}s`,
  userSelect: 'none',
  pointerEvents: 'none',
});

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    
    // 🛠️ FIX: Combine the backend base URL environment variable with your path endpoint!
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const endpoint = isRegister 
      ? `${baseUrl}/api/auth/register` 
      : `${baseUrl}/api/auth/login`;
      
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* Inject float animation */}
      <style>{`
        @keyframes floatIcon {
          from { transform: translateY(0px) rotate(-5deg); }
          to   { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .login-input { transition: border-color 0.2s; }
        .login-input:focus { border-color: #6366f1 !important; outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .login-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .login-btn { transition: all 0.2s; }
        .toggle-link:hover { color: #818cf8; }
      `}</style>

      {/* Floating travel icons background */}
      {TRAVEL_ICONS.map((icon, i) => (
        <span key={i} style={floatStyle(i)}>{icon}</span>
      ))}

      {/* Glowing orbs */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top: '-100px', right: '-100px', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', bottom: '-80px', left: '-80px', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '40px 36px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✈</div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, background: 'linear-gradient(to right, #818cf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Agentic Travel Space
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>
            {isRegister ? 'Create your account to start planning' : 'Welcome back, explorer 🌍'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
              {err}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '7px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="login-input"
              style={{ width: '100%', padding: '11px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '7px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="login-input"
                style={{ width: '100%', padding: '11px 44px 11px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: showPassword ? '#818cf8' : '#475569', padding: '2px' }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="login-btn"
            style={{ width: '100%', padding: '12px', background: loading ? '#334155' : 'linear-gradient(to right, #6366f1, #10b981)', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '⏳ Please wait...' : isRegister ? '🚀 Create Account' : '🌍 Sign In & Explore'}
          </button>
        </form>

        {/* Toggle */}
        <p
          className="toggle-link"
          onClick={() => { setIsRegister(p => !p); setErr(''); }}
          style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}
        >
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span style={{ color: '#818cf8', fontWeight: 700 }}>{isRegister ? 'Sign In' : 'Register Free'}</span>
        </p>

        {/* Bottom tagline */}
        <div style={{ borderTop: '1px solid #1e293b', marginTop: '24px', paddingTop: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: '#334155' }}>✈ Plan smarter · 🌍 Travel better · 🗺 AI-powered</span>
        </div>
      </div>
    </div>
  );
}
