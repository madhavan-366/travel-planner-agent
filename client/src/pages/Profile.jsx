import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DAY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function parseItinerary(text) {
  if (!text || typeof text !== 'string') return { summary: '', days: [] };
  const summaryMatch = text.match(/##\s*TRIP SUMMARY\s*\n([\s\S]*?)(?=##\s*Day\s*\d|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : '';
  const dayBlocks = [...text.matchAll(/##\s*Day\s*(\d+)[:\s]*(.*?)\n([\s\S]*?)(?=##\s*Day\s*\d|$)/gi)];
  const days = dayBlocks.map(m => {
    const lines = m[3].trim().split('\n').map(l => l.trim()).filter(Boolean);
    const entries = lines.map(line => {
      const match = line.match(/^(\d{1,2}:\d{2})\s*\|\s*(.+)$/);
      if (match) return { time: match[1], activity: match[2].replace(/\[WEATHER_ADJUSTED\]/gi, '').trim() };
      return { time: '', activity: line.replace(/^[-*]\s*/, '') };
    });
    return { num: parseInt(m[1]), title: m[2].trim(), entries };
  });
  return { summary, days };
}

export default function Profile() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [activeDay, setActiveDay] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async (planId, i) => {
    setDeleting(planId);
    setConfirmDelete(null);
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/my-plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlans(prev => prev.filter(p => p._id !== planId));
      if (expanded === i) setExpanded(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    fetch('/api/my-plans', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setPlans(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const togglePlan = (i) => {
    setExpanded(p => p === i ? null : i);
    setActiveDay(p => ({ ...p, [i]: 0 }));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '18px', fontWeight: 800, cursor: 'pointer' }}>
          ← Agentic Travel Space
        </button>
        <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '16px' }}>👤 My Saved Plans</h2>
      </nav>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '28px 20px' }}>
        {loading && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading your plans...</p>}

        {!loading && plans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '70px 0', color: '#475569' }}>
            <div style={{ fontSize: '52px', marginBottom: '14px' }}>🗺</div>
            <p style={{ fontSize: '17px', marginBottom: '20px' }}>No saved plans yet.</p>
            <button onClick={() => navigate('/')} style={{ background: '#2563eb', color: '#fff', padding: '11px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
              Plan a Trip
            </button>
          </div>
        )}

        {plans.map((plan, i) => {
          const parsed = parseItinerary(plan.itinerary);
          const dayIdx = activeDay[i] || 0;
          const isOpen = expanded === i;

          return (
            <div key={plan._id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
              {/* Card header — always visible */}
              <div onClick={() => togglePlan(i)} style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#60a5fa', marginBottom: '5px' }}>
                    {plan.fromLocation} → {plan.destination}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>📅 {plan.travelDates || 'Flexible'}</span>
                    <span>📆 {plan.durationDays} days</span>
                    <span>💰 ₹{Number(plan.budgetUsd || 0).toLocaleString('en-IN')}</span>
                    <span>🕒 {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, background: plan.status === 'complete' ? '#064e3b' : '#1e3a5f', color: plan.status === 'complete' ? '#34d399' : '#60a5fa' }}>
                    {plan.status === 'complete' ? '✓ Saved' : '⚙ Incomplete'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(plan._id); }}
                    disabled={deleting === plan._id}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    {deleting === plan._id ? '...' : '🗑 Delete'}
                  </button>
                  <span style={{ color: '#475569', fontSize: '20px' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded itinerary */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #334155' }}>
                  {parsed.days.length === 0
                    ? <pre style={{ padding: '20px', whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{plan.itinerary}</pre>
                    : (
                      <>
                        {/* Summary */}
                        {parsed.summary && (
                          <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155', fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' }}>
                            {parsed.summary}
                          </div>
                        )}

                        {/* Day tab pills */}
                        <div style={{ display: 'flex', gap: '8px', padding: '14px 20px', overflowX: 'auto', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                          {parsed.days.map((d, di) => (
                            <button key={di} onClick={() => setActiveDay(p => ({ ...p, [i]: di }))}
                              style={{ flexShrink: 0, padding: '5px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer', background: dayIdx === di ? DAY_COLORS[di % DAY_COLORS.length] : '#1e293b', color: dayIdx === di ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
                              Day {d.num}
                            </button>
                          ))}
                        </div>

                        {/* Active day timeline */}
                        {parsed.days[dayIdx] && (
                          <div>
                            <div style={{ background: DAY_COLORS[dayIdx % DAY_COLORS.length], padding: '12px 20px' }}>
                              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', textTransform: 'uppercase' }}>Day {parsed.days[dayIdx].num}</div>
                              <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{parsed.days[dayIdx].title}</div>
                            </div>
                            {parsed.days[dayIdx].entries.map((entry, ei) => (
                              <div key={ei} style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: ei % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                                <div style={{ width: '70px', flexShrink: 0, padding: '10px 12px', borderRight: `3px solid ${DAY_COLORS[dayIdx % DAY_COLORS.length]}`, display: 'flex', alignItems: 'center' }}>
                                  {entry.time
                                    ? <span style={{ color: DAY_COLORS[dayIdx % DAY_COLORS.length], fontWeight: 700, fontSize: '12px', fontFamily: 'monospace' }}>{entry.time}</span>
                                    : <span style={{ color: '#334155' }}>—</span>}
                                </div>
                                <div style={{ flex: 1, padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', lineHeight: '1.5' }}>
                                  {entry.activity}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  }
                </div>
              )}
              {/* Inline delete confirmation */}
              {confirmDelete === plan._id && (
                <div onClick={e => e.stopPropagation()} style={{ margin: '0 16px 16px', background: '#1a0a0a', border: '1px solid #dc2626', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ color: '#f87171', fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>Delete this plan?</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{plan.fromLocation} → {plan.destination} will be permanently removed.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(plan._id, i)}
                      disabled={deleting === plan._id}
                      style={{ background: '#dc2626', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      {deleting === plan._id ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
