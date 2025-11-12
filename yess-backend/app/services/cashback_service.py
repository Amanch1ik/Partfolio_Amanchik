"""Service for cashback calculation and distribution"""
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime

from app.models.order import Order
from app.models.partner import Partner
from app.models.wallet import Wallet
from app.models.transaction import Transaction


class CashbackService:
    """Service for managing cashback"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def calculate_and_add_cashback(
        self,
        user_id: int,
        order_id: int,
        order_amount: float
    ):
        """Calculate and add cashback for completed order"""
        # Получение заказа
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return
        
        # Получение партнера
        partner = self.db.query(Partner).filter(Partner.id == order.partner_id).first()
        if not partner:
            return
        
        # Расчет кэшбэка
        cashback_rate = partner.cashback_rate or partner.default_cashback_rate or Decimal(5.0)
        cashback_amount = Decimal(order_amount) * (cashback_rate / 100)
        
        # Обновление заказа
        order.cashback_amount = cashback_amount
        
        # Начисление на кошелек
        wallet = self.db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if wallet:
            wallet.balance += float(cashback_amount)
        else:
            wallet = Wallet(user_id=user_id, balance=float(cashback_amount))
            self.db.add(wallet)
        
        # Создание транзакции кэшбэка
        cashback_transaction = Transaction(
            user_id=user_id,
            amount=float(cashback_amount),
            commission=0.0,
            payment_method="cashback",
            status="success",
            order_id=order_id,
            created_at=datetime.utcnow()
        )
        self.db.add(cashback_transaction)
        
        self.db.commit()
        
        return cashback_amount

