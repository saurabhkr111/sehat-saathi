import httpx
from app.settings import settings


class STTService:
    API_URL = "https://api.sarvam.ai/speech-to-text"

    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY

        if not self.api_key:
            raise RuntimeError("Sarvam API key is not configured.")

    async def transcribe_audio(
        self,
        audio_file,
        language_code: str = "en-IN",
    ) -> dict:

        headers = {
            "api-subscription-key": self.api_key,
        }

        data = {
            "model": "saaras:v4",
            "mode": "transcribe",
            "language_code": language_code,
        }

        files = {
            "file": audio_file,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.API_URL,
                    headers=headers,
                    files=files,
                    data=data,
                )

            if response.status_code >= 400:
                print("Sarvam API Status:", response.status_code)
                print("Sarvam API Response:", response.text)

            response.raise_for_status()

            return response.json()

        except httpx.TimeoutException as e:
            raise RuntimeError(
                "Sarvam STT request timed out."
            ) from e

        except httpx.HTTPStatusError as e:
            raise RuntimeError(
                f"Sarvam STT API error: {e.response.text}"
            ) from e

        except httpx.RequestError as e:
            raise RuntimeError(
                "Unable to connect to Sarvam STT API."
            ) from e


stt_service = STTService()