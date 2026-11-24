from elevenlabs.client import ElevenLabs
from app.settings import settings


class TTSService:

    def __init__(self):
        api_key = settings.ELEVENLABS_API_KEY

        if not api_key:
            raise RuntimeError("ElevenLabs API key is not configured.")

        self.client = ElevenLabs(api_key=api_key)

    def generate_audio(self, text: str, language: str = "en") -> bytes:
        voice_id = settings.ELEVENLABS_VOICE_ID

        if not voice_id:
            raise RuntimeError("ElevenLabs Voice ID is not configured.")

        audio_stream = self.client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        audio_bytes = b"".join(audio_stream)

        return audio_bytes


tts_service = TTSService()