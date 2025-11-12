import os
import subprocess
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError

class BackupService:
    def __init__(
        self, 
        db_name: str = 'yess_db', 
        backup_dir: str = '/backups',
        s3_bucket: str = 'yess-loyalty-backups'
    ):
        self.db_name = db_name
        self.backup_dir = backup_dir
        self.retention_days = 30
        
        # S3 клиент
        self.s3_client = boto3.client('s3')
        self.s3_bucket = s3_bucket

    def create_local_backup(self) -> str:
        """Создание локального бэкапа базы данных"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{self.db_name}_{timestamp}.sql.gz"
        backup_path = os.path.join(self.backup_dir, backup_filename)

        # Создание директории для бэкапов, если не существует
        os.makedirs(self.backup_dir, exist_ok=True)

        # Выполнение дампа базы данных с компрессией
        pg_dump_command = (
            f"pg_dump -U postgres {self.db_name} "
            f"| gzip > {backup_path}"
        )
        
        try:
            subprocess.run(pg_dump_command, shell=True, check=True)
            return backup_path
        except subprocess.CalledProcessError as e:
            print(f"Ошибка создания бэкапа: {e}")
            return None

    def upload_to_s3(self, backup_path: str):
        """Загрузка бэкапа в S3"""
        if not backup_path:
            return False

        try:
            filename = os.path.basename(backup_path)
            self.s3_client.upload_file(
                backup_path, 
                self.s3_bucket, 
                f"daily/{filename}"
            )
            return True
        except ClientError as e:
            print(f"Ошибка загрузки в S3: {e}")
            return False

    def cleanup_old_backups(self):
        """Удаление старых локальных и облачных бэкапов"""
        current_time = datetime.now()

        # Локальные бэкапы
        for filename in os.listdir(self.backup_dir):
            filepath = os.path.join(self.backup_dir, filename)
            file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            
            if current_time - file_mtime > timedelta(days=self.retention_days):
                os.remove(filepath)

        # S3 бэкапы
        try:
            s3_objects = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket, 
                Prefix='daily/'
            )

            for obj in s3_objects.get('Contents', []):
                obj_date = obj['LastModified']
                if current_time - obj_date > timedelta(days=self.retention_days):
                    self.s3_client.delete_object(
                        Bucket=self.s3_bucket, 
                        Key=obj['Key']
                    )
        except ClientError as e:
            print(f"Ошибка очистки S3: {e}")

    def backup_routine(self):
        """Полный цикл резервного копирования"""
        backup_path = self.create_local_backup()
        if backup_path:
            self.upload_to_s3(backup_path)
            self.cleanup_old_backups()

# Глобальный экземпляр сервиса
backup_service = BackupService()
