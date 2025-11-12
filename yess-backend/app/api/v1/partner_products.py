"""API endpoints for partner products"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_db
from app.models.partner_product import PartnerProduct
from app.models.partner import Partner
from app.schemas.partner_product import (
    PartnerProductCreate,
    PartnerProductUpdate,
    PartnerProductResponse,
    PartnerProductListResponse
)
from app.services.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/partners/{partner_id}/products", tags=["Partner Products"])


@router.get("", response_model=PartnerProductListResponse)
async def get_partner_products(
    partner_id: int,
    category: Optional[str] = Query(None, description="Фильтр по категории"),
    is_available: Optional[bool] = Query(None, description="Фильтр по доступности"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Получить список товаров/услуг партнера"""
    # Проверка существования партнера
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Партнер не найден")
    
    # Базовый запрос
    query = db.query(PartnerProduct).filter(PartnerProduct.partner_id == partner_id)
    
    # Фильтры
    if category:
        query = query.filter(PartnerProduct.category == category)
    if is_available is not None:
        query = query.filter(PartnerProduct.is_available == is_available)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    products = query.order_by(PartnerProduct.sort_order, PartnerProduct.name).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    return PartnerProductListResponse(
        items=[PartnerProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{product_id}", response_model=PartnerProductResponse)
async def get_partner_product(
    partner_id: int,
    product_id: int,
    db: Session = Depends(get_db)
):
    """Получить информацию о товаре/услуге"""
    product = db.query(PartnerProduct).filter(
        PartnerProduct.id == product_id,
        PartnerProduct.partner_id == partner_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    return PartnerProductResponse.model_validate(product)


@router.post("", response_model=PartnerProductResponse, status_code=201)
async def create_partner_product(
    partner_id: int,
    product_data: PartnerProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать новый товар/услугу для партнера"""
    # Проверка прав (только владелец партнера или админ)
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Партнер не найден")
    
    # Проверка прав доступа
    if partner.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Создание товара
    product = PartnerProduct(
        partner_id=partner_id,
        **product_data.dict(exclude={"partner_id"})
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return PartnerProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=PartnerProductResponse)
async def update_partner_product(
    partner_id: int,
    product_id: int,
    product_data: PartnerProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить товар/услугу"""
    product = db.query(PartnerProduct).filter(
        PartnerProduct.id == product_id,
        PartnerProduct.partner_id == partner_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    # Проверка прав
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if partner.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Обновление полей
    update_data = product_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    return PartnerProductResponse.model_validate(product)


@router.delete("/{product_id}", status_code=204)
async def delete_partner_product(
    partner_id: int,
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить товар/услугу"""
    product = db.query(PartnerProduct).filter(
        PartnerProduct.id == product_id,
        PartnerProduct.partner_id == partner_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    # Проверка прав
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if partner.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    db.delete(product)
    db.commit()
    
    return None

