from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.services.proximity_marketing_service import proximity_marketing_service

router = APIRouter(prefix="/location", tags=["Location"])

@router.post("/proximity-check")
async def check_proximity_offers(
    location_data: Dict[str, float],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Проверка proximity-предложений от партнеров
    
    Параметры:
    - latitude: широта
    - longitude: долгота
    """
    try:
        # Валидация входных данных
        if not all(key in location_data for key in ['latitude', 'longitude']):
            raise HTTPException(status_code=400, detail="Требуются координаты")
        
        # Вызов сервиса proximity-маркетинга
        await proximity_marketing_service.check_nearby_partners(
            user=current_user,
            current_location={
                'latitude': location_data['latitude'],
                'longitude': location_data['longitude']
            },
            db=db
        )
        
        return {
            "status": "success", 
            "message": "Proximity-проверка выполнена"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
