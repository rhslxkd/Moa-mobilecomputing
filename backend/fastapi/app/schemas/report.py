from pydantic import BaseModel


from typing import Optional


class MemberReportResponse(BaseModel):
    member_id: str
    user_id: Optional[str] = None   # 로그인 사용자 식별용(계정 연결 멤버)
    name: str
    todos_done: int
    todos_total: int
    contribution: int   # 완료 기여도 % (전체 완료 대비)
    score: int = 0              # 종합 기여 점수 (난이도 가중 + 발언량)
    speak_seconds: int = 0      # 회의 발언 시간(초)
    ai_comment: Optional[str] = None   # AI 정성 코멘트


class ReportResponse(BaseModel):
    project_id: str
    project_name: str
    members: list[MemberReportResponse]
    total_todos: int
    done_todos: int
    completion_rate: int   # 전체 완료율 %
    meeting_count: int
    overall_comment: Optional[str] = None   # AI 종합 평가
