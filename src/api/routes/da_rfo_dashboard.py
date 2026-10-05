"""Regional, PII-free aggregates for the DA-RFO landing dashboard."""

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.core.database import get_db
from src.models.etl_run_log import ETLRunLog
from src.models.farmers import Farmer
from src.models.market_price import MarketPrice
from src.models.offtake_requests import OfftakeRequest
from src.models.planting_intents import PlantingIntent
from src.models.raw_plant_reports import RawPlantReport
from src.models.report_status import ReportStatus
from src.models.report_submission import ReportSubmission
from src.models.users import User

router = APIRouter()
DA_RFO_ROLES = {"DA-RFO Officer", "Regional Coordinator", "DA-RFO"}
COMMODITIES = ("Red Onion", "White Onion", "Tomato", "Squash")


def _commodity(value: str | None) -> str | None:
    text = (value or "").strip().lower()
    for name in COMMODITIES:
        if name.lower() in text:
            return name
    if "kalabasa" in text:
        return "Squash"
    return None


def _number(value) -> float:
    return round(float(value or 0), 2)


def _iso(value) -> str | None:
    return value.isoformat() if value else None


@router.get("")
def get_da_rfo_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return regional aggregates only; no person, buyer, or report identifiers."""
    if current_user.role not in DA_RFO_ROLES:
        raise HTTPException(status_code=403, detail="Access denied.")

    today = date.today()
    horizon = today + timedelta(days=30)
    farmers = db.query(Farmer).all()
    farmer_ids = [farmer.farmer_id for farmer in farmers]
    intents = (
        db.query(PlantingIntent).filter(PlantingIntent.farmer_id.in_(farmer_ids)).all()
        if farmer_ids else []
    )
    offtakes = (
        db.query(OfftakeRequest).filter(OfftakeRequest.farmer_id.in_(farmer_ids)).all()
        if farmer_ids else []
    )
    active_intents = [
        row for row in intents
        if (row.status or "DRAFT").upper() != "DRAFT"
        and (row.finalized_status or "").upper() in {"NOT PLANTED", "PLANTED", "MEDIATING"}
    ]
    open_offtakes = [row for row in offtakes if row.harvest_date >= today]

    submissions = db.query(ReportSubmission).all()
    report_counts = defaultdict(int)
    for row in submissions:
        status = (row.status or "DRAFT").upper()
        if status == ReportStatus.SUBMITTED_MUNICIPAL_PENDING.value:
            report_counts["municipal_pending"] += 1
        elif status == ReportStatus.SUBMITTED_PROVINCIAL_PENDING.value:
            report_counts["provincial_pending"] += 1
        elif status == ReportStatus.SUBMITTED_REGIONAL_PENDING.value:
            report_counts["regional_pending"] += 1
        elif status in {
            ReportStatus.SUBMITTED_MUNICIPAL_FLAGGED.value,
            ReportStatus.SUBMITTED_PROVINCIAL_FLAGGED.value,
            ReportStatus.SUBMITTED_REGIONAL_FLAGGED.value,
        }:
            report_counts["flagged"] += 1
        elif status == ReportStatus.SUBMITTED_REGIONAL_APPROVED.value:
            report_counts["approved"] += 1
        elif status == ReportStatus.DRAFT.value:
            report_counts["draft"] += 1

    supply = defaultdict(float)
    demand = defaultdict(float)
    for row in active_intents:
        key = ((row.farmer.municipality if row.farmer else "Unknown"), _commodity(row.commodity))
        if key[1]:
            supply[key] += _number(row.volume)
    for row in open_offtakes:
        key = ((row.farmer.municipality if row.farmer else "Unknown"), _commodity(row.commodity))
        if key[1]:
            demand[key] += _number(row.quantity)

    supply_risk = []
    alerts = []
    for (municipality, commodity), volume in sorted(supply.items()):
        expected_demand = demand[(municipality, commodity)]
        if expected_demand == 0:
            status = "NO_DEMAND"
        elif volume > expected_demand * 1.2:
            status = "SURPLUS"
        elif volume < expected_demand * 0.8:
            status = "DEFICIT"
        else:
            status = "BALANCED"
        supply_risk.append({
            "municipality": municipality,
            "commodity": commodity,
            "supply_30d_kg": volume,
            "demand_30d_kg": expected_demand,
            "status": status,
        })
        if status in {"SURPLUS", "DEFICIT"}:
            alerts.append({
                "type": "supply_risk",
                "severity": "high" if status == "DEFICIT" else "medium",
                "municipality": municipality,
                "commodity": commodity,
                "message": f"{status.title()} risk for {commodity}.",
            })

    prices = []
    for commodity in COMMODITIES:
        rows = sorted(
            (row for row in db.query(MarketPrice).all() if _commodity(row.commodity) == commodity),
            key=lambda row: row.record_date,
        )
        latest = rows[-1] if rows else None
        previous = rows[-2] if len(rows) > 1 else None
        delta = (
            _number(latest.wholesale_price_per_kg) - _number(previous.wholesale_price_per_kg)
            if latest and previous else 0
        )
        prices.append({
            "commodity": commodity,
            "wholesale_price_per_kg": _number(latest.wholesale_price_per_kg) if latest else None,
            "retail_price_per_kg": _number(latest.retail_price_per_kg) if latest else None,
            "record_date": _iso(latest.record_date) if latest else None,
            "trend": "up" if delta > 0 else "down" if delta < 0 else "steady",
        })

    etl = []
    for row in db.query(ETLRunLog).order_by(ETLRunLog.run_date_time.desc()).limit(5).all():
        etl.append({
            "data_source": row.data_source,
            "status": row.status,
            "run_date_time": _iso(row.run_date_time),
        })

    flagged = report_counts["flagged"]
    if flagged:
        alerts.append({
            "type": "report_pipeline",
            "severity": "medium",
            "message": f"{flagged} report(s) require revision.",
        })

    return {
        "scope": "DA-RFO",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "kpis": {
            "registered_farmers": len(farmers),
            "municipalities": len({farmer.municipality for farmer in farmers if farmer.municipality}),
            "active_planting_intents": len(active_intents),
            "expected_harvest_30d_kg": _number(sum(
                row.volume for row in active_intents
                if today <= row.harvest_date <= horizon
            )),
            "open_offtake_requests": len(open_offtakes),
            "reports_pending": report_counts["municipal_pending"] + report_counts["provincial_pending"] + report_counts["regional_pending"],
            "reports_approved": report_counts["approved"],
            "alerts": len(alerts),
        },
        "actions": [
            {"type": "regional_validation", "label": "Reports awaiting regional validation", "count": report_counts["regional_pending"]},
            {"type": "revision_queue", "label": "Reports flagged for revision", "count": flagged},
            {"type": "supply_risk", "label": "Municipality-commodity risks", "count": sum(1 for item in supply_risk if item["status"] in {"SURPLUS", "DEFICIT"})},
        ],
        "supply_risk": supply_risk,
        "alerts": alerts,
        "prices": prices,
        "etl": etl,
        "report_pipeline": dict(report_counts),
        "summary": {
            "active_municipalities": len({item["municipality"] for item in supply_risk}),
            "commodities_tracked": len({item["commodity"] for item in supply_risk}),
            "window_days": 30,
        },
    }
