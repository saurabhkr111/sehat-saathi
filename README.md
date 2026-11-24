# Sehat Saathi — MVP Starter

A bilingual, voice-first healthcare assistant starter using Next.js and FastAPI.

## Prerequisites
- Node.js 20.9+
- Python 3.11+
- Git

## Backend (Windows PowerShell)
```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000 | Swagger: http://127.0.0.1:8000/docs

## Frontend (second PowerShell window)
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
Frontend: http://localhost:3000

This starter runs in demo mode without external API credentials. Use synthetic data only. It does not diagnose, prescribe, or change dosages. Real medicine schedules must require user confirmation.
