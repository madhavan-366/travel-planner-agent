from langgraph.graph import StateGraph, END
from agent.state import TravelState
from agent.nodes.planner import planner_node
from agent.nodes.tool_executor import tool_executor_node
from agent.nodes.budget_validator import budget_validator_node
from agent.nodes.weather_router import weather_router_node

def should_revise(state: TravelState):
    if state.get("revision_reason") and state.get("revision_count", 0) < 3:
        return "planner"
    return END

workflow = StateGraph(TravelState)

workflow.add_node("planner", planner_node)
workflow.add_node("weather_router", weather_router_node)
workflow.add_node("tool_executor", tool_executor_node)
workflow.add_node("budget_validator", budget_validator_node)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "weather_router")
workflow.add_edge("weather_router", "tool_executor")
workflow.add_edge("tool_executor", "budget_validator")
workflow.add_conditional_edges("budget_validator", should_revise)

graph = workflow.compile()