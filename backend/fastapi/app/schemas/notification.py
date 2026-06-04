from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str      # todo | meeting | mention | report
    title: str
    body: str
    project: str
    time: str      # 상대시간 또는 마감 표시
    read: bool
