from datetime import datetime, timedelta
from typing import Dict, Optional

from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User, TokenBlacklist
from app.schemas.token import TokenPayload

class TokenService:
    @staticmethod
    def create_access_token(
        data: Dict[str, str], 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Создание access токена"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.SECRET_KEY, 
            algorithm="HS256"
        )
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(
        data: Dict[str, str], 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Создание refresh токена"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.SECRET_KEY, 
            algorithm="HS256"
        )
        return encoded_jwt
    
    @classmethod
    def decode_token(
        cls, 
        token: str, 
        db: Session
    ) -> Optional[TokenPayload]:
        """Декодирование и валидация токена"""
        try:
            # Проверка наличия токена в черном списке
            blacklisted = db.query(TokenBlacklist).filter(
                TokenBlacklist.token == token
            ).first()
            
            if blacklisted:
                return None
            
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=["HS256"]
            )
            
            return TokenPayload(**payload)
        
        except JWTError:
            return None
    
    @classmethod
    def refresh_tokens(
        cls, 
        refresh_token: str, 
        db: Session
    ) -> Optional[Dict[str, str]]:
        """Обновление токенов"""
        token_payload = cls.decode_token(refresh_token, db)
        
        if not token_payload or token_payload.type != "refresh":
            return None
        
        # Проверка существования пользователя
        user = db.query(User).filter(
            User.id == token_payload.sub
        ).first()
        
        if not user:
            return None
        
        # Создание новых токенов
        access_token = cls.create_access_token(
            {"sub": str(user.id), "username": user.username}
        )
        new_refresh_token = cls.create_refresh_token(
            {"sub": str(user.id), "username": user.username}
        )
        
        # Добавление старого токена в черный список
        blacklist_token = TokenBlacklist(
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(
                minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
            )
        )
        db.add(blacklist_token)
        db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    @classmethod
    def revoke_tokens(
        cls, 
        user_id: int, 
        db: Session
    ) -> None:
        """Отзыв всех токенов пользователя"""
        # Добавление всех активных токенов в черный список
        # Здесь может быть реализована более сложная логика
        db.query(TokenBlacklist).filter(
            TokenBlacklist.user_id == user_id
        ).delete()
        
        db.commit()

token_service = TokenService()
