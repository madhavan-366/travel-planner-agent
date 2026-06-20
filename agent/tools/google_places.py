import httpx
import asyncio

async def enrich_activities(destination: str, activities: list):
    enriched = []
    
    # We open a secure network client to talk to the internet
    async with httpx.AsyncClient() as client:
        for act in activities:
            # We build a public search link combining the activity name and the city
            search_query = f"{act['name']} {destination}"
            url = f"https://nominatim.openstreetmap.org/search?q={search_query}&format=json&limit=1"
            
            # OpenStreetMap requires a custom identity name header so they know who is calling
            headers = { "User-Agent": "MaddyTravelPlannerAgent/1.0" }
            
            try:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200 and len(response.json()) > 0:
                    # We grab the very first real location match found on the map
                    location_data = response.json()[0]
                    act["place_id"] = f"OSM_{location_data.get('place_id')}"
                else:
                    # Fallback ID if the place is rare or unique
                    act["place_id"] = "OSM_LOCAL_GEM_ID"
            except Exception:
                # Fallback ID if the network is busy
                act["place_id"] = "OSM_NETWORK_FALLBACK_ID"
                
            enriched.append(act)
            
            # We wait 1 second between items to respect OpenStreetMap's free usage rules
            await asyncio.sleep(1)
            
    return enriched