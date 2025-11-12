"""
QR Code Service
Генерация и обработка QR кодов для оплаты
"""
import json
import qrcode
from io import BytesIO
from datetime import datetime
from typing import Dict, Optional
from fastapi import HTTPException
from app.core.storage import file_storage
import logging

logger = logging.getLogger(__name__)


class QRCodeService:
    """Сервис для работы с QR кодами"""
    
    async def generate_partner_qr(
        self, 
        partner_id: int,
        partner_name: str
    ) -> str:
        """
        Генерация QR кода для партнёра
        Возвращает URL сохранённого QR кода
        """
        try:
            # Данные для QR кода
            qr_data = {
                "type": "partner_payment",
                "partner_id": partner_id,
                "partner_name": partner_name,
                "version": "1.0",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Сериализуем в JSON
            data_string = json.dumps(qr_data)
            
            # Создаем QR код
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_H,
                box_size=10,
                border=4,
            )
            qr.add_data(data_string)
            qr.make(fit=True)
            
            # Генерируем изображение
            img = qr.make_image(fill_color="#00A86B", back_color="white")
            
            # Сохраняем в BytesIO
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Создаем временный UploadFile-подобный объект
            class QRFile:
                def __init__(self, buffer):
                    self.file = buffer
                    self.filename = f"qr_partner_{partner_id}.png"
                    self.content_type = "image/png"
                    self.size = buffer.getbuffer().nbytes
                
                async def read(self):
                    return self.file.read()
            
            qr_file = QRFile(buffer)
            
            # Сохраняем через FileStorage
            filename = f"partner_{partner_id}_qr.png"
            url = await file_storage.save_file(qr_file, folder="qrcodes", filename=filename)
            
            logger.info(f"QR code generated for partner {partner_id}: {url}")
            return url
        
        except Exception as e:
            logger.error(f"Failed to generate QR code: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")
    
    async def parse_qr_data(self, qr_data: str) -> Dict:
        """
        Парсинг данных из QR кода
        """
        try:
            data = json.loads(qr_data)
            
            # Валидация
            if data.get("type") != "partner_payment":
                raise HTTPException(
                    status_code=400,
                    detail="Invalid QR code type"
                )
            
            if "partner_id" not in data:
                raise HTTPException(
                    status_code=400,
                    detail="Missing partner_id in QR code"
                )
            
            return {
                "partner_id": data["partner_id"],
                "partner_name": data.get("partner_name"),
                "version": data.get("version", "1.0")
            }
        
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid QR code format"
            )
    
    async def validate_qr_for_payment(
        self, 
        partner_id: int,
        user_balance: float,
        min_amount: float = 1.0
    ) -> Dict:
        """
        Валидация QR кода для оплаты
        """
        # Проверка баланса
        if user_balance < min_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Minimum: {min_amount} YesCoin"
            )
        
        return {
            "valid": True,
            "partner_id": partner_id,
            "user_balance": user_balance,
            "message": "QR code is valid for payment"
        }


# Singleton instance
qr_service = QRCodeService()

