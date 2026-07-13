# MedIntel — AI-Powered Clinical Intelligence Platform

MedIntel is a full-stack, AI-powered healthcare companion platform that translates complex clinical test results into plain, patient-friendly insights. By uploading a medical report, users receive an instant clinician summary, highlighted abnormal indicators, visual normal-range sliders, and medication schedule tracking.

---

## 🚀 Key Features

*   **⚡ Premium User Experience & UI Layout:**
    *   **Interactive Steps Progress:** Visual indicators during report uploads (Scan → Verify → Analyze).
    *   **Visual Category Grid:** Card-based select selectors (CBC, Thyroid, Lipids, etc.) with custom medical icons.
    *   **Horizontal Filter Tabs:** Sort and categorize reports list on the fly.
    *   **Split-Screen Dashboard:** Two-column desktop layout featuring clinical results side-by-side with a sticky **AI Clinician Chatbot**.
    *   **Diagnostic Range Sliders:** Custom sliders plotting test values relative to min/max reference limits.
*   **🧠 Dual-Provider AI Engine:** Uses **Groq (Llama-3)** for rapid, low-latency processing, with automatic fallback to **Google Gemini** for larger contexts.
*   **💊 Automated Medication Tracker:** Automatically parses prescriptions, checks for drug-to-drug interactions, logs daily schedules, and tracks adherence.
*   **📉 Symptom & Vitals Logs:** Allows patients to keep diary logs of physical feelings, linking symptoms to biomarker trends.
*   **📈 Trends & Comparative Analytics:** Side-by-side report comparison charts mapping anomalies across history.
*   **🔐 Secure Verification & Auth:** JWT-secured registration and login with no-friction onboarding (pre-verified signup) and automated welcoming emails.
*   **🛡️ Stale Asset Protection:** Integrated capturing-phase listener to catch missing script bundle errors after deployments, triggering silent self-healing reloads.

---

## 🛠️ Infrastructure & Tech Stack

*   **Frontend:** React (Vite), TailwindCSS, Recharts, Lucide Icons, React Router
*   **Backend Node Service:** Express.js, MongoDB (Mongoose), JWT, Node-cron, Brevo Email API
*   **AI Microservice:** FastAPI, Docker (for Tesseract OCR system packages), Groq & Gemini SDKs

---

## 📋 Local Setup & Execution

### Prerequisites
*   Node.js 18+
*   Python 3.10+
*   MongoDB Atlas Connection String
*   Groq API Key / Gemini API Key
*   Brevo SMTP Credentials

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/akshhthakkar/MedIntel.git
    cd MedIntel
    ```

2.  **Configure Backend Services:**
    ```bash
    cd backend
    cp .env.example .env
    # Fill in MONGODB_URI, JWT_SECRET, GROQ_API_KEY, GEMINI_API_KEY, BREVO_API_KEY
    npm install
    ```

3.  **Configure Python AI Service:**
    ```bash
    cd ../ai-service
    pip install -r requirements.txt
    ```

4.  **Configure React Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running Locally

*   **Start Backend Node server (Port 5000):**
    ```bash
    cd backend && npm run dev
    ```
*   **Start AI FastAPI Service (Port 8000):**
    ```bash
    cd ai-service && uvicorn app.main:app --reload --port 8000
    ```
*   **Start Frontend Vite server (Port 5173):**
    ```bash
    cd frontend && npm run dev
    ```

---

## ☁️ Cloud Deployment Configuration

This repository includes production-ready configurations for seamless cloud deployment:

### 1. Vercel Frontend (`vercel.json`)
Monorepo configurations to handle subfolder Vite builds and routing rewrites:
*   Includes strict **Cache-Control headers** to cache compiled bundles (`/assets/*`) forever (`immutable`), while preventing caching on `index.html`. This ensures immediate updates when a new version goes live, avoiding white-screen bundle errors.

### 2. Render Services Backend (`render.yaml`)
Infrastructure-as-Code blueprint containing:
*   **`medintel-backend`**: A Node web service running the Express API.
*   **`medintel-ai-service`**: A Dockerized web service compiling FastAPI and Tesseract-OCR dependencies automatically.
