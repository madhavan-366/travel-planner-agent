import json
import asyncio
from fastapi import FastAPI, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.graph import graph

load_dotenv()

app = FastAPI(title="Travel Planner Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ItineraryRequest(BaseModel):
    from_location: str
    destination: str
    budget_usd: float
    duration_days: int
    travel_dates: str
    travel_mode: str = "Flight"

def safe_dumps(obj):
    """JSON serialize, converting any non-serializable objects to their string repr."""
    def default(o):
        return str(o)
    return json.dumps(obj, default=default)

class SwapRequest(BaseModel):
    destination: str
    from_location: str
    time: str
    current_activity: str
    travel_dates: str
    budget_usd: float

@app.post("/swap")
async def swap_activity(req: SwapRequest):
    model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.9)
    prompt = (
        f"You are a travel planner. A traveller going from {req.from_location} to {req.destination} "
        f"during {req.travel_dates} with a budget of Rs.{req.budget_usd:,.0f} INR per person "
        f"does NOT want this activity at {req.time}: '{req.current_activity}'.\n"
        "Suggest ONE alternative activity or place for that exact time slot.\n"
        "RULES:\n"
        "- Reply with ONLY the replacement activity text, no explanation, no time prefix\n"
        "- Keep it realistic for the destination and budget\n"
        "- Include cost in INR with Rs. prefix if applicable\n"
        "- Max 120 characters"
    )
    response = model.invoke([("human", prompt)])
    new_activity = response.content.strip().splitlines()[0].strip()
    return {"new_activity": new_activity}

@app.post("/plan")
async def plan_trip(req: ItineraryRequest):
    # 2. Map payload properties directly into LangGraph's engine
    initial_state = {
        "from_location": req.from_location,
        "destination": req.destination,
        "budget_usd": req.budget_usd,
        "duration_days": req.duration_days,
        "travel_dates": req.travel_dates,
        "travel_mode": req.travel_mode,
        "itinerary": "",
        "total_cost": 0.0,
        "budget_remaining": req.budget_usd,
        "rag_tips": [],
        "weather_adjustments": [],
        "revision_count": 0,
        "revision_reason": None,
        "error": None,
        "messages": []
    }

    async def event_generator():
        try:
            async for chunk in graph.astream(initial_state, stream_mode="updates"):
                for node_name, output in chunk.items():
                    if not isinstance(output, dict):
                        continue
                    itinerary = output.get("itinerary")
                    weather_adjustments = output.get("weather_adjustments")
                    if itinerary and isinstance(itinerary, str):
                        payload = {
                            "node": node_name,
                            "output": {
                                "itinerary": itinerary,
                                "weather_adjustments": weather_adjustments or []
                            }
                        }
                        yield f"data: {safe_dumps(payload)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {safe_dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)