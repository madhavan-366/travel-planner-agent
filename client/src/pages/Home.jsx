import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import MapView from '../components/MapView';

const HERO_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80', label: 'Mountain Escape' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', label: 'Beach Paradise' },
  { url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80', label: 'City Lights' },
  { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80', label: 'Road Adventures' },
];

// Day accent colors cycling
const DAY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const TRANSIT_HOURS = { Flight: 3, Train: 28, Bus: 20, Car: 16 };

// Country keyword lists to detect international travel
const INDIA_CITIES = ['mumbai','delhi','bangalore','bengaluru','chennai','kolkata','hyderabad','pune','ahmedabad','jaipur','surat','lucknow','kanpur','nagpur','visakhapatnam','indore','thane','bhopal','patna','vadodara','goa','kochi','coimbatore','ooty','mysore','agra','varanasi','amritsar','chandigarh','bhubaneswar','guwahati','ranchi','raipur','dehradun','shimla','manali','rishikesh','haridwar','leh','ladakh','darjeeling','siliguri','jammu','srinagar','india'];

function isInternationalJourney(from, to) {
  if (!from || !to) return false;
  const f = from.toLowerCase().trim();
  const t = to.toLowerCase().trim();
  const fromIndia = INDIA_CITIES.some(c => f.includes(c));
  const toIndia = INDIA_CITIES.some(c => t.includes(c));
  // If one end is India and the other is not, it's international
  if (fromIndia && !toIndia) return true;
  if (!fromIndia && toIndia) return true;
  // If neither is India, likely international too
  if (!fromIndia && !toIndia) return true;
  return false;
}

// Parse raw itinerary text into { summary, days[] }
function parseItinerary(text) {
  if (!text) return { summary: '', days: [] };

  const summaryMatch = text.match(/##\s*TRIP SUMMARY\s*\n([\s\S]*?)(?=##\s*Day\s*\d|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : '';

  const dayBlocks = [...text.matchAll(/##\s*Day\s*(\d+)[:\s]*(.*?)\n([\s\S]*?)(?=##\s*Day\s*\d|$)/gi)];
  const days = dayBlocks.map(m => {
    const lines = m[3].trim().split('\n').map(l => l.trim()).filter(Boolean);
    const entries = lines.map(line => {
      const match = line.match(/^(\d{1,2}:\d{2})\s*\|\s*(.+)$/);
      if (match) return { time: match[1], activity: match[2] };
      return { time: '', activity: line.replace(/^[-*]\s*/, '') };
    });
    return { num: parseInt(m[1]), title: m[2].trim(), entries };
  });

  return { summary, days };
}

const WEATHER_TAG = '[WEATHER_ADJUSTED]';

// Single timeline slide for one day
function DaySlide({ day, color, onViewLocation, adjustments, onSwap, swappingKey }) {
  const adjustedTimes = new Set((adjustments || []).map(a => a.time));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: color, borderRadius: '10px 10px 0 0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px', color: '#fff', flexShrink: 0 }}>
          {day.num}
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Day {day.num}</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>{day.title || 'Travel Day'}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', background: '#1e293b', borderRadius: '0 0 10px 10px' }}>
        {day.entries.map((entry, i) => {
          const rowKey = `${day.num}-${i}`;
          const isSwapping = swappingKey === rowKey;
          const isAdjusted = adjustedTimes.has(entry.time) || entry.activity.includes(WEATHER_TAG);
          const cleanActivity = entry.activity.replace(WEATHER_TAG, '').trim();
          const adjDetail = (adjustments || []).find(a => a.time === entry.time);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${isAdjusted ? '#78350f' : '#334155'}`, background: isSwapping ? '#0f2744' : isAdjusted ? '#1c1007' : 'transparent' }}>
              {/* TIME */}
              <div style={{ width: '72px', flexShrink: 0, padding: '12px 12px 12px 16px', borderRight: `3px solid ${isAdjusted ? '#f59e0b' : color}`, background: '#0f172a', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
                {entry.time
                  ? <span style={{ color: isAdjusted ? '#f59e0b' : color, fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>{entry.time}</span>
                  : <span style={{ color: '#475569', fontSize: '11px' }}>—</span>}
              </div>
              {/* ACTIVITY */}
              <div style={{ flex: 1, padding: '10px 14px' }}>
                {isSwapping
                  ? <div style={{ color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Finding alternative...
                    </div>
                  : <>
                      <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>{cleanActivity}</div>
                      {isAdjusted && (
                        <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: '#92400e', color: '#fcd34d', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>⚠ Weather Adjusted</span>
                          {adjDetail && <span style={{ color: '#94a3b8', fontSize: '11px' }}>{adjDetail.reason}</span>}
                        </div>
                      )}
                    </>
                }
              </div>
              {/* ACTIONS */}
              <div style={{ flexShrink: 0, padding: '0 10px', display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => onSwap(entry.time, cleanActivity, rowKey)}
                  disabled={isSwapping}
                  title="Swap this activity"
                  style={{ background: '#1e3a5f', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: isSwapping ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isSwapping ? 0.5 : 1 }}>
                  🔄 Swap
                </button>
                <button
                  onClick={() => onViewLocation(cleanActivity)}
                  title="Show on map"
                  style={{ background: '#0f172a', border: `1px solid ${isAdjusted ? '#f59e0b' : color}`, color: isAdjusted ? '#f59e0b' : color, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  📍 View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Summary slide (first page)
function SummarySlide({ summary, from, to, days, budget }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #059669)', borderRadius: '10px 10px 0 0', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Your Travel Plan</div>
        <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>{from} &rarr; {to}</div>
        <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{days.length} Days &middot; {days.length + 1} Slides</div>
      </div>
      <div style={{ flex: 1, background: '#1e293b', borderRadius: '0 0 10px 10px', padding: '16px 24px', overflowY: 'auto' }}>
        {/* Disclaimer */}
        <div style={{ background: '#1d4ed820', border: '1px solid #3b82f6', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>&#9432;</span>
          <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
            <strong>Budget Disclaimer:</strong> This plan is estimated for <strong>1 person</strong>.
            Budget shown is <strong>&#8377;{Number(budget).toLocaleString('en-IN')}</strong> per person.
            {budget > 0 && <> For a group, multiply accordingly (e.g. 5 people &rarr; <strong>&#8377;{(Number(budget) * 5).toLocaleString('en-IN')}</strong>).</>}
          </div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>Trip Overview</div>
        <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{summary || 'Loading summary...'}</div>
        {days.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {days.map((d, i) => (
              <div key={i} style={{ background: DAY_COLORS[i % DAY_COLORS.length], borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                Day {d.num}: {d.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    from_location: '', destination: '', budget_inr: '', duration_days: 3,
    departure_date: '', return_date: '', travel_mode: 'Flight'
  });

  // Transit time estimates in hours by mode (one-way, rough average for Indian routes)

  // Warn if transit time eats into trip duration
  const transitWarning = (() => {
    const { departure_date, return_date, travel_mode, duration_days } = formData;
    if (!departure_date || !return_date || !travel_mode) return null;
    const transitOneWayHours = TRANSIT_HOURS[travel_mode] || 3;
    const totalTransitDays = Math.ceil((transitOneWayHours * 2) / 24); // both ways
    const tripDays = Math.round((new Date(return_date) - new Date(departure_date)) / 86400000);
    if (tripDays <= 0) return null;
    const usableDays = tripDays - totalTransitDays;
    // No warning for Flight or international (flight is same-day travel)
    if (travel_mode === 'Flight' || isInternationalJourney(formData.from_location, formData.destination)) return null;
    // Suggest new return date
    const suggestedReturn = new Date(new Date(departure_date).getTime() + (tripDays + totalTransitDays) * 86400000);
    const suggestedStr = suggestedReturn.toISOString().split('T')[0];
    return {
      transitDays: totalTransitDays,
      usableDays: Math.max(0, usableDays),
      tripDays,
      suggestedReturn: suggestedStr,
      mode: travel_mode
    };
  })();

  // Auto-calculate duration whenever dates change
  const updateDate = (field, value) => {
    const updated = { ...formData, [field]: value };
    const dep = field === 'departure_date' ? value : formData.departure_date;
    const ret = field === 'return_date' ? value : formData.return_date;
    if (dep && ret && ret >= dep) {
      const diff = Math.round((new Date(ret) - new Date(dep)) / (1000 * 60 * 60 * 24));
      updated.duration_days = diff > 0 ? diff : 1;
    }
    setFormData(updated);
  };
  const datesSelected = formData.departure_date && formData.return_date;

  // Detect international journey and lock mode to Flight
  const isIntl = isInternationalJourney(formData.from_location, formData.destination);
  useEffect(() => {
    if (isIntl && formData.travel_mode !== 'Flight') {
      setFormData(p => ({ ...p, travel_mode: 'Flight' }));
    }
  }, [isIntl]);
  const [itinerary, setItinerary] = useState('');
  const [weatherAdjustments, setWeatherAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTimerRef = useRef(null);

  // Auto-advance hero every 4 seconds
  useEffect(() => {
    heroTimerRef.current = setInterval(() => {
      setHeroIdx(p => (p + 1) % HERO_IMAGES.length);
    }, 4000);
    return () => clearInterval(heroTimerRef.current);
  }, []);
  const [mapSpot, setMapSpot] = useState(null);
  const [mapSpotCount, setMapSpotCount] = useState(0); // counter forces re-trigger even for same location
  const [savedPlan, setSavedPlan] = useState(false);
  // swappingKey: "dayNum-entryIndex" of the row currently being swapped
  const [swappingKey, setSwappingKey] = useState(null);

  const parsed = parseItinerary(itinerary);
  // slides[0] = summary, slides[1..N] = days
  const totalSlides = parsed.days.length > 0 ? parsed.days.length + 1 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setItinerary('');
    setWeatherAdjustments([]);
    setCurrentSlide(0);
    setSavedPlan(false);
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const travel_dates = formData.departure_date && formData.return_date
      ? `${formData.departure_date} to ${formData.return_date}`
      : formData.departure_date || 'Flexible';
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, budget_usd: formData.budget_inr, travel_dates })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const p = JSON.parse(raw);
              if (p.output?.itinerary) setItinerary(p.output.itinerary);
              if (p.output?.weather_adjustments?.length) setWeatherAdjustments(p.output.weather_adjustments);
            } catch (_) {}
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── SWAP ACTIVITY ────────────────────────────────────────────────────────
  const handleSwap = async (time, currentActivity, swapKey) => {
    const token = localStorage.getItem('token');
    setSwappingKey(swapKey);
    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          destination: formData.destination,
          from_location: formData.from_location,
          time,
          current_activity: currentActivity,
          travel_dates: formData.travel_dates,
          budget_usd: Number(formData.budget_inr)
        })
      });
      const data = await res.json();
      if (data.new_activity) {
        // Patch the itinerary string: replace the exact "HH:MM | old activity" line
        const escapedActivity = currentActivity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const lineRegex = new RegExp(`(${time}\\s*\\|\\s*)${escapedActivity}([^\\n]*)`, 'i');
        setItinerary(prev => prev.replace(lineRegex, `${time} | ${data.new_activity}`));
      }
    } catch (err) { console.error('Swap failed:', err); }
    finally { setSwappingKey(null); }
  };

  // ── SAVE PLAN ────────────────────────────────────────────────────────────
  const handleSavePlan = async () => {
    const token = localStorage.getItem('token');
    const travel_dates = formData.departure_date && formData.return_date
      ? `${formData.departure_date} to ${formData.return_date}`
      : formData.departure_date || 'Flexible';
    try {
      const res = await fetch('/api/save-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          fromLocation: formData.from_location,
          destination: formData.destination,
          budgetUsd: Number(formData.budget_inr),
          durationDays: Number(formData.duration_days),
          travelDates: travel_dates,
          itinerary
        })
      });
      const data = await res.json();
      if (data.success) setSavedPlan(true);
    } catch (err) { console.error('Save failed:', err); }
  };

  // ── PDF EXPORT ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    // Strip chars outside latin-1 range that jsPDF helvetica can't render
    const safe = (str) => (str || '').replace(/[^\x00-\xFF]/g, (c) => {
      const map = { '₹': 'Rs.', '→': '->', '←': '<-', '·': '.', '…': '...', '—': '-', '–': '-' };
      return map[c] || '';
    });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const W = 210, H = 297, M = 14, timeColW = 28, contentX = M + timeColW + 4;

    const accentColors = [
      [59, 130, 246], [16, 185, 129], [245, 158, 11],
      [239, 68, 68], [139, 92, 246], [236, 72, 153], [6, 182, 212]
    ];

    // ── PAGE 1: Cover / Summary ──────────────────────────────────────────
    pdf.setFillColor(29, 78, 216);
    pdf.rect(0, 0, W, 55, 'F');
    pdf.setFillColor(5, 150, 105);
    pdf.rect(0, 45, W, 14, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('YOUR TRAVEL ITINERARY', W / 2, 22, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text(safe(`${formData.from_location}  ->  ${formData.destination}`), W / 2, 36, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(safe(`${parsed.days.length} Days  .  Rs.${Number(formData.budget_inr).toLocaleString('en-IN')} Budget (per person)`), W / 2, 50, { align: 'center' });

    // Disclaimer box
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(M, 62, W - M * 2, 16, 2, 2, 'F');
    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DISCLAIMER:', M + 3, 69);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safe(`This plan is for 1 person. Budget: Rs.${Number(formData.budget_inr).toLocaleString('en-IN')}. For 5 people multiply to Rs.${(Number(formData.budget_inr)*5).toLocaleString('en-IN')}.`), M + 22, 69);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Prices are AI estimates. Verify before booking.', M + 3, 75);

    // Summary body
    let y = 86;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('TRIP OVERVIEW', M, y); y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 30, 30);
    const summaryLines = pdf.splitTextToSize(safe(parsed.summary || ''), W - M * 2);
    summaryLines.forEach(l => { pdf.text(l, M, y); y += 5.5; });

    // Day badges
    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('DAYS AT A GLANCE', M, y); y += 7;
    parsed.days.forEach((d, i) => {
      const [r, g, b] = accentColors[i % accentColors.length];
      pdf.setFillColor(r, g, b);
      pdf.roundedRect(M + (i % 2) * 92, y - 4, 88, 8, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text(safe(`Day ${d.num}: ${d.title}`), M + 3 + (i % 2) * 92, y + 0.5);
      if (i % 2 === 1) y += 11;
    });

    // ── ONE PAGE PER DAY ─────────────────────────────────────────────────
    parsed.days.forEach((day, di) => {
      pdf.addPage();
      const [r, g, b] = accentColors[di % accentColors.length];

      // Day header bar
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, W, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`DAY ${day.num}`, M, 12);
      pdf.setFontSize(17);
      pdf.setFont('helvetica', 'bold');
      pdf.text(safe(day.title || 'Travel Day'), M, 22);

      // Column headers
      let ey = 36;
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(r, g, b);
      pdf.text('TIME', M, ey);
      pdf.text('ACTIVITY', contentX, ey);
      ey += 2;

      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(0.4);
      pdf.line(M, ey, W - M, ey);
      ey += 5;

      day.entries.forEach((entry, ei) => {
        const wrapped = pdf.splitTextToSize(safe(entry.activity), W - contentX - M);
        const rowH = Math.max(8, wrapped.length * 5.5 + 3);

        if (ey + rowH > H - 12) {
          pdf.addPage();
          pdf.setFillColor(r, g, b);
          pdf.rect(0, 0, W, 12, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Day ${day.num} continued`, M, 8);
          ey = 20;
        }

        if (ei % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(M, ey - 3, W - M * 2, rowH, 'F');
        }

        if (entry.time) {
          pdf.setFillColor(r, g, b);
          pdf.roundedRect(M, ey - 2.5, timeColW - 2, 6, 1, 1, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8.5);
          pdf.setFont('helvetica', 'bold');
          pdf.text(entry.time, M + (timeColW - 2) / 2, ey + 1.5, { align: 'center' });
        } else {
          pdf.setTextColor(180, 180, 180);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text('-', M + 6, ey + 1.5);
        }

        pdf.setFillColor(r, g, b);
        pdf.rect(M + timeColW, ey - 2.5, 1.2, rowH - 1, 'F');

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        wrapped.forEach((wl, wi) => { pdf.text(wl, contentX, ey + 1.5 + wi * 5.5); });

        ey += rowH + 1;
      });

      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(0.3);
      pdf.line(M, H - 8, W - M, H - 8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(safe(`${formData.from_location} -> ${formData.destination}  .  Day ${day.num} of ${parsed.days.length}  |  Budget for 1 person: Rs.${Number(formData.budget_inr).toLocaleString('en-IN')}`), M, H - 4);
    });

    pdf.save(`Plan-${formData.destination || 'Trip'}.pdf`);
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={formData[key]}
        onChange={e => setFormData({ ...formData, [key]: e.target.value })} required
        style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #475569', color: '#fff', fontSize: '14px', outline: 'none' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ✈ Agentic Travel Space
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/profile')} style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>👤 My Plans</button>
          <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      {/* Hero — auto slideshow every 4s, no manual controls */}
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
        {HERO_IMAGES.map((img, i) => (
          <img key={i} src={img.url} alt={img.label}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.48)', opacity: i === heroIdx ? 1 : 0, transition: 'opacity 0.9s ease-in-out' }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', margin: 0, letterSpacing: '-0.5px', fontFamily: 'Inter, system-ui, sans-serif' }}>Explore the World</h2>
          <p style={{ color: '#e2e8f0', marginTop: '6px', fontSize: '14px', textShadow: '0 1px 6px rgba(0,0,0,0.7)', letterSpacing: '0.5px' }}>{HERO_IMAGES[heroIdx].label}</p>
        </div>
        {/* Passive dot indicators only */}
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', pointerEvents: 'none' }}>
          {HERO_IMAGES.map((_, i) => (
            <div key={i} style={{ width: i === heroIdx ? '20px' : '8px', height: '6px', borderRadius: '3px', background: i === heroIdx ? '#60a5fa' : 'rgba(255,255,255,0.35)', transition: 'all 0.4s' }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 20px' }}>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 18px 0', fontSize: '17px', fontWeight: 700, color: '#f1f5f9' }}>🗺 Build Your Itinerary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            {field('📍 From', 'from_location', 'text', 'e.g. Chennai')}
            {field('🏁 Where To?', 'destination', 'text', 'e.g. Tokyo')}
            {field('💰 Budget (INR ₹)', 'budget_inr', 'number', 'e.g. 50000')}
            {/* Duration — auto-calculated when dates are set */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>📅 Duration (Days)</label>
              <input
                type="number" min="1"
                value={formData.duration_days}
                readOnly={!!datesSelected}
                onChange={e => !datesSelected && setFormData({ ...formData, duration_days: e.target.value })}
                style={{ padding: '10px', borderRadius: '6px', background: datesSelected ? '#1e293b' : '#0f172a', border: `1px solid ${datesSelected ? '#059669' : '#475569'}`, color: datesSelected ? '#34d399' : '#fff', fontSize: '14px', outline: 'none', cursor: datesSelected ? 'not-allowed' : 'text', fontWeight: datesSelected ? 700 : 400 }}
              />
              {datesSelected && <span style={{ fontSize: '10px', color: '#34d399', marginTop: '-2px' }}>Auto-calculated from dates</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>🗓 Departure Date</label>
              <input type="date" value={formData.departure_date}
                onChange={e => updateDate('departure_date', e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #475569', color: '#fff', fontSize: '14px', outline: 'none', colorScheme: 'dark' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>🗓 Return Date</label>
              <input type="date" value={formData.return_date}
                min={formData.departure_date}
                onChange={e => updateDate('return_date', e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #475569', color: '#fff', fontSize: '14px', outline: 'none', colorScheme: 'dark' }} />
            </div>
            {/* Travel Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>🚌 Travel Mode</label>
              <select value={formData.travel_mode}
                disabled={isIntl}
                onChange={e => setFormData({ ...formData, travel_mode: e.target.value })}
                style={{ padding: '10px', borderRadius: '6px', background: isIntl ? '#1e293b' : '#0f172a', border: `1px solid ${isIntl ? '#3b82f6' : '#475569'}`, color: isIntl ? '#60a5fa' : '#fff', fontSize: '14px', outline: 'none', colorScheme: 'dark', cursor: isIntl ? 'not-allowed' : 'pointer', fontWeight: isIntl ? 700 : 400 }}>
                <option value="Flight">✈ Flight</option>
                {!isIntl && <option value="Train">🚂 Train</option>}
                {!isIntl && <option value="Bus">🚌 Bus</option>}
                {!isIntl && <option value="Car">🚗 Car</option>}
              </select>
              {isIntl && <span style={{ fontSize: '10px', color: '#60a5fa', marginTop: '-2px' }}>✈ International — Flight only</span>}
            </div>
          </div>

          {/* Transit warning banner */}
          {transitWarning && (
            <div style={{ background: '#1c1007', border: '1px solid #d97706', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '13px', marginBottom: '5px' }}>
                    ⚠️ Travel Time Warning — {transitWarning.mode} journey
                  </div>
                  <div style={{ color: '#d97706', fontSize: '12px', lineHeight: '1.6' }}>
                    A {transitWarning.mode.toLowerCase()} trip typically takes ~{TRANSIT_HOURS[transitWarning.mode]}h one-way
                    ({transitWarning.transitDays} day{transitWarning.transitDays > 1 ? 's' : ''} total for travel both ways).<br />
                    Your {transitWarning.tripDays}-day window leaves only <strong style={{ color: '#fbbf24' }}>{transitWarning.usableDays} usable day{transitWarning.usableDays !== 1 ? 's' : ''}</strong> at the destination.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateDate('return_date', transitWarning.suggestedReturn)}
                  style={{ flexShrink: 0, background: '#d97706', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Fix: Set return to {transitWarning.suggestedReturn}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', background: loading ? '#475569' : 'linear-gradient(to right, #2563eb, #059669)', color: '#fff', fontWeight: 700, padding: '12px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px' }}>
            {loading ? '⚙ Generating Plan...' : '🚀 Generate Optimized Plan'}
          </button>
        </form>

        {/* Slides */}
        {totalSlides > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, color: '#34d399', fontSize: '17px' }}>📋 Your Itinerary</h2>
              <button onClick={exportPDF}
                style={{ background: '#059669', color: '#fff', padding: '8px 20px', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                📥 Download PDF
              </button>
            </div>

            {/* Weather alert banner */}
            {weatherAdjustments.length > 0 && (
              <div style={{ background: '#1c1007', border: '1px solid #92400e', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>⛈</span>
                <div>
                  <div style={{ color: '#fcd34d', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Weather Routing Active — {weatherAdjustments.length} activity{weatherAdjustments.length > 1 ? 's' : ''} adjusted</div>
                  <div style={{ color: '#d97706', fontSize: '12px' }}>
                    {weatherAdjustments.map((a, i) => (
                      <div key={i}>• {a.time} | <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{a.original}</span> → {a.replacement}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Slide area — fixed height so one day = one screen */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', height: '520px', position: 'relative' }}>
              {/* Slide counter badge */}
              <div style={{ position: 'absolute', top: '12px', right: '14px', zIndex: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 700 }}>
                {currentSlide + 1} / {totalSlides}
              </div>

              <div style={{ height: '100%', overflow: 'hidden' }}>
                {currentSlide === 0
                  ? <SummarySlide summary={parsed.summary} from={formData.from_location} to={formData.destination} days={parsed.days} budget={formData.budget_inr} />
                  : <DaySlide day={parsed.days[currentSlide - 1]} color={DAY_COLORS[(currentSlide - 1) % DAY_COLORS.length]}
                      onViewLocation={(loc) => {
                        setMapSpot(loc);
                        setMapSpotCount(c => c + 1);
                        document.getElementById('route-map')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      adjustments={weatherAdjustments} onSwap={handleSwap} swappingKey={swappingKey} />
                }
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(p => p - 1)}
                style={{ background: '#334155', color: '#fff', padding: '8px 22px', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', opacity: currentSlide === 0 ? 0.35 : 1 }}>
                ← Previous
              </button>

              {/* Dot nav */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from({ length: totalSlides }).map((_, i) => {
                  const color = i === 0 ? '#34d399' : DAY_COLORS[(i - 1) % DAY_COLORS.length];
                  return (
                    <button key={i} onClick={() => setCurrentSlide(i)} title={i === 0 ? 'Summary' : `Day ${i}`}
                      style={{ width: i === currentSlide ? '24px' : '10px', height: '10px', borderRadius: '5px', background: i === currentSlide ? color : '#334155', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />
                  );
                })}
              </div>

              <button disabled={currentSlide === totalSlides - 1} onClick={() => setCurrentSlide(p => p + 1)}
                style={{ background: '#334155', color: '#fff', padding: '8px 22px', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: currentSlide === totalSlides - 1 ? 'not-allowed' : 'pointer', opacity: currentSlide === totalSlides - 1 ? 0.35 : 1 }}>
                Next →
              </button>
            </div>

            {/* Save Plan button */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              {savedPlan
                ? <div style={{ color: '#34d399', fontWeight: 700, fontSize: '14px' }}>✓ Plan saved! View it in <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/profile')}>My Plans</span></div>
                : <button onClick={handleSavePlan} style={{ background: 'linear-gradient(to right, #7c3aed, #2563eb)', color: '#fff', padding: '10px 32px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                    💾 Save This Plan
                  </button>
              }
            </div>
          </div>
        )}

        {/* Map */}
        {(formData.from_location || formData.destination) && (
          <div id="route-map" style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#60a5fa', fontSize: '17px', marginBottom: '12px' }}>🗺 Route Map</h2>
            <MapView from={formData.from_location} to={formData.destination} spotLocation={mapSpot} spotTrigger={mapSpotCount} destination={formData.destination} />
          </div>
        )}
      </div>
    </div>
  );
}
