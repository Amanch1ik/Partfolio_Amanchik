import hvac
import logging
from typing import Dict, Any
from functools import lru_cache

class VaultSecretManager:
    def __init__(
        self, 
        vault_url: str = 'https://vault.yess-loyalty.com', 
        role_id: str = None, 
        secret_id: str = None
    ):
        self.client = hvac.Client(url=vault_url)
        self.role_id = role_id
        self.secret_id = secret_id
        self._authenticate()

    def _authenticate(self):
        """Аутентификация в Vault с использованием AppRole"""
        try:
            # Аутентификация с использованием AppRole
            auth_response = self.client.auth.approle.login(
                role_id=self.role_id,
                secret_id=self.secret_id
            )
            self.client.token = auth_response['auth']['client_token']
            logging.info("Successfully authenticated with Vault")
        except Exception as e:
            logging.error(f"Vault authentication failed: {e}")
            raise

    @lru_cache(maxsize=100)
    def get_secret(self, path: str, key: str = None) -> Dict[str, Any]:
        """
        Получение секрета из Vault
        
        :param path: Путь к секрету в Vault
        :param key: Конкретный ключ в секрете (опционально)
        :return: Словарь с секретами или значение конкретного ключа
        """
        try:
            secret = self.client.secrets.kv.v2.read_secret_version(path=path)
            data = secret['data']['data']
            
            if key:
                return data.get(key)
            return data
        except Exception as e:
            logging.error(f"Error retrieving secret from Vault: {e}")
            raise

    def create_or_update_secret(self, path: str, secrets: Dict[str, Any]):
        """
        Создание или обновление секрета в Vault
        
        :param path: Путь для сохранения секрета
        :param secrets: Словарь секретов для сохранения
        """
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=secrets
            )
            logging.info(f"Secret updated at path: {path}")
        except Exception as e:
            logging.error(f"Error updating secret in Vault: {e}")
            raise

    def rotate_secret(self, path: str, key: str):
        """
        Ротация конкретного секрета
        
        :param path: Путь к секрету
        :param key: Ключ для ротации
        """
        try:
            current_secrets = self.get_secret(path)
            current_secrets[key] = self._generate_new_secret()
            
            self.create_or_update_secret(path, current_secrets)
            logging.info(f"Secret rotated for key: {key}")
        except Exception as e:
            logging.error(f"Secret rotation failed: {e}")
            raise

    def _generate_new_secret(self, length: int = 32) -> str:
        """
        Генерация нового случайного секрета
        
        :param length: Длина генерируемого секрета
        :return: Случайный секрет
        """
        import secrets
        return secrets.token_urlsafe(length)

# Глобальный экземпляр менеджера секретов
vault_service = VaultSecretManager(
    vault_url='https://vault.yess-loyalty.com',
    role_id='your-role-id',
    secret_id='your-secret-id'
)
