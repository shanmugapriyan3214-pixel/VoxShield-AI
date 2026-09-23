# VoxShield AI — Cloud Deployment & Android Integration Guide

This guide outlines step-by-step instructions for deploying the VoxShield AI backend to a free cloud hosting service (e.g. **Render**, **Railway**, **Fly.io**, or **Koyeb**) and connecting the Android APK.

---

## 1. Cloud Backend Deployment (Render)

### Option A: Automatic Deployment using `render.yaml`
1. Push your VoxShield AI repository to GitHub.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository. Render will automatically detect `render.yaml` and provision the web service.

### Option B: Manual Web Service Setup
1. On Render, click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure the following settings:
   * **Root Directory**: `backend`
   * **Environment**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
   * **Health Check Path**: `/health`

4. Add the following **Environment Variables**:
   * `ENVIRONMENT`: `production`
   * `DEBUG`: `false`
   * `SECRET_KEY`: `<generate-a-strong-random-secret-key>`
   * `BACKEND_CORS_ORIGINS`: `http://localhost,https://localhost,capacitor://localhost`

---

## 2. Connecting the Android APK to Cloud Backend

Once your backend is deployed (e.g. `https://voxshield-backend.onrender.com`), build the Android APK targeting your live HTTPS/WSS URL:

```powershell
# In d:\voiceREG\frontend
$env:VITE_API_URL="https://voxshield-backend.onrender.com"
npm run build
npx cap copy android
cd android
gradlew.bat assembleDebug
```

The app will automatically route:
* **HTTP REST API**: `https://voxshield-backend.onrender.com/api/v1`
* **WebSocket Signaling**: `wss://voxshield-backend.onrender.com/api/v1/ws/signaling/...`

---

## 3. Database Options

* **Local / Standalone**: Defaults to `sqlite+aiosqlite:///./voxshield.db`.
* **Cloud PostgreSQL**: Set `DATABASE_URL=postgres://user:password@host/db`. VoxShield automatically translates `postgres://` to `postgresql+asyncpg://` for non-blocking database queries.

---

## 4. Free Cloud Resource Considerations

* **RAM Usage**: AASIST-L (~766 KB) and ECAPA-TDNN (~84 MB) run on ONNX Runtime CPU. Total idle memory footprint is under ~150 MB, fitting comfortably within Render's free 512 MB RAM limit.
* **Worker Count**: Set `--workers 1` on free single-core instances to prevent memory duplication across process workers.
