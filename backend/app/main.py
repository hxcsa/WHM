from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.api import router as api_router
from app.core.firebase import init_firebase

app = FastAPI(
    title="Warehouse Management API (Firebase)", version="1.0.0", redirect_slashes=False
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, you might want to restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=500)


@app.on_event("startup")
async def startup_event():
    try:
        init_firebase()
    except Exception as e:
        print(f"Failed to initialize Firebase on startup: {e}")


@app.get("/")
async def root():
    return {"message": "Welcome to OpenGate Warehouse API v1.0.1"}


# Mount the single monolithic router
# The router in app.api.__init__ already includes /reports/..., /users/..., etc.
# but some might be defined with absolute paths like "/users/me".
# If we mount with prefix="/api", they become "/api/users/me", which matches the frontend expectations.
app.include_router(api_router, prefix="/api")
