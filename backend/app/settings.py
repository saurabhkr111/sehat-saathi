from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sehat Saathi API"
    frontend_origin: str = "http://localhost:3000"
    frontend_origins: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "https://sehat-saathi-ecru.vercel.app"
    )

    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""

    SARVAM_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()