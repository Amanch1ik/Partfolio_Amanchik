"""
Order endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.models.order import Order
from app.models.partner import Partner
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.order import (
    OrderCalculateRequest,
    OrderCalculateResponse,
    OrderConfirmRequest,
    OrderConfirmResponse
)
from decimal import Decimal
from datetime import datetime

router = APIRouter()


@router.post("/calculate", response_model=OrderCalculateResponse)
async def calculate_discount(request: OrderCalculateRequest, db: Session = Depends(get_db)):
    """Calculate possible discount (preview)"""
    
    # Get partner
    partner = db.query(Partner).filter(Partner.id == request.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get user wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == request.user_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Calculate max discount by partner percentage
    max_discount_by_percent = request.order_total * (partner.max_discount_percent / 100)
    
    # Actual discount is minimum of: partner max, user balance, order total
    actual_discount = min(
        max_discount_by_percent,
        wallet.balance,
        request.order_total
    )
    
    final_amount = request.order_total - actual_discount
    
    return OrderCalculateResponse(
        max_discount=max_discount_by_percent,
        user_balance=wallet.balance,
        actual_discount=actual_discount,
        final_amount=final_amount
    )


@router.post("/confirm", response_model=OrderConfirmResponse)
async def confirm_order(request: OrderConfirmRequest, db: Session = Depends(get_db)):
    """Confirm order and deduct YessCoin"""
    
    # Check idempotency
    existing_order = db.query(Order).filter(Order.idempotency_key == request.idempotency_key).first()
    if existing_order:
        wallet = db.query(Wallet).filter(Wallet.user_id == request.user_id).first()
        return OrderConfirmResponse(
            success=True,
            message="Order already processed",
            order_id=existing_order.id,
            new_balance=wallet.balance,
            discount=existing_order.discount,
            final_amount=existing_order.final_amount
        )
    
    # Get user
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get partner
    partner = db.query(Partner).filter(
        and_(Partner.id == request.partner_id, Partner.is_active == True)
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == request.user_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Validations
    max_discount_by_percent = request.order_total * (partner.max_discount_percent / 100)
    if request.discount > max_discount_by_percent:
        raise HTTPException(
            status_code=409,
            detail=f"Discount exceeds partner's maximum ({partner.max_discount_percent}%)"
        )
    
    if request.discount > wallet.balance:
        raise HTTPException(status_code=402, detail="Insufficient balance")
    
    if request.discount > request.order_total:
        raise HTTPException(status_code=400, detail="Discount cannot exceed order total")
    
    # Atomic transaction
    try:
        # Deduct from wallet
        old_balance = wallet.balance
        new_balance = old_balance - request.discount
        
        wallet.balance = new_balance
        wallet.last_updated = datetime.utcnow()
        
        # Create order
        order = Order(
            user_id=request.user_id,
            partner_id=request.partner_id,
            order_total=request.order_total,
            discount=request.discount,
            final_amount=request.order_total - request.discount,
            idempotency_key=request.idempotency_key
        )
        db.add(order)
        db.flush()
        
        # Create transaction record
        transaction = Transaction(
            user_id=request.user_id,
            type="discount",
            amount=request.discount,
            balance_before=old_balance,
            balance_after=new_balance,
            status="completed",
            completed_at=datetime.utcnow()
        )
        db.add(transaction)
        
        db.commit()
        
        return OrderConfirmResponse(
            success=True,
            message="Order confirmed successfully",
            order_id=order.id,
            new_balance=new_balance,
            discount=request.discount,
            final_amount=order.final_amount
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")


@router.get("/history")
async def get_order_history(user_id: int, db: Session = Depends(get_db)):
    """Get user's order history"""
    orders = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()
    return orders

