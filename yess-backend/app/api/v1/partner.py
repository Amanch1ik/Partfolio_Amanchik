"""
Partner endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.models.partner import Partner, PartnerLocation
from app.schemas.partner import PartnerResponse, PartnerLocationResponse
from typing import List, Optional

router = APIRouter()


@router.get("/list", response_model=List[PartnerResponse])
async def get_partners(
    category: Optional[str] = None,
    active: bool = True,
    db: Session = Depends(get_db)
):
    """Get list of partners"""
    query = db.query(Partner)
    
    if active:
        query = query.filter(Partner.is_active == True)
    if category:
        query = query.filter(Partner.category == category)
    
    partners = query.all()
    return partners


@router.get("/{partner_id}", response_model=PartnerResponse)
async def get_partner(partner_id: int, db: Session = Depends(get_db)):
    """Get partner details"""
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner


@router.get("/locations", response_model=List[PartnerLocationResponse])
async def get_partner_locations(
    partner_id: Optional[int] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: float = 10.0,
    db: Session = Depends(get_db)
):
    """Get partner locations for map"""
    query = db.query(PartnerLocation).join(Partner).filter(PartnerLocation.is_active == True)
    
    if partner_id:
        query = query.filter(PartnerLocation.partner_id == partner_id)
    
    # TODO: Add geographic filtering by radius
    # For now, return all active locations
    
    locations = query.all()
    
    # Build response with partner info
    result = []
    for loc in locations:
        result.append({
            "id": loc.id,
            "partner_id": loc.partner_id,
            "partner_name": loc.partner.name,
            "address": loc.address,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "phone_number": loc.phone_number,
            "working_hours": loc.working_hours,
            "max_discount_percent": loc.partner.max_discount_percent
        })
    
    return result


@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get list of partner categories"""
    categories = db.query(Partner.category).distinct().all()
    return [{"name": cat[0]} for cat in categories if cat[0]]

