from agent.state import TravelState

async def budget_validator_node(state: TravelState):
    total = state["total_cost"]
    limit = state["budget_usd"]
    count = state.get("revision_count", 0)
    
    if total > limit:
        over_amt = total - limit
        pct = (over_amt / limit) * 100
        
        # Determine most expensive category for feedback
        # Logic: If accommodation > 50% of total, target that
        reason = f"Plan is ₹{over_amt:,.0f} ({pct:.1f}%) over budget. "
        
        # Identify the heavy hitters
        reason += "Please find cheaper local stays or more free activities."
        
        return {
            "revision_reason": reason,
            "revision_count": count + 1
        }
    
    # If budget is okay, clear the revision reason to end the loop
    return {"revision_reason": None}