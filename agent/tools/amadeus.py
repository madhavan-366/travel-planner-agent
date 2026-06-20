import os
from dotenv import load_dotenv

load_dotenv()

# Simplified Amadeus wrapper
async def get_hotel(destination, hotel_name):
    # In production, use amadeus.shopping.hotel_offers_search
    # Returning mock/fallback for demo structure consistency
    return {
        "name": hotel_name,
        "price_per_night": 120.0,
        "hotel_id": "AMAD123"
    }

async def get_flight(destination, dates):
    # In production, use amadeus.shopping.flight_offers_search
    return {
        "type": "flight",
        "cost": 450.0,
        "flight_id": "FL789"
    }