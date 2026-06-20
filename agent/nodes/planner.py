from langchain_google_genai import ChatGoogleGenerativeAI
from agent.state import TravelState
from agent.utils.currency import get_exchange_rate, detect_currency_by_destination

def planner_node(state: TravelState):
    print("--- STARTING AGENTIC TRANSIT PLANNER ---")
    
    # Extract structural arguments
    from_loc = state.get("from_location", "Chennai")
    to_loc = state.get("destination", "Tokyo")
    budget_inr = float(state.get("budget_usd", 50000))
    duration = state.get("duration_days", 3)
    dates = state.get("travel_dates", "Flexible")
    travel_mode = state.get("travel_mode", "Flight")
    
    # 1. Calculate Currency Conversions dynamically
    target_curr = detect_currency_by_destination(to_loc)
    rate = get_exchange_rate(target_curr)
    converted_budget = budget_inr * rate
    
    # Initialize the Free Gemini Tier Engine
    model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
    
    # 2. Advanced Multi-City Logistics System Instructions
    system_prompt = (
        "You are an expert travel planner. Output the itinerary in STRICT structured format only.\n\n"
        "FORMAT RULES — follow exactly:\n"
        "Line 1: ## TRIP SUMMARY\n"
        "Then write 4-6 lines of summary: origin, destination, budget, transport overview, total days.\n"
        "Then for each day use this exact block:\n\n"
        "## Day N: <Theme Title>\n"
        "06:00 | <activity or travel detail with ticket price if applicable>\n"
        "08:00 | <activity>\n"
        "10:00 | <activity>\n"
        "12:00 | <Lunch: restaurant name and cost>\n"
        "14:00 | <activity>\n"
        "16:00 | <activity>\n"
        "19:00 | <Dinner: restaurant name and cost>\n"
        "21:00 | <Hotel check-in: hotel name, cost per night in INR>\n\n"
        "STRICT RULES:\n"
        "- Every timed line MUST use format HH:MM | description\n"
        "- NEVER write paragraphs or prose\n"
        "- NEVER skip the time prefix\n"
        "- Include train/flight/bus name and per-person ticket price on Day 1 departure entry\n"
        f"- TRAVEL MODE: {travel_mode}. If train or bus, Day 1 is TRAVEL DAY — board at departure city, arrive at destination. Show exact train/bus name, departure time, arrival time, ticket cost.\n"
        f"- If travel takes overnight (e.g. overnight train), Day 2 morning starts at destination.\n"
        f"- From: {from_loc} → To: {to_loc}, Duration: {duration} days, Dates: {dates}\n"
        f"- Budget: ₹{budget_inr:,} INR (≈ {converted_budget:,.0f} {target_curr})\n"
        "- All costs in INR with ₹ symbol"
    )
    
    user_prompt = f"Generate an optimized logistics travel plan from {from_loc} to {to_loc}."
    
    # Execute AI loop
    messages = [
        ("system", system_prompt),
        ("human", user_prompt)
    ]
    response = model.invoke(messages)
    
    print("--- COMPLETED AGENTIC TRANSIT PLANNER ---")
    return {"messages": [response], "itinerary": response.content}