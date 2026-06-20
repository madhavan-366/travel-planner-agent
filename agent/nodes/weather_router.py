import re
from agent.state import TravelState
from agent.utils.weather import (
    geocode_destination, fetch_forecast,
    is_outdoor_activity, is_risky, pick_indoor_alternative
)

WEATHER_TAG = "[WEATHER_ADJUSTED]"

async def weather_router_node(state: TravelState):
    print("--- STARTING WEATHER ROUTER ---")

    destination = state.get("destination", "")
    itinerary: str = state.get("itinerary", "")

    # 1. Geocode destination
    lat, lon, resolved = await geocode_destination(destination)
    if lat is None:
        print("--- WEATHER ROUTER: geocode failed, skipping ---")
        return {"itinerary": itinerary, "weather_adjustments": []}

    # 2. Fetch 5-day forecast
    duration = int(state.get("duration_days", 5))
    forecast = await fetch_forecast(lat, lon, days=min(duration, 7))
    if not forecast:
        print("--- WEATHER ROUTER: no forecast data, skipping ---")
        return {"itinerary": itinerary, "weather_adjustments": []}

    # 3. Scan and rewrite itinerary lines
    lines = itinerary.split("\n")
    adjustments = []
    alt_index = 0
    new_lines = []

    for line in lines:
        # Match time|activity lines: "HH:MM | some activity text"
        m = re.match(r'^(\d{1,2}:\d{2})\s*\|\s*(.+)$', line.strip())
        if m:
            time_str = m.group(1)
            activity = m.group(2)

            if is_outdoor_activity(activity):
                risky, reason = is_risky(forecast, destination, time_str)
                if risky:
                    alternative = pick_indoor_alternative(activity, alt_index)
                    alt_index += 1

                    # Rewrite the line with the indoor alternative + tag
                    new_line = f"{time_str} | {alternative} {WEATHER_TAG}"
                    new_lines.append(new_line)

                    adjustments.append({
                        "time": time_str,
                        "original": activity,
                        "replacement": alternative,
                        "reason": reason,
                        "weather_adjusted": True,
                        "note": f"Adjusted to indoor alternative due to: {reason}"
                    })
                    print(f"  SWAPPED [{time_str}]: {activity} → {alternative} ({reason})")
                    continue

        new_lines.append(line)

    updated_itinerary = "\n".join(new_lines)
    print(f"--- WEATHER ROUTER DONE: {len(adjustments)} adjustment(s) made ---")
    return {
        "itinerary": updated_itinerary,
        "weather_adjustments": adjustments
    }
