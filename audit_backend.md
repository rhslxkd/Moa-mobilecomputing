# MOA 백엔드 점검 보고서 (읽기 전용 감사)

- 대상: `backend/fastapi/`
- 방식: 정적 코드 리뷰 (소스 무수정)
- 주의: 본 감사는 **소스 코드를 단 한 줄도 수정/생성/삭제하지 않았습니다.** 이 `audit_backend.md` 보고서 파일만 산출물로 생성했습니다.
- 핵심 전제: 모든 DB 접근이 `supabase_admin`(service role)로 이루어져 **RLS가 전면 우회**됩니다. 따라서 보안은 전적으로 애플리케이션 레벨의 소유권/멤버십 체크에 의존합니다.

---

## 1) 전체 요약 (카테고리별 개수)

| # | 카테고리 | Critical | Major | Minor |
|---|---------|:--------:|:-----:|:-----:|
| 1 | Dead/미호출 엔드포인트 | 0 | 0 | 2 |
| 2 | Pydantic ↔ DB 스키마 불일치 | 0 | 1 | 2 |
| 3 | async 내 blocking/await 누락 | 1 | 1 | 0 |
| 4 | 미처리 예외 / 잘못된 status code | 0 | 1 | 3 |
| 5 | 인증/인가 일관성 | 0 | 2 | 1 |
| 6 | 환경변수 하드코딩/.env 누락 | 0 | 1 | 2 |
| 7 | 마이그레이션 ↔ 코드 컬럼/테이블 불일치 | 1 | 1 | 0 |
| **합계** | | **2** | **7** | **10** |

가장 시급: **[C-1] 동기 STT(다글로) 호출이 async 엔드포인트에서 이벤트 루프를 수 분간 블로킹**, **[C-2] DB 스키마가 마이그레이션에 없음(재현 불가능한 스키마)**.

---

## 2) 상세 리스트

### 🔴 Critical

#### [C-1] async 업로드 엔드포인트가 blocking STT 호출로 이벤트 루프 정지
- 위치: `app/routers/meeting.py:42` `async def upload_audio` → `app/services/meeting.py:260` `process_audio` → `app/services/transcribe.py:95,112,113` (`requests.post`, `time.sleep(3)` × 최대 80회, `requests.get`)
- 문제: `upload_audio`는 `async`인데, 내부에서 동기 함수 `process_audio`를 그대로 호출. `transcribe_audio`는 `requests` + `time.sleep`로 **최대 ~4분 동안 동기 블로킹**. async 엔드포인트에서 블로킹 호출을 await/threadpool 없이 실행하면 **단일 이벤트 루프가 멈춰 전체 서버의 모든 요청이 지연**됨.
- 영향도: **Critical** (동시 사용자 시연 중 서버 먹통 위험)
- 추정원인: 동기 STT 로직을 async 핸들러에 직접 연결, `run_in_threadpool`/`BackgroundTasks` 미사용.
- 해결방향: `process_audio`를 `await run_in_threadpool(...)`로 감싸거나 `BackgroundTasks`/큐로 분리. 폴링 루프는 백그라운드 작업으로.

#### [C-2] 핵심 테이블이 마이그레이션에 정의돼 있지 않음
- 위치: `migrations/001_create_projects.sql` (유일한 마이그레이션 — `projects`, `project_members`만 정의)
- 문제: 코드가 참조하는 다수 테이블(`profiles`, `user_affiliations`, `todos`, `meetings`, `meeting_participants`, `meeting_attendance`, `chat_rooms`, `chat_room_members`, `chat_messages`, `chat_notices`, `chat_polls`, `chat_poll_votes`, `friendships`, `drive_folders`, `drive_files`, `notification_reads`, `meet_polls`, `meet_poll_responses`, `push_tokens` 등)에 대한 **마이그레이션이 전무**. 현재 운영 DB는 Supabase SQL 에디터에서 수동 생성된 것으로 추정 → **새 환경에서 재현 불가, 스키마 형상관리 불가**.
- 영향도: **Critical** (환경 재구축/온보딩/롤백 불가)
- 추정원인: 초기 개발 시 SQL 에디터로 직접 테이블 생성하고 마이그레이션 파일을 갱신하지 않음.
- 해결방향: 운영 DB 스키마를 덤프해 마이그레이션 파일로 커밋(`002_*.sql` ...). 최소한 시연 후 형상화.

---

### 🟠 Major

#### [M-1] `project_members` 마이그레이션이 코드가 쓰는 컬럼을 누락
- 위치: `migrations/001_create_projects.sql` (project_members에 `id, project_id, name, roles, created_at`만) ↔ `app/services/project.py`, `member.py`, `invitation.py`는 `user_id`, `status('pending'|'accepted')` 컬럼 사용
- 문제: 마이그레이션엔 `user_id`/`status`가 없음. 운영 DB에는 수동 추가돼 동작하지만 **마이그레이션과 코드가 불일치**.
- 영향도: **Major** (카테고리 7과 연결, 재현성)
- 해결방향: 마이그레이션에 `user_id UUID`, `status TEXT DEFAULT 'accepted'` 반영.

#### [M-2] `setup_affiliation`이 항상 INSERT → 소속 정보 중복 행 발생 가능
- 위치: `app/services/auth.py:231` `setup_affiliation` (무조건 `user_affiliations.insert`) ↔ `app/services/auth.py:388` `update_profile`는 존재 확인 후 update/insert(업서트)
- 문제: 온보딩에서 `setup_affiliation`을 두 번 호출하면 `user_affiliations`에 중복 행. `get_me`는 `.limit(1)`로 한 행만 읽어 **표시 데이터가 비결정적**.
- 영향도: **Major** (데이터 정합성)
- 해결방향: `setup_affiliation`도 업서트로 통일(존재 시 update).

#### [M-3] 공지/투표/일정조율 삭제 권한이 "작성자"가 아닌 "멤버 전체"
- 위치: `app/services/chat.py` `delete_notice`/`delete_poll`(`_assert_member`만 검사), `app/services/meetpoll.py:delete_poll`(`created_by`를 select하지만 `_has_project_access`만 검사)
- 문제: 같은 방/프로젝트 멤버라면 **남이 만든 공지·투표·일정조율을 삭제 가능**(작성자/방장 제한 없음).
- 영향도: **Major** (인가 granularity, 악의적/실수 삭제)
- 해결방향: 작성자(`created_by`) 또는 방장만 삭제 가능하도록 조건 추가.

#### [M-4] 파일 업로드 async 핸들러의 동기 스토리지 호출
- 위치: `app/routers/chat.py:56` `send_file`, `app/routers/drive.py:62` `upload_file` (둘 다 `async`) → 내부에서 동기 `supabase_admin.storage.from_(...).upload(...)` 호출
- 문제: 대용량 파일 업로드 시 동기 스토리지 I/O가 이벤트 루프를 블로킹(C-1보다 짧지만 동일 성격).
- 영향도: **Major**
- 해결방향: threadpool로 위임.

#### [M-5] 광범위한 `except Exception: pass` 로 오류 은폐
- 위치(예): `app/services/meeting.py` `_attendance_rows`(테이블 없으면 `[]`), `_auto_map_speakers`(매칭 실패 `return`), `process_audio`의 컬럼 폴백, `app/services/notification.py` 다수
- 문제: 스키마/네트워크 오류가 조용히 삼켜져 **빈 결과로 위장** → 디버깅 난이도 ↑, 부분 실패가 정상처럼 보임.
- 영향도: **Major** (운영 가시성)
- 해결방향: 최소한 로깅 추가, 예상 가능한 예외만 좁게 catch.

#### [M-6] 환경변수 비었을 때 조용히 기능 무력화
- 위치: `app/services/auth.py:28` `if not settings.resend_api_key: return`(이메일 미발송), `config.py`의 `daglo_api_key`/`ai_base_url` 기본 빈값
- 문제: `.env` 누락 시 예외 없이 **이메일/STT가 무음 실패**. 콘솔 OTP 폴백은 있으나 운영에서 인지 어려움.
- 영향도: **Major** (배포 환경 설정 누락이 런타임까지 숨음)
- 해결방향: 필수 키는 기동 시 검증(빈값이면 경고 로그/헬스체크 노출).

---

### 🟡 Minor

#### [m-1] Dead 후보: `POST /meetings`(create_meeting)
- 위치: `app/routers/meeting.py:22` `create_meeting`
- 근거: 모바일은 `POST /meetings/start` 사용, `MeetingAPI.create`는 `frontend/src/services/api.ts`에 정의만 있고 화면 호출 없음. 웹 미사용.
- 영향도: Minor (미사용 코드)
- 해결방향: 사용 계획 없으면 제거 또는 문서화. (2단계에서 프론트 재확인)

#### [m-2] Dead 후보: 일부 응답에 `response_model` 미지정(문서/검증 공백)
- 위치: `app/routers/chat.py:51` `get_read_status`, `app/routers/meeting.py:61` `attend`, `app/routers/drive.py:74` `download_file`, `:89` `auto_organize`
- 문제: raw dict 반환 → OpenAPI 스키마/응답 검증 부재.
- 영향도: Minor
- 해결방향: 응답 모델 정의.
- 참고: `POST /users/push-token`은 **미사용 아님** — `frontend/src/contexts/AuthContext.tsx:67`에서 호출됨.

#### [m-3] Auth 헤더 누락 시 401 대신 422
- 위치: `app/routers/auth.py:28` `bearer_token(authorization: Annotated[str, Header()])`
- 문제: `Authorization` 헤더 자체가 없으면 FastAPI가 필수 헤더 검증 실패로 **422 Unprocessable Entity** 반환(401이 적절).
- 영향도: Minor (클라이언트 에러 처리 혼란)
- 해결방향: 헤더를 Optional로 받고 직접 401 발생, 또는 의존성에서 명시적 처리.

#### [m-4] `SetupAffiliationRequest.organization_name`은 필수인데 `UpdateProfileRequest`/`UserProfileResponse`는 Optional
- 위치: `app/schemas/auth.py:61` (필수) ↔ `:137`, `:128` (Optional)
- 문제: 온보딩 단계와 수정/조회 단계의 필드 필수성이 불일치. 소속 없는 사용자 흐름 처리 모호.
- 영향도: Minor (스키마 일관성)
- 해결방향: 필수성 정책 통일.

#### [m-5] `profiles`/`user_affiliations` 마이그레이션 부재(스키마 형상 공백)
- 위치: 코드 사용 필드 — profiles(`username,first_name,last_name,terms_agreed,privacy_agreed,marketing_agreed,onboarding_completed`), user_affiliations(`user_id,affiliation_type,organization_name,department,student_id`)
- 영향도: Minor (C-2/M-1에 포함되나 별도 명시)
- 해결방향: 마이그레이션화.

#### [m-6] `_get_user`로 JWT 검증은 일관되나, 일부 라우터는 매 호출마다 `supabase_admin.auth.get_user`/`list_users` 호출(성능)
- 위치: `app/services/auth.py` `verify_signup_email`(`list_users()` 전체 조회), 각 서비스 `_get_user`
- 영향도: Minor (사용자 수 증가 시 `list_users` 비효율)
- 해결방향: 이메일→유저는 admin 단건 조회 API 사용.

---

## 5번(인증/인가) 일관성 요약
- **인증(JWT)**: 보호 엔드포인트는 모두 `Depends(bearer_token)` + 서비스에서 `_get_user(token)`(=`supabase_admin.auth.get_user`)로 토큰 유효성 검증 → **일관적**. 공개 엔드포인트(signup/login/find-*)만 토큰 불요(정상).
- **인가(소유권/멤버십)**: `todo`, `meeting`, `drive`, `meetpoll`, `member`, `project`는 `owner_id`/`_has_project_access`/`_verify_project_owner`로 **대체로 견고**(IDOR 방어 양호).
- **약점**: 공지/투표/일정조율 **삭제가 작성자 제한 없이 멤버 전체 허용**(M-3). RLS는 전면 우회되므로 앱 레벨 누락이 곧 취약점.

---

## 3) 백엔드 엔드포인트 목록 + 요청/응답 스키마 요약 (2단계 프론트 점검 입력용)

> 인증: `Auth` = `Authorization: Bearer <access_token>` 필요. 모든 경로 prefix 포함 절대경로.

### Auth (`/auth`) — 공개(인증=No) 표시 외 전부 토큰 필요
| Method | Path | Auth | Req body | Res |
|---|---|:--:|---|---|
| POST | /auth/signup | No | `{username,email,password,terms_agreed,privacy_agreed,marketing_agreed?}` | `{message}` 201 |
| POST | /auth/signup/verify-email | No | `{email,token}` | `{access_token,refresh_token,token_type}` |
| POST | /auth/login | No | `{username,password}` | `TokenResponse` |
| POST | /auth/setup/name | Yes | `{last_name,first_name}` | `{message}` |
| POST | /auth/setup/affiliation | Yes | `{affiliation_type,organization_name,department?,student_id?}` | `{message}` |
| POST | /auth/find-id/send-otp | No | `{email}` | `{message}` |
| POST | /auth/find-id/verify | No | `{email,token}` | `{username}` |
| POST | /auth/find-password/send-otp | No | `{email,username}` | `{message}` |
| POST | /auth/find-password/verify | No | `{email,username,token}` | `TokenResponse` |
| GET | /auth/me | Yes | — | `{id,username,first_name,last_name,email,affiliation_type?,organization_name?,department?,student_id?,onboarding_completed}` |
| POST | /auth/reset-password | Yes(reset token) | `{new_password}` | `{message}` |
| PATCH | /auth/profile | Yes | `{name,organization_name?,department?,student_id?}` | `{message}` |
| POST | /auth/change-password | Yes | `{current_password,new_password}` | `{message}` |
| POST | /auth/change-username | Yes | `{new_username,password}` | `{message}` |

### Project (`/projects`) — 전부 Yes
| Method | Path | Req | Res |
|---|---|---|---|
| GET | /projects | — | `ProjectResponse[]` |
| POST | /projects | `ProjectCreate{name,emoji,color,status,start_date,end_date,members:[{id?,user_id?,name,roles[]}]}` | `ProjectResponse` 201 |
| GET | /projects/{project_id} | — | `ProjectResponse` |
| PATCH | /projects/{project_id} | `ProjectUpdate{name?,emoji?,color?,status?,start_date?,end_date?,members?}` | `ProjectResponse` |
| DELETE | /projects/{project_id} | — | 204 |

`ProjectResponse`: `{id,owner_id,name,emoji,color,status,start_date"YYYY.MM.DD",end_date,days_left,member_count,members:[{id,user_id?,name,roles[]}],has_chat_alert,has_todo_alert}`

### Member (`/`) — 전부 Yes (방장만 변경)
| GET | /projects/{project_id}/members | — | `MemberResponse[]` |
| POST | /projects/{project_id}/members | `MemberCreate{id?,user_id?,name,roles[]}` (user_id 있으면 status=pending) | `MemberResponse` 201 |
| PATCH | /members/{member_id} | `{name?,roles?}` | `MemberResponse` |
| DELETE | /members/{member_id} | — | 204 |

### Todo (`/todos`) — 전부 Yes
| GET | /todos | — | `TodoResponse[]` (내 소유 + 담당) |
| GET | /todos/project/{project_id} | — | `TodoResponse[]` |
| POST | /todos | `TodoCreate{title,description?,project_id?,assignee_member_id?,due_date?,start_date?,difficulty=2}` | `TodoResponse` 201 |
| PATCH | /todos/{todo_id} | `TodoUpdate{title?,description?,assignee_member_id?,due_date?,start_date?,difficulty?,done?}` | `TodoResponse` |
| PATCH | /todos/{todo_id}/done | — | `TodoResponse` (토글) |
| DELETE | /todos/{todo_id} | — | 204 |

### Meeting (`/meetings`) — 전부 Yes
| GET | /meetings?project_id= | — | `MeetingResponse[]` |
| POST | /meetings | `MeetingCreate` | `MeetingResponse` 201 **(⚠ m-1 dead 후보)** |
| POST | /meetings/start | `{title?,project_id?}` | `MeetingResponse` 201 (시작자 자동 출석, QR=`moa-meeting:{id}`) |
| GET | /meetings/{id} | — | `MeetingResponse` |
| DELETE | /meetings/{id} | — | 204 (owner) |
| POST | /meetings/{id}/audio | multipart `file` | `MeetingResponse` **(⚠ C-1 blocking)** |
| POST | /meetings/{id}/speaker-mapping | `{mappings:[{speaker,member_id?}]}` | `MeetingResponse` |
| POST | /meetings/{id}/attend | — | `{ok,late_seconds}` (response_model 없음) |
| GET | /meetings/{id}/attendance | — | `AttendanceList{attendees[],absentees[]}` |
| POST | /meetings/{id}/finalize | `{duration_seconds,reasons:[{user_id?,member_id?,reason}]}` | `MeetingResponse` |
| POST | /meetings/{id}/action-items/{index}/add | `{title?,assignee_member_id?}` | `MeetingResponse` |

`MeetingResponse`: `{id,title,project_id?,project_name?,duration_seconds,summary[],transcript?,keywords[],speaker_stats{},speaker_samples{},participants:[{id,user_id?,name,speak_time_seconds,member_id?,speaker_label?}],started_at?,attendance[],absentees[],action_items:[{title,date?,added}],created_at}`

### Report (`/reports`) — Yes
| GET | /reports/{project_id} | — | `ReportResponse` |

`ReportResponse`: `{project_id,project_name,members:[{member_id,user_id?,name,todos_done,todos_total,contribution,score,speak_seconds,ai_comment?}],total_todos,done_todos,completion_rate,meeting_count,overall_comment?}`
- 주의: `completion_rate`는 이미 백분율(0~100). 프론트에서 ×100 금지.

### Notification (`/`) — Yes
| GET | /notifications | — | `NotificationResponse[]` `{id,type,title,body,project,time,read}` (todo마감/회의/초대/친구요청 동적 합성) |
| POST | /notifications/read | `{notification_id}` | 204 |
| POST | /users/push-token | `{token}` | 204 (모바일 AuthContext에서 사용) |

### Friend (`/friends`) — Yes
| GET | /friends | — | `FriendResponse[]{friendship_id,user_id,username,name}` |
| GET | /friends/requests | — | `FriendRequestResponse[]{friendship_id,user_id,username,name}` (pending만) |
| GET | /friends/search?username= | — | `UserSearchResponse{user_id,username,name}` (없으면 404) |
| POST | /friends/request | `{username?,user_id?}` | `FriendRequestResponse` 201 |
| POST | /friends/{friendship_id}/accept | — | 204 |
| DELETE | /friends/{friendship_id} | — | 204 |

### Chat (`/chat`) — Yes
| GET | /chat/rooms | — | `ChatRoomResponse[]{id,type,name,project_id?,member_count,last_message?,last_message_at?,unread_count}` |
| POST | /chat/rooms/direct | `{friend_user_id}` | `ChatRoomResponse` |
| POST | /chat/rooms/project/{project_id} | — | `ChatRoomResponse` |
| GET | /chat/rooms/{room_id}/members | — | `RoomMemberResponse[]{user_id,name,is_me}` |
| GET | /chat/rooms/{room_id}/messages | — | `MessageResponse[]{id,room_id,sender_id,sender_name,content,created_at,attachment_type?,attachment_name?,attachment_url?,attachment_mime?}` |
| POST | /chat/rooms/{room_id}/messages | `{content}` | `MessageResponse` 201 |
| GET | /chat/rooms/{room_id}/read-status | — | `[{user_id,last_read_at}]` (response_model 없음) |
| POST | /chat/rooms/{room_id}/messages/file | multipart `file` | `MessageResponse` 201 **(⚠ M-4)** |
| POST | /chat/rooms/{room_id}/read | — | 204 |
| POST | /chat/rooms/{room_id}/rename | `{name}` | `ChatRoomResponse` |
| POST | /chat/rooms/{room_id}/leave | — | 204 (마지막 멤버면 방 삭제) |
| GET | /chat/rooms/{room_id}/notices | — | `NoticeResponse[]{id,room_id,content,author_name,created_at}` |
| POST | /chat/rooms/{room_id}/notices | `{content}` | `NoticeResponse` 201 |
| DELETE | /chat/notices/{notice_id} | — | 204 **(⚠ M-3 작성자 제한 없음)** |
| GET | /chat/rooms/{room_id}/polls | — | `PollResponse[]{id,room_id,question,options[],counts[],total_votes,my_vote?,author_name,closed,created_at}` |
| POST | /chat/rooms/{room_id}/polls | `{question,options[]}` | `PollResponse` 201 |
| POST | /chat/polls/{poll_id}/vote | `{option_index}` | `PollResponse` |
| DELETE | /chat/polls/{poll_id} | — | 204 **(⚠ M-3)** |

### Invitation (`/invitations`) — Yes
| GET | /invitations | — | `InvitationResponse[]{member_id,project_id,project_name,invited_by,...}` (pending project_members) |
| POST | /invitations/{member_id}/accept | `{roles[]}` | 204 |
| DELETE | /invitations/{member_id}/decline | — | 204 |

### Drive (`/drive`) — Yes
| GET | /drive/folders?project_id=&parent_id= | — | `FolderResponse[]{id,name,project_id?,parent_id?,created_at}` |
| POST | /drive/folders | `{name,project_id?,parent_id?}` | `FolderResponse` 201 |
| DELETE | /drive/folders/{folder_id} | — | 204 |
| POST | /drive/folders/{folder_id}/move | `{target_folder_id?}` | `FolderResponse` |
| POST | /drive/folders/{folder_id}/rename | `{name}` | `FolderResponse` |
| GET | /drive/files?project_id=&folder_id= | — | `FileResponse[]{id,name,mime_type?,size,project_id?,folder_id?,url?,created_at}` |
| POST | /drive/files | multipart `file,project_id?,folder_id?` | `FileResponse` 201 **(⚠ M-4)** |
| GET | /drive/files/{file_id}/download | — | `{url}` (response_model 없음) |
| DELETE | /drive/files/{file_id} | — | 204 |
| POST | /drive/files/{file_id}/move | `{target_folder_id?}` | `FileResponse` |
| POST | /drive/files/{file_id}/rename | `{name}` | `FileResponse` |
| POST | /drive/auto-organize | `{...}` | (response_model 없음, AI 정리) |

### MeetPoll / When2Meet (`/`) — Yes
| GET | /projects/{project_id}/meet-polls | — | `MeetPollResponse[]{id,project_id,title,dates[],start_hour,end_hour,created_at,respondent_count}` |
| POST | /projects/{project_id}/meet-polls | `{title,dates[],start_hour=9,end_hour=22}` | `MeetPollResponse` 201 |
| GET | /meet-polls/{poll_id} | — | `MeetPollDetail{...,counts{},total_respondents,my_slots[],best_slots[],respondents[]}` |
| POST | /meet-polls/{poll_id}/availability | `{slots[]}` | `MeetPollDetail` |
| DELETE | /meet-polls/{poll_id} | — | 204 **(⚠ M-3 작성자 제한 없음)** |

---

## 부록: 2단계(프론트엔드 점검) 체크포인트 제안
- `completion_rate` ×100 중복(웹/PDF) 회귀 여부
- `report.members[].user_id`로 "내 점수/순위" 매칭(이미 수정됨) — 계정 미연결 멤버 fallback
- `MeetingAPI.create`(POST /meetings) 사용처 0 확인 → 제거 가능 여부
- multipart 엔드포인트(파일/오디오) 클라이언트가 Content-Type 수동 지정하지 않는지
- 공지/투표/일정조율 삭제 버튼을 작성자/방장에게만 노출하는지(M-3 UI 측 완화)
