# Grid Twin Backend

This folder is a self-contained FastAPI service for Render or direct GitHub upload.

## Render settings

Set Render **Root Directory** to `backend` and use:

```bash
Build Command: python -m pip install -r requirements.txt
Start Command: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

Environment variable:

```env
FRONTEND_ORIGINS=https://frontend-pi-two-79.vercel.app
```

Public review endpoints:

- `GET /health`
- `GET /docs`
- `GET /swagger.json`
- `GET /api/public/review`
- `POST /api/public/review`

The model archive must remain beside `main.py` as `gridtwin final model.zip`.