import operator
from typing import Annotated, List, Optional, TypedDict

class TravelState(TypedDict):
    from_location: str
    destination: str
    budget_usd: float
    duration_days: int
    travel_dates: str
    itinerary: str
    travel_mode: str
    total_cost: float
    budget_remaining: float
    rag_tips: List[str]
    weather_adjustments: List[dict]
    revision_count: int
    revision_reason: Optional[str]
    error: Optional[str]
    messages: Annotated[List[dict], operator.add]