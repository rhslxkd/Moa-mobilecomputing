from pydantic import BaseModel


class MemberReportResponse(BaseModel):
    member_id: str
    name: str
    todos_done: int
    todos_total: int
    contribution: int   # 완료 기여도 % (전체 완료 대비)


class ReportResponse(BaseModel):
    project_id: str
    project_name: str
    members: list[MemberReportResponse]
    total_todos: int
    done_todos: int
    completion_rate: int   # 전체 완료율 %
    meeting_count: int
