from fastapi import FastAPI
from app.routers import auth
from app.routers import project
from app.routers import todo
from app.routers import meeting
from app.routers import member
from app.routers import report
from app.routers import notification
from app.routers import friend
from app.routers import chat
from app.routers import invitation
from app.routers import drive
from app.routers import meetpoll

app = FastAPI(title="MOA API", version="0.1.0")

app.include_router(auth.router)
app.include_router(project.router)
app.include_router(todo.router)
app.include_router(meeting.router)
app.include_router(member.router)
app.include_router(report.router)
app.include_router(notification.router)
app.include_router(friend.router)
app.include_router(chat.router)
app.include_router(invitation.router)
app.include_router(drive.router)
app.include_router(meetpoll.router)
