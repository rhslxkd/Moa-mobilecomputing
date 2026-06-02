from fastapi import FastAPI
from app.routers import auth
from app.routers import project

app = FastAPI(title="MOA API", version="0.1.0")

app.include_router(auth.router)
app.include_router(project.router)
