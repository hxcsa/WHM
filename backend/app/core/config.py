from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Firebase
    PROJECT_ID: str = "warehouse-c0cdd"
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "service_account.json"
    
    # Auth
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENVIRONMENT: str = "development"

settings = Settings()
