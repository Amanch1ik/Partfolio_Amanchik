import sys
import argparse
import subprocess
from typing import List, Optional
from datetime import datetime
from src.Admin.models import AdminUser

class AdminCLI:
    """Утилита командной строки для администрирования"""

    @staticmethod
    def create_admin_user(username: str, email: str, is_superadmin: bool = False):
        """Создание нового администратора"""
        from src.Admin.services import AdminAuthService
        from src.core.database import SessionLocal

        db = SessionLocal()
        try:
            password = AdminAuthService.generate_password()
            admin = AdminAuthService.create_admin_user(
                db, 
                username, 
                email, 
                password, 
                is_superadmin
            )
            print(f"Создан администратор: {username}")
            print(f"Временный пароль: {password}")
        except Exception as e:
            print(f"Ошибка создания администратора: {e}")
        finally:
            db.close()

    @staticmethod
    def reset_admin_password(username: str):
        """Сброс пароля администратора"""
        from src.Admin.services import AdminAuthService
        from src.core.database import SessionLocal

        db = SessionLocal()
        try:
            admin = db.query(AdminUser).filter(AdminUser.username == username).first()
            if not admin:
                print(f"Администратор {username} не найден")
                return

            new_password = AdminAuthService.generate_password()
            admin.password_hash = AdminAuthService.get_password_hash(new_password)
            db.commit()

            print(f"Пароль для {username} сброшен")
            print(f"Новый временный пароль: {new_password}")
        except Exception as e:
            print(f"Ошибка сброса пароля: {e}")
        finally:
            db.close()

    @staticmethod
    def backup_database(output_dir: Optional[str] = None):
        """Создание резервной копии базы данных"""
        from src.core.config import settings

        output_dir = output_dir or "./backups"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{output_dir}/yess_admin_backup_{timestamp}.sql"

        try:
            subprocess.run([
                "pg_dump",
                f"postgresql://{settings.DATABASE_USER}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}/{settings.DATABASE_NAME}",
                "-f", 
                backup_file
            ], check=True)
            print(f"Резервная копия создана: {backup_file}")
        except subprocess.CalledProcessError as e:
            print(f"Ошибка создания резервной копии: {e}")

    @staticmethod
    def run_migrations():
        """Выполнение миграций базы данных"""
        try:
            subprocess.run(["alembic", "upgrade", "head"], check=True)
            print("Миграции успешно выполнены")
        except subprocess.CalledProcessError as e:
            print(f"Ошибка выполнения миграций: {e}")

    @classmethod
    def main(cls):
        """Точка входа CLI"""
        parser = argparse.ArgumentParser(description="Утилиты администрирования YESS")
        subparsers = parser.add_subparsers(dest="command")

        # Создание администратора
        create_admin_parser = subparsers.add_parser("create-admin")
        create_admin_parser.add_argument("username")
        create_admin_parser.add_argument("email")
        create_admin_parser.add_argument("--superadmin", action="store_true")

        # Сброс пароля
        reset_password_parser = subparsers.add_parser("reset-password")
        reset_password_parser.add_argument("username")

        # Резервное копирование
        backup_parser = subparsers.add_parser("backup")
        backup_parser.add_argument("--output", help="Директория для резервной копии")

        # Миграции
        subparsers.add_parser("migrate")

        args = parser.parse_args()

        if args.command == "create-admin":
            cls.create_admin_user(
                args.username, 
                args.email, 
                args.superadmin
            )
        elif args.command == "reset-password":
            cls.reset_admin_password(args.username)
        elif args.command == "backup":
            cls.backup_database(args.output)
        elif args.command == "migrate":
            cls.run_migrations()
        else:
            parser.print_help()

if __name__ == "__main__":
    AdminCLI.main()
