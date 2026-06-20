from agent.state import TravelState
from rag.retriever import retrieve_tips

async def tool_executor_node(state: TravelState):
    dest = state["destination"]
    dest_lower = dest.lower().strip()
    budget = float(state["budget_usd"])
    duration = int(state["duration_days"])

    # Fetch RAG tips from ChromaDB
    daily_budget = budget / duration
    tier = "budget" if daily_budget < 2000 else "mid" if daily_budget < 5000 else "luxury"
    try:
        tips = await retrieve_tips(dest, tier)
    except Exception:
        tips = ["Tip: Look for local public transport passes to save up to 40%!"]

    # Simulate a total cost estimate based on destination multiplier
    multipliers = {
        "tokyo": 1.3, "japan": 1.3,
        "paris": 1.5, "london": 1.6,
        "new york": 1.8, "dubai": 1.4,
        "bali": 0.5, "chennai": 0.4, "ooty": 0.3
    }
    cost_factor = next((v for k, v in multipliers.items() if k in dest_lower), 1.0)
    estimated_cost = round(budget * cost_factor * 0.85, 2)

    # itinerary is already a markdown string from planner_node — pass it through unchanged
    return {
        "itinerary": state["itinerary"],
        "total_cost": estimated_cost,
        "rag_tips": tips,
        "budget_remaining": round(budget - estimated_cost, 2)
    }