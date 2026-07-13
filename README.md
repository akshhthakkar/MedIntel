# MedIntel — AI Medical Report Analyzer

MedIntel is a full-stack, AI-powered healthcare application that helps users understand complex medical test reports. By simply uploading a PDF of a lab report, patients receive a plain-language summary, explanations of abnormal values, tailored health recommendations, and automated medication management. 

## Features

✅ JWT authentication (register, login, email verification)
✅ Forgot/reset password via email
✅ AI medical report analysis (Gemini 1.5 Flash)
✅ Symptoms and remedies per abnormal test value
✅ 13-language support with re-translation
✅ AI Q&A on any report
✅ Medication management with drug interaction checks
✅ Medication reminders via node-cron
✅ Missed dose detection and notification
✅ Symptom logging with AI pattern insights
✅ Health trends charts (Recharts)
✅ Full health timeline view
✅ Side-by-side report comparison
✅ In-app notifications via Novu
✅ Weekly health summary emails
✅ Account deletion with cascading data removal
✅ 52 automated tests passing

## Setup & Execution

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas account (free tier)
- Google Gemini API key (free — gemini-1.5-flash)
- Cloudinary account (free 25GB)
- Novu account (free 30K/month)
- SendGrid account (free 100/day)

### Installation

1. **Clone the repo**
2. **Setup Backend:**
   ```bash
   cp backend/.env.example backend/.env
   # Fill in all required values in .env
   cd backend && npm install
   ```
3. **Setup AI Service:**
   ```bash
   cd ai-service && pip install -r requirements.txt
   ```
4. **Setup Frontend:**
   ```bash
   cd frontend && npm install
   ```

### Running the Application

Terminal 1: Start the backend server
```bash
cd backend && npm run dev
```

Terminal 2: Start the AI service (Python/FastAPI)
```bash
cd ai-service && uvicorn app.main:app --reload --port 8000
```

Terminal 3: Start the frontend development server
```bash
cd frontend && npm run dev
```

### Testing

To run the backend test suite, ensuring all automated workflows are operational:

```bash
cd backend && npm test
```

## Application Architecture

The project follows a modern microservices architecture decoupled by REST APIs:
- **Frontend**: React, Vite, TailwindCSS, Recharts, Lucide Icons, React Router
- **Backend Node Service**: Express.js, MongoDB (Mongoose), JWT, Node-cron, Novu
- **AI Processing Microservice**: FastAPI, Google Gemini SDK, PyMuPDF, LangChain
