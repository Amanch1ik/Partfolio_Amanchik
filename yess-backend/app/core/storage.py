"""
File Storage Utilities
Поддержка локального хранения и AWS S3
"""
import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class FileStorage:
    """Класс для управления загрузкой файлов"""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.use_s3 = settings.USE_S3
        
        # Создаем директории для загрузки
        for subdir in ['profiles', 'partners', 'qrcodes', 'temp']:
            (self.upload_dir / subdir).mkdir(parents=True, exist_ok=True)
    
    def validate_file(self, file: UploadFile) -> None:
        """Валидация загружаемого файла"""
        # Проверка размера
        if file.size and file.size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
            )
        
        # Проверка расширения
        if file.filename:
            ext = file.filename.split('.')[-1].lower()
            if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
                )
    
    async def save_file(
        self, 
        file: UploadFile, 
        folder: str = "temp",
        filename: Optional[str] = None
    ) -> str:
        """
        Сохранение файла локально или в S3
        Возвращает URL файла
        """
        self.validate_file(file)
        
        # Генерируем уникальное имя файла
        if not filename:
            ext = file.filename.split('.')[-1].lower() if file.filename else 'jpg'
            filename = f"{uuid.uuid4()}.{ext}"
        
        if self.use_s3:
            return await self._save_to_s3(file, folder, filename)
        else:
            return await self._save_locally(file, folder, filename)
    
    async def _save_locally(self, file: UploadFile, folder: str, filename: str) -> str:
        """Сохранение файла локально"""
        file_path = self.upload_dir / folder / filename
        
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Возвращаем относительный URL
            return f"{settings.STATIC_URL}/{folder}/{filename}"
        
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save file")
    
    async def _save_to_s3(self, file: UploadFile, folder: str, filename: str) -> str:
        """Сохранение файла в AWS S3"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            
            object_key = f"{folder}/{filename}"
            content = await file.read()
            
            s3_client.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=object_key,
                Body=content,
                ContentType=file.content_type or 'image/jpeg'
            )
            
            # Возвращаем публичный URL
            return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{object_key}"
        
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload to S3")
    
    async def delete_file(self, file_url: str) -> bool:
        """Удаление файла"""
        if self.use_s3:
            return await self._delete_from_s3(file_url)
        else:
            return await self._delete_locally(file_url)
    
    async def _delete_locally(self, file_url: str) -> bool:
        """Удаление локального файла"""
        try:
            # Извлекаем путь из URL
            path_parts = file_url.replace(settings.STATIC_URL + '/', '').split('/')
            file_path = self.upload_dir / '/'.join(path_parts)
            
            if file_path.exists():
                os.remove(file_path)
                return True
            return False
        
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            return False
    
    async def _delete_from_s3(self, file_url: str) -> bool:
        """Удаление файла из S3"""
        try:
            import boto3
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            
            # Извлекаем ключ объекта из URL
            object_key = file_url.split(f"{settings.AWS_S3_BUCKET}.s3.")[1].split('/', 1)[1]
            
            s3_client.delete_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=object_key
            )
            return True
        
        except Exception as e:
            logger.error(f"S3 delete error: {str(e)}")
            return False


# Singleton instance
file_storage = FileStorage()

