from elevenlabs.client import ElevenLabs
from app.settings import settings


class TTSService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.voice_id = settings.ELEVENLABS_VOICE_ID
        self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None

    def generate_audio(self, text: str, language: str = "en") -> bytes:
        if not self.client or not self.voice_id:
            raise RuntimeError("Voice key not set.")

        audio_stream = self.client.text_to_speech.convert(
            text=text,
            voice_id=self.voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        return b"".join(audio_stream)


tts_service = TTSService()
