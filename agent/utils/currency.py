import requests

def get_exchange_rate(target_currency: str) -> float:
    """
    Fetches the live exchange rate from INR to the target currency.
    Returns 1.0 if it fails or if the target is INR.
    """
    if target_currency.upper() == "INR":
        return 1.0
    
    try:
        # 100% free open-source exchange registry endpoint
        url = "https://open.er-api.com/v6/latest/INR"
        response = requests.get(url, timeout=5).json()
        rates = response.get("rates", {})
        return float(rates.get(target_currency.upper(), 1.0))
    except Exception:
        # Fallback rates in case internet drops
        fallbacks = {"JPY": 1.90, "USD": 0.012, "EUR": 0.011}
        return fallbacks.get(target_currency.upper(), 1.0)

def detect_currency_by_destination(destination: str) -> str:
    """Guesses target currency string based on destination keyword"""
    dest = destination.lower()
    if any(k in dest for k in ["tokyo", "japan", "osaka", "kyoto"]):
        return "JPY"
    if any(k in dest for k in ["usa", "new york", "california", "las vegas", "miami"]):
        return "USD"
    if any(k in dest for k in ["europe", "paris", "france", "germany", "italy", "spain", "amsterdam"]):
        return "EUR"
    if any(k in dest for k in ["london", "uk", "england", "scotland"]):
        return "GBP"
    if any(k in dest for k in ["dubai", "abu dhabi", "uae"]):
        return "AED"
    if any(k in dest for k in ["singapore"]):
        return "SGD"
    if any(k in dest for k in ["thailand", "bangkok", "phuket"]):
        return "THB"
    if any(k in dest for k in ["bali", "indonesia"]):
        return "IDR"
    if any(k in dest for k in ["malaysia", "kuala lumpur"]):
        return "MYR"
    return "INR"  # Default local fallback