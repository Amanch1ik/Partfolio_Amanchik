"""
File Upload API
Загрузка аватаров, логотипов, изображений
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.partner import Partner
from app.api.v1.auth import get_current_user
from app.core.storage import file_storage
from app.core.rate_limit import upload_rate_limit
from app.core.cache import redis_cache
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["File Upload"])


@router.post("/avatar")
@upload_rate_limit()
async def upload_avatar(
    request: Request,
    file: UploadFile = File(..., description="Изображение профиля"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Загрузка аватара пользователя
    
    Принимает: JPG, JPEG, PNG, GIF, WEBP
    Максимальный размер: 10MB
    """
    # Сохраняем файл
    try:
        url = await file_storage.save_file(file, folder="profiles")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to save avatar: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save avatar")
    
    # Удаляем старый аватар
    if current_user.avatar_url:
        await file_storage.delete_file(current_user.avatar_url)
    
    # Обновляем пользователя
    current_user.avatar_url = url
    db.commit()
    
    # Инвалидируем кэш
    await redis_cache.invalidate_user_cache(current_user.id)
    
    logger.info(f"User {current_user.id} uploaded new avatar: {url}")
    
    return {
        "success": True,
        "avatar_url": url,
        "message": "Avatar uploaded successfully"
    }


@router.post("/partner/logo/{partner_id}")
@upload_rate_limit()
async def upload_partner_logo(
    request: Request,
    partner_id: int,
    file: UploadFile = File(..., description="Логотип партнёра"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Загрузка логотипа партнёра
    
    Доступно только владельцу партнёра или администратору
    """
    # Получаем партнёра
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Проверка прав
    if partner.owner_id != current_user.id:
        # TODO: Проверить роль админа
        raise HTTPException(
            status_code=403,
            detail="Only partner owner can upload logo"
        )
    
    # Сохраняем файл
    try:
        url = await file_storage.save_file(file, folder="partners")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to save partner logo: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save logo")
    
    # Удаляем старый логотип
    if partner.logo_url:
        await file_storage.delete_file(partner.logo_url)
    
    # Обновляем партнёра
    partner.logo_url = url
    db.commit()
    
    # Инвалидируем кэш
    await redis_cache.invalidate_partner_cache(partner_id)
    
    logger.info(f"Partner {partner_id} uploaded new logo: {url}")
    
    return {
        "success": True,
        "logo_url": url,
        "message": "Logo uploaded successfully"
    }


@router.post("/partner/cover/{partner_id}")
@upload_rate_limit()
async def upload_partner_cover(
    request: Request,
    partner_id: int,
    file: UploadFile = File(..., description="Обложка партнёра"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Загрузка обложки партнёра
    """
    # Получаем партнёра
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Проверка прав
    if partner.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only partner owner can upload cover"
        )
    
    # Сохраняем файл
    try:
        url = await file_storage.save_file(file, folder="partners")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to save partner cover: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save cover")
    
    # Удаляем старую обложку
    if partner.cover_image_url:
        await file_storage.delete_file(partner.cover_image_url)
    
    # Обновляем партнёра
    partner.cover_image_url = url
    db.commit()
    
    # Инвалидируем кэш
    await redis_cache.invalidate_partner_cache(partner_id)
    
    logger.info(f"Partner {partner_id} uploaded new cover: {url}")
    
    return {
        "success": True,
        "cover_url": url,
        "message": "Cover uploaded successfully"
    }


@router.delete("/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Удаление аватара пользователя
    """
    if not current_user.avatar_url:
        raise HTTPException(status_code=404, detail="No avatar to delete")
    
    # Удаляем файл
    await file_storage.delete_file(current_user.avatar_url)
    
    # Обновляем пользователя
    current_user.avatar_url = None
    db.commit()
    
    # Инвалидируем кэш
    await redis_cache.invalidate_user_cache(current_user.id)
    
    return {
        "success": True,
        "message": "Avatar deleted successfully"
    }

