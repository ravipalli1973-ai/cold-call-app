# Cold Call Copilot 🚀

An AI-driven real-time cold call copilot designed for outbound sales representatives. Built with **Next.js**, **FastAPI**, **Supabase**, and **Google Gemini AI**.

---

## 🌐 Live Deployments

- **Web Application**: [https://cold-call-app-two.vercel.app](https://cold-call-app-two.vercel.app/)
- **API Documentation**: [FastAPI Swagger Docs](https://cold-call-app-i9s0.onrender.com/docs)
- **API Health Check**: [Render Backend Health](https://cold-call-app-i9s0.onrender.com/health)

---

## ⚡ Key Features

- **Stage-by-Stage Script Guidance**: Step reps systematically through opening hooks, problem qualification, pitch, and closing objection handling.
- **Real-Time Note & Verbatim Logging**: Capture exact prospect responses and objections per stage without context switching.
- **Instant AI CRM Summaries**: Powered by Google Gemini to transform structured call notes into concise, actionable 2-sentence CRM recap logs.
- **Relational Persistence**: Uses Supabase (PostgreSQL) to store call sessions, stage outcomes, verbatim responses, and AI summaries.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Hosting |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS | Vercel |
| **Backend API** | FastAPI, Pydantic, Uvicorn | Render |
| **Database** | PostgreSQL | Supabase |
| **LLM Engine** | Google Gemini API (`gemini-2.5-flash`) | Google AI Studio |

---

## ⚙️ Local Development Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/ravipalli1973-ai/cold-call-app.git](https://github.com/ravipalli1973-ai/cold-call-app.git)
cd cold-call-app