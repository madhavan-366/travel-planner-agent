import httpx
from datetime import datetime

OUTDOOR_KEYWORDS = [
    "trek", "trekking", "hike", "hiking", "boat", "boating", "beach", "garden",
    "park", "waterfall", "lake", "mountain", "fort", "temple", "monument",
    "sightseeing", "safari", "walk", "cycling", "cable car", "ropeway",
    "outdoor", "viewpoint", "sunrise", "sunset", "island", "river"
]

INDOOR_ALTERNATIVES = [
    "Visit a local museum",
    "Explore an indoor art gallery",
    "Tour a historic palace interior",
    "Visit a prominent local bazaar / shopping street",
    "Relax at a highly-rated local cafe",
    "Visit a science or cultural centre",
    "Explore a local food market indoors",
]

async def geocode_destination(destination: str):
    """Get lat/lon for a destination using Open-Meteo's free geocoding API."""
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={destination}&count=1&language=en&format=json"
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            data = r.json()
            results = data.get("results", [])
            if results:
                return results[0]["latitude"], results[0]["longitude"], results[0].get("name", destination)
    except Exception:
        pass
    return None, None, destination

async def fetch_forecast(lat: float, lon: float, days: int = 5) -> dict:
    """
    Fetch hourly forecast from Open-Meteo (free, no key).
    Returns dict keyed by 'YYYY-MM-DDTHH:00' with {rain_prob, temp_c, condition}.
    """
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&hourly=precipitation_probability,temperature_2m,weathercode"
            f"&forecast_days={min(days, 7)}&timezone=auto"
        )
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            data = r.json()

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        rain_probs = hourly.get("precipitation_probability", [])
        temps = hourly.get("temperature_2m", [])
        codes = hourly.get("weathercode", [])

        forecast = {}
        for i, t in enumerate(times):
            forecast[t] = {
                "rain_prob": rain_probs[i] if i < len(rain_probs) else 0,
                "temp_c": temps[i] if i < len(temps) else 25,
                "weathercode": codes[i] if i < len(codes) else 0,
            }
        return forecast
    except Exception:
        return {}

def is_outdoor_activity(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in OUTDOOR_KEYWORDS)

def is_risky(forecast: dict, date_hint: str, time_str: str) -> tuple[bool, str]:
    """
    Check if a given time slot on any forecast day is risky.
    date_hint is used to find the nearest matching hour slot.
    Returns (risky: bool, reason: str)
    """
    if not forecast or not time_str:
        return False, ""

    # Try to match time against the first available forecast date that has data
    for ts, data in forecast.items():
        try:
            hour = int(time_str.split(":")[0])
            ts_hour = int(ts[11:13])
            if ts_hour == hour:
                rain = data.get("rain_prob", 0)
                temp = data.get("temp_c", 25)
                if rain > 60:
                    return True, f"High rain probability ({rain}%) forecast at this time."
                if temp > 42:
                    return True, f"Extreme heat ({temp}°C) forecast at this time."
                if temp < 2:
                    return True, f"Dangerous cold ({temp}°C) forecast at this time."
                return False, ""
        except Exception:
            continue
    return False, ""

def pick_indoor_alternative(activity: str, index: int) -> str:
    return INDOOR_ALTERNATIVES[index % len(INDOOR_ALTERNATIVES)]
