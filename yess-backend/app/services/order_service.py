"""Order service for handling orders with products"""
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
import secrets

from app.models.order import Order, OrderStatus, OrderItem
from app.models.partner_product import PartnerProduct
from app.models.partner import Partner
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.order import OrderItemCreate, OrderCreateRequest
from app.core.exceptions import NotFoundException, ValidationException


class OrderService:
    """Service for order management"""
    
    @staticmethod
    def calculate_order(
        db: Session,
        partner_id: int,
        items: List[OrderItemCreate],
        user_id: Optional[int] = None
    ) -> Dict:
        """Calculate order totals"""
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        if not partner:
            raise NotFoundException("Партнер не найден")
        
        if not partner.is_active:
            raise ValidationException("Партнер неактивен")
        
        order_total = Decimal(0)
        order_items_data = []
        
        # Расчет суммы товаров
        for item in items:
            product = db.query(PartnerProduct).filter(
                PartnerProduct.id == item.product_id,
                PartnerProduct.partner_id == partner_id,
                PartnerProduct.is_available == True
            ).first()
            
            if not product:
                raise NotFoundException(f"Товар {item.product_id} не найден или недоступен")
            
            # Проверка наличия
            if product.stock_quantity is not None and product.stock_quantity < item.quantity:
                raise ValidationException(f"Недостаточно товара {product.name}. Доступно: {product.stock_quantity}")
            
            # Расчет цены с учетом скидки
            price = product.price
            if product.discount_percent > 0:
                price = price * (1 - product.discount_percent / 100)
            
            subtotal = price * item.quantity
            order_total += subtotal
            
            order_items_data.append({
                "product": product,
                "quantity": item.quantity,
                "price": price,
                "subtotal": subtotal,
                "notes": item.notes
            })
        
        # Расчет скидки (максимальная скидка партнера)
        max_discount = order_total * (partner.max_discount_percent / 100)
        discount = Decimal(0)  # Пока без скидки, можно добавить логику промокодов
        
        # Расчет кэшбэка
        cashback_rate = partner.cashback_rate or partner.default_cashback_rate or Decimal(5.0)
        cashback_amount = order_total * (cashback_rate / 100)
        
        # Итоговая сумма
        final_amount = order_total - discount
        
        # Получение баланса пользователя (если указан)
        user_balance = None
        if user_id:
            wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
            if wallet:
                user_balance = wallet.balance
        
        return {
            "order_total": order_total,
            "discount": discount,
            "cashback_amount": cashback_amount,
            "final_amount": final_amount,
            "max_discount": max_discount,
            "user_balance": user_balance,
            "items_data": order_items_data
        }
    
    @staticmethod
    def create_order(
        db: Session,
        user_id: int,
        order_request: OrderCreateRequest
    ) -> Order:
        """Create a new order"""
        # Проверка идемпотентности
        existing_order = db.query(Order).filter(
            Order.idempotency_key == order_request.idempotency_key
        ).first()
        
        if existing_order:
            return existing_order
        
        # Расчет заказа
        calculation = OrderService.calculate_order(
            db=db,
            partner_id=order_request.partner_id,
            items=order_request.items,
            user_id=user_id
        )
        
        # Создание заказа
        order = Order(
            user_id=user_id,
            partner_id=order_request.partner_id,
            order_total=calculation["order_total"],
            discount=calculation["discount"],
            cashback_amount=calculation["cashback_amount"],
            final_amount=calculation["final_amount"],
            status=OrderStatus.PENDING,
            delivery_address=order_request.delivery_address,
            delivery_type=order_request.delivery_type,
            delivery_notes=order_request.delivery_notes,
            payment_status="pending",
            idempotency_key=order_request.idempotency_key
        )
        
        db.add(order)
        db.flush()  # Получаем ID заказа
        
        # Создание элементов заказа
        for item_data in calculation["items_data"]:
            product = item_data["product"]
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_price=item_data["price"],
                quantity=item_data["quantity"],
                subtotal=item_data["subtotal"],
                notes=item_data.get("notes")
            )
            db.add(order_item)
            
            # Обновление остатков
            if product.stock_quantity is not None:
                product.stock_quantity -= item_data["quantity"]
        
        db.commit()
        db.refresh(order)
        
        return order
    
    @staticmethod
    def generate_idempotency_key(user_id: int, partner_id: int, items: List[OrderItemCreate]) -> str:
        """Generate idempotency key for order"""
        items_str = ",".join([f"{i.product_id}:{i.quantity}" for i in sorted(items, key=lambda x: x.product_id)])
        data = f"{user_id}:{partner_id}:{items_str}:{datetime.utcnow().isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()

