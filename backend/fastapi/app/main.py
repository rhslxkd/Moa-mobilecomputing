from fastapi import FastAPI
from app.routers import auth
from app.routers import project
from app.routers import todo
from app.routers import meeting

app = FastAPI(title="MOA API", version="0.1.0")

app.include_router(auth.router)
app.include_router(project.router)
app.include_router(todo.router)
app.include_router(meeting.router)
