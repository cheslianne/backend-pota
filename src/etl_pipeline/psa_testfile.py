import requests
from decimal import Decimal
from datetime import date
import re

from .load import load_price_data


API_URL = (
    "https://openstat.psa.gov.ph:443/"
    "PXWeb/api/v1/en/DB/2M/NFG/0032M4AFN05.px"
)


query = {
    "query": [
        {
            "code": "Geolocation",
            "selection": {
                "filter": "item",
                "values": ["25"]
            }
        },
        {
            "code": "Commodity",
            "selection": {
                "filter": "item",
                "values": ["13"]
            }
        },
        {
            "code": "Year",
            "selection": {
                "filter": "item",
                "values": ["16"]
            }
        },
        {
            "code": "Period",
            "selection": {
                "filter": "item",
                "values": [
                    "0", "1", "2", "3",
                    "4", "5", "6", "7",
                    "8", "9", "10", "11"
                ]
            }
        }
    ],
    "response": {
        "format": "px"
    }
}


response = requests.post(
    API_URL,
    json=query,
    headers={
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }
)

print("STATUS CODE:", response.status_code)

if response.status_code != 200:
    print(response.text)
    raise SystemExit


px_text = response.text


# Get year
year_match = re.search(
    r'VALUES\("Year"\)="(\d{4})";',
    px_text
)

year = int(year_match.group(1))


# Get commodity
commodity_match = re.search(
    r'VALUES\("Commodity"\)="([^"]+)";',
    px_text
)

commodity = commodity_match.group(1)


# Get DATA section
data_match = re.search(
    r'DATA=\s*(.*?)\s*;',
    px_text,
    re.DOTALL
)

if not data_match:
    print("No DATA section found.")
    raise SystemExit


data_line = data_match.group(1).strip()
data_line = data_line.replace("\n", " ").strip()

values = data_line.split()


months = [
    1, 2, 3, 4, 5, 6,
    7, 8, 9, 10, 11, 12
]


records = []


for month, value in zip(months, values):

    if value == '".."':
        continue

    price = Decimal(value)

    record = {
        "commodity": commodity,
        "price_per_kg": price,
        "record_date": date(year, month, 1)
    }

    records.append(record)


print()
print("PSA FARMGATE DATA")
print("-----------------")
print(f"Commodity: {commodity}")
print(f"Year: {year}")
print(f"Records fetched: {len(records)}")
print()


for record in records:
    print(record)


# ============================================================
# LOAD TO DATABASE
# ============================================================

print()
print("LOADING TO DATABASE...")

inserted = load_price_data(records)

print(f"Records loaded: {inserted}")