"""
Wallet endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.wallet import WalletResponse, TopUpRequest, TopUpResponse
from app.core.config import settings
import qrcode
import io
import base64
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=WalletResponse)
async def get_balance(userId: int = Query(...), db: Session = Depends(get_db)):
    """Get user wallet balance"""
    wallet = db.query(Wallet).filter(Wallet.user_id == userId).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet


@router.post("/topup", response_model=TopUpResponse)
async def topup_wallet(request: TopUpRequest, db: Session = Depends(get_db)):
    """Initiate wallet top-up"""
    
    # Check user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallet = db.query(Wallet).filter(Wallet.user_id == request.user_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Create transaction
    transaction = Transaction(
        user_id=request.user_id,
        type="topup",
        amount=request.amount,
        balance_before=wallet.balance,
        status="pending"
    )
    db.add(transaction)
    db.flush()
    
    # Generate payment URL and QR code
    payment_url = f"https://pay.yess.kg/tx/{transaction.id}"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(payment_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_data = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
    
    transaction.payment_url = payment_url
    transaction.qr_code_data = qr_code_data
    
    db.commit()
    
    return TopUpResponse(
        transaction_id=transaction.id,
        payment_url=payment_url,
        qr_code_data=qr_code_data
    )


@router.post("/webhook")
async def payment_webhook(
    transaction_id: int,
    status: str,
    amount: float,
    db: Session = Depends(get_db)
):
    """Webhook for payment confirmation"""
    
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status == "completed":
        return {"success": True, "message": "Already processed"}
    
    if status == "completed" and float(transaction.amount) == amount:
        # Update wallet balance (x2 multiplier)
        wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
        bonus_amount = transaction.amount * settings.TOPUP_MULTIPLIER
        
        wallet.balance += bonus_amount
        wallet.last_updated = datetime.utcnow()
        
        # Update transaction
        transaction.status = "completed"
        transaction.completed_at = datetime.utcnow()
        transaction.balance_after = wallet.balance
        
        db.commit()
        
        return {"success": True, "message": "Payment confirmed"}
    
    return {"success": False, "message": "Invalid payment"}


@router.get("/history")
async def get_transaction_history(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Get transaction history"""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).all()
    
    return transactions

