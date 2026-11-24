from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = Field(default="en", pattern="^(en|hi)$")