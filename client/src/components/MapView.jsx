import React, { useEffect, useRef, useState } from 'react';

if (!document.getElementById('leaflet-css')) {
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

async function geocode(query) {
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'TravelPlannerApp' } }
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name };
  } catch (_) {}
  return null;
}

/**
 * Smart place name extractor.
 * Handles real AI output patterns like:
 * "Lalbagh Botanical Garden morning walk - Rs.20"
 * "Hotel check-in: Taj West End, Bangalore - Rs.4500/night"
 * "Lunch at MTR Restaurant, MG Road"
 * "Board Shatabdi Express from Bangalore to Mysore"
 * "Arrive at Ooty Bus Stand"
 */
function extractPlaceName(activity, destination) {
  if (!activity) return destination || '';

  // 1. Strip tags and cost/price suffixes
  let t = activity
    .replace(/\[WEATHER_ADJUSTED\]/gi, '')
    .replace(/[-–]\s*Rs\.?[\s\d,./]+.*$/i, '')   // "- Rs.450/night" and variants
    .replace(/[-–]\s*\u20b9[\s\d,./]+.*$/i, '')    // "- ₹450"
    .replace(/\s*\(.*?\)/g, '')                     // anything in parens
    .replace(/\s*\bper person\b.*/i, '')
    .replace(/\s*\bticket.*$/i, '')
    .trim();

  // 2. Hotel check-in pattern: "Hotel check-in: NAME" or "Check-in at NAME"
  //    Extract everything after the colon or "at"
  const hotelColon = t.match(/(?:hotel\s+check[-\s]?in|check[-\s]?in(?:\s+at)?)\s*:\s*(.+)/i);
  if (hotelColon) return hotelColon[1].split(',')[0].trim() + ', ' + destination;

  const checkinAt = t.match(/check[-\s]?in\s+at\s+(.+)/i);
  if (checkinAt) return checkinAt[1].split(',')[0].trim() + ', ' + destination;

  // 3. Transport pattern: "Board/Take X from A to B" → use B (arrival city)
  const transport = t.match(/(?:board|take|catch|depart|travel)\s+.+?\s+(?:from\s+\S+\s+)?to\s+([A-Z][\w\s]+)/i);
  if (transport) return transport[1].trim() + ', ' + destination;

  // 4. "Arrive at PLACE" or "Reach PLACE"
  const arrive = t.match(/(?:arrive?(?:\s+at)?|reach)\s+([A-Z][\w\s]+?)(?:\s+(?:Bus|Railway|Airport|Station|Stand).*)?$/i);
  if (arrive) return arrive[1].trim() + ', ' + destination;

  // 5. Meal pattern: "Lunch/Dinner/Breakfast at NAME" → extract NAME
  const meal = t.match(/(?:lunch|dinner|breakfast|brunch|meal|food)\s+at\s+(.+)/i);
  if (meal) return meal[1].split(',')[0].trim() + ', ' + destination;

  // 6. "at PLACE" anywhere — grab what follows "at"
  const atMatch = t.match(/\bat\s+([A-Z][\w\s'-]+?)(?:\s*,|\s*-|$)/i);
  if (atMatch) return atMatch[1].trim() + ', ' + destination;

  // 7. Strip leading verb phrases (long list)
  t = t.replace(/^(?:visit|explore|tour|head\s+to|travel\s+to|go\s+to|walk\s+to|drive\s+to|stop\s+at|relax\s+at|enjoy|see|view|depart\s+from|leave\s+from|morning\s+visit|evening\s+visit|full\s+day\s+at|half\s+day\s+at|free\s+time\s+at|shopping\s+at|sightseeing\s+at)\s+/i, '').trim();

  // 8. Strip trailing descriptors after the place name
  //    e.g. "Lalbagh Botanical Garden morning walk" → "Lalbagh Botanical Garden"
  //    Strategy: take up to first verb-like word that isn't part of a proper noun
  const trailingVerb = t.match(/^([\w\s'-]+?)\s+(?:morning|evening|night|afternoon|walk|tour|visit|trip|ride|cruise|hike|trek|stroll|session|show|performance|market|shopping|area)\b.*/i);
  if (trailingVerb) t = trailingVerb[1].trim();

  // 9. Skip fully generic terms — just show destination
  const generic = /^(hotel|restaurant|cafe|free time|rest|sleep|wake|pack|check|taxi|auto|bus|train|flight|transfer|transit|departure|arrival|morning|evening|night|day)$/i;
  if (generic.test(t)) return destination || t;

  // 10. Append destination city for geocoding accuracy
  return t ? `${t}, ${destination}` : destination;
}

function makeSpotMarkerIcon(L) {
  return L.divIcon({
    html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(239,68,68,0.8)"></div>`,
    className: '',
    iconAnchor: [8, 8]
  });
}

export default function MapView({ from, to, spotLocation, spotTrigger, destination }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const spotMarkerRef = useRef(null);
  const [status, setStatus] = useState('Loading map...');
  const [spotLabel, setSpotLabel] = useState('');

  // Init map on from/to change
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const L = (await import('leaflet')).default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      if (!mapRef.current || cancelled) return;
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }

      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      instanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const [fromCoords, toCoords] = await Promise.all([geocode(from), geocode(to)]);
      if (cancelled) return;

      const bounds = [];
      if (fromCoords) {
        L.marker([fromCoords.lat, fromCoords.lon]).addTo(map)
          .bindPopup(`<b>From:</b> ${from}`).openPopup();
        bounds.push([fromCoords.lat, fromCoords.lon]);
      }
      if (toCoords) {
        L.marker([toCoords.lat, toCoords.lon]).addTo(map)
          .bindPopup(`<b>To:</b> ${to}`);
        bounds.push([toCoords.lat, toCoords.lon]);
      }
      if (bounds.length === 2) {
        L.polyline(bounds, { color: '#3b82f6', weight: 3, dashArray: '6 8' }).addTo(map);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 9);
      }
      setStatus('');
    };
    init();
    return () => { cancelled = true; };
  }, [from, to]);

  // Fly to spot when View button is clicked
  useEffect(() => {
    if (!spotLocation) return;
    let cancelled = false;
    const placeName = extractPlaceName(spotLocation, destination || to);
    setSpotLabel(placeName);

    const tryGeocode = async () => {
      const L = (await import('leaflet')).default;
      // First try: full extracted name e.g. "Lalbagh Botanical Garden, Bangalore"
      let coords = await geocode(placeName);
      // Second try: strip city suffix, search bare name
      if (!coords && placeName.includes(',')) {
        coords = await geocode(placeName.split(',')[0].trim());
      }
      // Third try: just the destination city itself
      if (!coords) coords = await geocode(destination || to);

      if (cancelled || !coords || !instanceRef.current) return;

      if (spotMarkerRef.current) {
        spotMarkerRef.current.remove();
        spotMarkerRef.current = null;
      }
      instanceRef.current.flyTo([coords.lat, coords.lon], 15, { duration: 1.4 });
      const marker = L.marker([coords.lat, coords.lon], { icon: makeSpotMarkerIcon(L) })
        .addTo(instanceRef.current)
        .bindPopup(`<b style="color:#ef4444">📍 ${placeName}</b>`)
        .openPopup();
      spotMarkerRef.current = marker;
    };

    tryGeocode();
    return () => { cancelled = true; };
  }, [spotLocation, spotTrigger]);

  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
      {status && (
        <div style={{ background: '#1e293b', color: '#94a3b8', padding: '10px 16px', fontSize: '13px' }}>{status}</div>
      )}
      {spotLabel && !status && (
        <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '8px 16px', fontSize: '12px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#ef4444' }}>📍</span> Showing: <strong>{spotLabel}</strong>
        </div>
      )}
      <div ref={mapRef} style={{ height: '380px', width: '100%' }} />
    </div>
  );
}
