# 🩺 Sehat Saathi – Voice-First Healthcare Assistant

> Your personal healthcare companion to manage medicines, track daily doses, and interact with healthcare reminders using voice.

🌐 **Live Application:** https://sehat-saathi-ecru.vercel.app/login

🔗 **Backend API:** https://sehat-saathi-5o7w.onrender.com/

---

## 📖 About the Project

**Sehat Saathi** is a voice-first healthcare assistant designed to make medication management simpler, more accessible, and user-friendly.

The application enables users to manage their medicines, track daily medication adherence, create reminders, and interact with the system using voice commands in English and Hindi.

Instead of relying entirely on manual interactions, Sehat Saathi integrates voice-based interaction with a personalized medication management system, helping users organize their medication routines more conveniently.

---

## ✨ Features

- 🔐 **Secure Authentication** – User authentication and protected application access.
- 💊 **Medicine Management** – Add, manage, and organize prescribed medicines.
- 📅 **Daily Dose Tracking** – Automatically generate and track scheduled doses.
- 📊 **Medication Adherence Tracking** – Monitor daily medication progress.
- 🎙️ **Voice Interaction** – Interact with the application using voice commands.
- 🌐 **Hindi & English Support** – Voice interaction support for multiple languages.
- 🗣️ **Speech-to-Text** – Convert spoken commands into text using Sarvam AI.
- 🔊 **Text-to-Speech** – Voice responses powered by ElevenLabs.
- ⏰ **Reminder Management** – Create, manage, and complete reminders.
- 🔔 **Browser Notifications** – Receive notifications for scheduled reminders.
- 🤖 **Rule-Based Command Processing** – Process voice commands through intent classification without requiring an LLM.
- 🔒 **User Data Isolation** – Secure user-specific data access.

---

## 🛠️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Python
- FastAPI
- Uvicorn

### Database & Authentication
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Voice Technologies
- Sarvam AI – Speech-to-Text
- ElevenLabs – Text-to-Speech

### Deployment
- Vercel – Frontend
- Render – Backend

---

## 🏗️ Architecture

```text
                    ┌──────────────────────────┐
                    │        User             │
                    │   Voice / Interface     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │     Next.js Frontend     │
                    │   React + TypeScript     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      FastAPI Backend     │
                    │  Voice Command Handling  │
                    │    Intent Processing     │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │  Sarvam AI   │  │ ElevenLabs   │  │  Supabase    │
       │ Speech-to-   │  │ Text-to-     │  │ PostgreSQL   │
       │ Text         │  │ Speech       │  │ Auth + DB    │
       └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🎙️ Voice Interaction Workflow

1. The user speaks a command.
2. Speech is converted into text using speech recognition.
3. The backend processes the command.
4. Rule-based intent classification identifies the requested action.
5. The system executes the relevant action.
6. The response is presented to the user and can be converted into speech.

### Supported Voice Actions

- Check today's medicines.
- Mark a medicine as taken.
- Create medication-related reminders.
- Interact using supported English and Hindi commands.

---

## 🚀 Live Deployment

| Component | URL |
|---|---|
| 🌐 Frontend | https://sehat-saathi-ecru.vercel.app/login |
| ⚙️ Backend | https://sehat-saathi-5o7w.onrender.com/ |
| 📚 API Documentation | https://sehat-saathi-5o7w.onrender.com/docs |

---

## 💻 Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/saurabhkr111/sehat-saathi.git
cd sehat-saathi
```

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at:

```text
http://localhost:3000
```

### 3. Run the Backend

Open another terminal:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 🔑 Environment Variables

Configure the required environment variables for the frontend and backend before running the application.

Store credentials and API keys in environment files locally or in the respective deployment platform's environment variable settings.

**Never commit secret keys, access tokens, or credentials to GitHub.**

---

## 🔒 Security

- Supabase authentication.
- User-specific database access.
- Row Level Security (RLS).
- Environment-based secret management.
- Protected application routes.

---

## 🎯 Project Goals

Sehat Saathi aims to make medication management more accessible and convenient through voice-driven interaction.

The project explores how voice technologies, web development, authentication, database security, and rule-based AI can work together to create practical healthcare assistance tools.

---

## ⚠️ Disclaimer

Sehat Saathi is a medication management and reminder application. It is not a substitute for professional medical advice, diagnosis, or treatment.

Users should always consult qualified healthcare professionals regarding their medical conditions and prescriptions.

---

## 👨‍💻 Developer

**Saurabh Kumar**

B.Tech Computer Science Graduate | Software Development | AI & Web Technologies

---

⭐ If you find this project interesting, consider giving the repository a star!
