from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.services.assistant_service import assistant_service
from app.settings import settings
from app.schemas.tts_schema import TTSRequest
from app.services.tts_service import tts_service
from app.services.stt_service import stt_service


def raise_voice_error(error: Exception) -> None:
    message = str(error)

    if "key not set" in message.lower():
        raise HTTPException(
            status_code=503,
            detail="Voice key not set.",
        )

    raise HTTPException(
        status_code=500,
        detail=message or "Voice request failed.",
    )


# =========================================================
# FastAPI Application
# =========================================================

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)


# =========================================================
# CORS Configuration
# Voice routes do not use cookies, so a wildcard origin is safe
# and avoids missing Access-Control-Allow-Origin on Vercel.
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Basic Endpoints
# =========================================================

@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


# =========================================================
# ElevenLabs Text-to-Speech API
# =========================================================

@app.post("/api/v1/voice/speak")
def speak_text(request: TTSRequest):

    try:
        audio = tts_service.generate_audio(
            text=request.text,
            language=request.language,
        )

        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": (
                    "inline; filename=sehat-saathi.mp3"
                ),
            },
        )

    except HTTPException:
        raise

    except Exception as e:
        print(f"TTS Error: {e}")
        raise_voice_error(e)


# =========================================================
# Sarvam AI Speech-to-Text API
# =========================================================

@app.post("/api/v1/voice/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language_code: str = Form("en-IN"),
):

    # -----------------------------------------------------
    # Supported audio formats
    # -----------------------------------------------------

    allowed_content_types = {
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/m4a",
        "audio/webm",
        "audio/ogg",
        "audio/flac",
        "audio/aac",
        "audio/opus",
    }

    # Normalize MIME type
    content_type = (
        (file.content_type or "")
        .split(";")[0]
        .strip()
        .lower()
    )

    # -----------------------------------------------------
    # Audio format validation
    # -----------------------------------------------------

    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio file format: {file.content_type}",
        )

    # -----------------------------------------------------
    # Read uploaded audio
    # -----------------------------------------------------

    try:

        audio_bytes = await file.read()

        if not audio_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded audio file is empty.",
            )

        # -------------------------------------------------
        # Send audio to Sarvam AI
        # -------------------------------------------------

        result = await stt_service.transcribe_audio(
            audio_file=(
                file.filename or "audio.webm",
                audio_bytes,
                content_type,
            ),
            language_code=language_code,
        )

        # -------------------------------------------------
        # Return transcription result
        # -------------------------------------------------

        return {
            "transcript": result.get("transcript", ""),
            "language_code": result.get("language_code"),
            "request_id": result.get("request_id"),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"STT Error: {e}")
        raise_voice_error(e)

    finally:
        await file.close()

# =========================================================
# Voice Command Intelligence
# =========================================================

@app.post("/api/v1/assistant/command")
async def process_command(
    text: str = Form(...),
    language: str = Form("en"),
):

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Command text cannot be empty.",
        )

    try:
        result = assistant_service.process_command(
            text=text,
            language=language,
        )

        return result

    except Exception as e:
        print(f"Assistant Error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Command processing failed.",
        )

@app.post("/api/v1/assistant/command")
def process_command(
    text: str = Form(...),
    language: str = Form("en"),
):
    try:
        result = assistant_service.process_command(
            text=text,
            language=language,
        )

        return result

    except Exception as e:
        print(f"Assistant Error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Command processing failed.",
        )