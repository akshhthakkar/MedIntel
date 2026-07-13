# 🚀 MedIntel — Deployment Guide
**Stack: MongoDB Atlas · Render (backend) · Vercel (frontend)**

---

## ✅ Pre-deployment Checklist

> [!IMPORTANT]
> Complete all three platform setups **before** deploying. You need the backend URL before setting up the frontend, and the Atlas connection string before the backend.

```
1. MongoDB Atlas  →  get MONGODB_URI
2. Render (backend)  →  get backend URL
3. Vercel (frontend)  →  set VITE_API_URL = backend URL
```

---

## 1. 🍃 MongoDB Atlas

### Create a free cluster
1. Go to **[cloud.mongodb.com](https://cloud.mongodb.com)** → Create account
2. Click **"Build a Database"** → choose **M0 Free Tier**
3. Select a region close to your users (e.g. Mumbai / Singapore)
4. Create a **username + password** (save these!)

### Set up network access
1. Sidebar → **Network Access** → **Add IP Address**
2. Click **"Allow Access From Anywhere"** → `0.0.0.0/0`
   - This lets Render's dynamic IPs connect

### Get your connection string
1. Sidebar → **Database** → **Connect** → **Drivers**
2. Copy the URI, it looks like:
```
mongodb+srv://aksh:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```
3. Replace `<password>` with your actual password
4. **Add the database name** before `?`:
```
mongodb+srv://aksh:MyPass123@cluster0.abc123.mongodb.net/medintel?retryWrites=true&w=majority
```

---

## 2. ⚙️ Render — Backend Deployment

### Create a Web Service
1. Go to **[render.com](https://render.com)** → Sign up with GitHub
2. **New +** → **Web Service**
3. Connect your GitHub repo (push your code first, see Git Setup below)
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `medintel-backend` |
| **Region** | Oregon (US) or Frankfurt (EU) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

### Set Environment Variables in Render
Click **"Environment"** tab and add each variable:

```
NODE_ENV          = production
PORT              = 5000
MONGODB_URI       = mongodb+srv://inframax07_db_user:oxynlQOnpCvYCVB0@medintel.gjzs80r.mongodb.net/medintel?retryWrites=true&w=majority&appName=medintel
JWT_SECRET        = (generate: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
JWT_EXPIRE        = 7d
FRONTEND_URL      = https://your-app.vercel.app   ← fill after Vercel deploy
GROQ_API_KEY      = gsk_...
GROQ_MODEL        = llama-3.3-70b-versatile
GEMINI_API_KEY    = AIzaSy...
GEMINI_MODEL      = gemini-2.0-flash-lite
CLOUDINARY_CLOUD_NAME  = dawfya64r
CLOUDINARY_API_KEY     = 495633668592971
CLOUDINARY_API_SECRET  = hOkY68hv...
ONESIGNAL_APP_ID  = 66e015c1-...
ONESIGNAL_API_KEY = os_v2_app_...
BREVO_API_KEY     = xkeysib-...
BREVO_SENDER_EMAIL = your@email.com
BREVO_SENDER_NAME  = MedIntel
```

> [!CAUTION]
> Never paste your real `.env` file into git. All secrets go in Render's dashboard only.

### Deploy
- Click **"Create Web Service"** — Render will build and deploy
- Your backend URL will be: `https://medintel-backend.onrender.com`
- **Test it:** visit `https://medintel-backend.onrender.com/api/health`

> [!NOTE]
> Free Render services **spin down after 15 min of inactivity** and take ~30s to wake up on first request. To avoid this, use Render's **"Cron Job"** (paid) or set up UptimeRobot to ping `/api/health` every 10 minutes for free.

---

## 2b. 🧠 Render — AI Service Deployment (FastAPI + OCR)

Since Render's default Python environment does not contain the system-level `tesseract-ocr` package required for image/scanned PDF scanning, we deploy the AI Service as a **Docker container** (using the pre-configured [Dockerfile](file:///c:/Users/Aksh/Downloads/medical-care-app/ai-service/Dockerfile)).

### Create a Web Service for the AI Service
1. Render Dashboard → **New +** → **Web Service**
2. Connect your GitHub repository.
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `medintel-ai` |
| **Region** | Same region as your backend |
| **Branch** | `main` |
| **Root Directory** | `ai-service` |
| **Runtime** | `Docker` (automatically detected from Dockerfile) |
| **Instance Type** | Free |

### Set Environment Variables in medintel-ai
Click **"Environment"** tab and add these credentials:

```
GROQ_API_KEY   = gsk_...
GEMINI_API_KEY = AIzaSy...
```

### Click "Create Web Service"
- Render will build the Docker container and deploy the FastAPI server.
- Your AI service URL will be: `https://medintel-ai.onrender.com`
- **Test it:** Visit `https://medintel-ai.onrender.com/health` (should return JSON confirmation).

### Wire AI Service to Node.js Backend
Once deployed, copy the URL of `medintel-ai` and add it to your main backend (`medintel-backend`) environment:
1. Render main backend service dashboard → **Environment**.
2. Add variable:
   ```
   PYTHON_AI_URL = https://medintel-ai.onrender.com
   ```
3. Click **"Save Changes"**. Render will redeploy automatically and route report interpretation requests to the FastAPI engine!

---

## 3. ▲ Vercel — Frontend Deployment

### Push your frontend to GitHub
(See Git Setup section below first)

### Deploy to Vercel
1. Go to **[vercel.com](https://vercel.com)** → Sign up with GitHub
2. **"Add New Project"** → Import your repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |
| **Install Command** | `npm install` |

### Set Environment Variables in Vercel
Under **"Environment Variables"**:

```
VITE_API_URL = https://medintel-backend.onrender.com/api
```

> [!IMPORTANT]
> In Vite, only variables prefixed with `VITE_` are exposed to the browser. This is already set up correctly in `frontend/src/services/api.js`.

### Click "Deploy"
- Your frontend URL: `https://your-app-name.vercel.app`
- **Go back to Render** and update `FRONTEND_URL` to this Vercel URL

---

## 4. 🔗 Final Wiring (After Both Are Deployed)

1. **Render Dashboard** → your backend service → **Environment** → update:
   ```
   FRONTEND_URL = https://your-app-name.vercel.app
   ```
2. **Render** → click **"Manual Deploy"** → "Deploy latest commit" to apply

---

## 5. 📦 Git Setup (if not done yet)

```bash
# In your project root
cd c:\Users\Aksh\Downloads\medical-care-app

git init
git add .
git commit -m "feat: initial MedIntel deployment"

# Create repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/medintel.git
git branch -M main
git push -u origin main
```

> [!WARNING]
> Make sure `.env` files are in `.gitignore` before your first commit — they already are in this project. **Never push real API keys to GitHub.**

---

## 6. 🌐 Custom Domain (Optional)

**Vercel:**
- Vercel Dashboard → your project → **Domains** → Add your domain
- Update your DNS A record to point to Vercel

**Render:**
- Render Dashboard → your service → **Settings** → **Custom Domains**
- Then update `FRONTEND_URL` in Render env vars and `VITE_API_URL` in Vercel env vars

---

## 7. 🧪 Verify Everything Works

After deployment, test these URLs:

| Check | Expected |
|-------|----------|
| `https://your-backend.onrender.com/api/health` | `{"status":"ok"}` |
| `https://your-app.vercel.app` | Landing page loads |
| `https://your-app.vercel.app/register` | Registration works |
| Register → Login → Upload a report | Full flow works |

---

## 8. 💡 Tips for Free Tier

| Issue | Fix |
|-------|-----|
| Render spins down | Ping `/api/health` every 10 min via UptimeRobot |
| MongoDB "free" 512 MB limit | Monitor usage in Atlas dashboard |
| Vercel build fails | Check build logs, usually a missing env var |
| CORS errors in browser | Make sure `FRONTEND_URL` in Render = exact Vercel URL |
| Images not loading | Cloudinary is already set up, will work in prod |
