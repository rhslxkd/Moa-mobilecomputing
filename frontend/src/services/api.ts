/**
 * src/services/api.ts
 *
 * MOA 백엔드 API 클라이언트
 *
 * BASE_URL 설정 가이드:
 *   - iOS 시뮬레이터: "http://127.0.0.1:8000"
 *   - Android 에뮬레이터: "http://10.0.2.2:8000"
 *   - 실제 기기: "http://[내 맥 IP]:8000"  (예: "http://192.168.0.5:8000")
 */

export const BASE_URL = "https://moa-mobilecomputing-production.up.railway.app";

// ── 토큰 저장소 (SecureStore 영구 저장) ────────────────────────
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "moa_access_token";
const REFRESH_KEY = "moa_refresh_token";

// 메모리 캐시 — 매 요청마다 SecureStore 호출 방지
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const TokenStore = {
  get: () => _accessToken,
  set: async (token: string) => {
    _accessToken = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  setRefresh: async (token: string) => {
    _refreshToken = token;
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  },
  load: async () => {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    _accessToken = stored;
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
    _refreshToken = storedRefresh;
    return stored;
  },
  clear: async () => {
    _accessToken = null;
    _refreshToken = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

// ── HTTP 헬퍼 ──────────────────────────────────────────────────
let _isRefreshing = false;

async function tryRefreshToken(): Promise<string | null> {
  if (!_refreshToken || _isRefreshing) return null;
  _isRefreshing = true;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      await TokenStore.set(data.access_token);
      if (data.refresh_token) await TokenStore.setRefresh(data.refresh_token);
      return data.access_token;
    }
  } catch {}
  finally { _isRefreshing = false; }
  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  overrideToken?: string,
): Promise<T> {
  const authToken = overrideToken ?? _accessToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 토큰 만료 시 자동 갱신 후 재시도
  if (res.status === 401 && !overrideToken) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers: retryHeaders });
      const retryData = await retryRes.json().catch(() => ({}));
      if (!retryRes.ok) {
        const detail = retryData?.detail;
        throw new Error(typeof detail === "string" ? detail : "서버 오류가 발생했습니다.");
      }
      return retryData as T;
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join(", ")
          : "서버 오류가 발생했습니다.";
    throw new Error(message);
  }

  return data as T;
}

// ── 응답 타입 ──────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}

// ── Auth API ───────────────────────────────────────────────────
export const AuthAPI = {
  /** 회원가입 → 이메일로 OTP 발송 */
  signup: (body: {
    username: string;
    email: string;
    password: string;
    terms_agreed: boolean;
    privacy_agreed: boolean;
    marketing_agreed: boolean;
  }) =>
    request<MessageResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 이메일 OTP 인증 → 토큰 반환 */
  verifyEmail: (body: { email: string; token: string }) =>
    request<TokenResponse>("/auth/signup/verify-email", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 로그인 → 토큰 반환 */
  login: (body: { username: string; password: string }) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 이름 설정 (온보딩 Step 3) */
  setupName: (body: { last_name: string; first_name: string }) =>
    request<MessageResponse>("/auth/setup/name", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 소속 설정 (온보딩 Step 2) */
  setupAffiliation: (body: {
    affiliation_type: string;
    organization_name?: string;
    department?: string;
    student_id?: string;
  }) =>
    request<MessageResponse>("/auth/setup/affiliation", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 아이디 찾기: OTP 발송 */
  findIdSendOtp: (body: { email: string }) =>
    request<MessageResponse>("/auth/find-id/send-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 아이디 찾기: OTP 인증 → 아이디 반환 */
  findIdVerify: (body: { email: string; token: string }) =>
    request<{ username: string }>("/auth/find-id/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 비밀번호 찾기: OTP 발송 */
  findPasswordSendOtp: (body: { email: string; username: string }) =>
    request<MessageResponse>("/auth/find-password/send-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 비밀번호 찾기: OTP 인증 → 재설정용 토큰 반환 */
  findPasswordVerify: (body: {
    email: string;
    username: string;
    token: string;
  }) =>
    request<TokenResponse>("/auth/find-password/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 내 프로필 조회 */
  getMe: () =>
    request<{
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      email: string;
      affiliation_type: string | null;
      organization_name: string | null;
      department: string | null;
      student_id: string | null;
      onboarding_completed: boolean;
    }>("/auth/me", { method: "GET" }),

  /** 비밀번호 재설정 (재설정 토큰 필요) */
  resetPassword: (body: { new_password: string }, resetToken: string) =>
    request<MessageResponse>(
      "/auth/reset-password",
      { method: "POST", body: JSON.stringify(body) },
      resetToken,
    ),

  /** 프로필(이름/소속) 수정 */
  updateProfile: (body: { name: string; organization_name?: string; department?: string; student_id?: string }) =>
    request<MessageResponse>("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),

  /** 계정 삭제 */
  deleteAccount: () => request<MessageResponse>("/auth/account", { method: "DELETE" }),

  /** 비밀번호 변경 (현재 비번 검증) */
  changePassword: (body: { current_password: string; new_password: string }) =>
    request<MessageResponse>("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),

  /** 아이디 변경 (비번 검증) */
  changeUsername: (body: { new_username: string; password: string }) =>
    request<MessageResponse>("/auth/change-username", { method: "POST", body: JSON.stringify(body) }),
};

// ── Todo API ───────────────────────────────────────────────
export interface TodoDTO {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  project_name: string | null;
  assignee_member_ids: string[];
  assignee_names: string[];
  done: boolean;
  due_date: string | null;   // "YYYY-MM-DD"
  start_date: string | null;
  difficulty: number;        // 1=하 2=중 3=상
}

export const TodoAPI = {
  list: () =>
    request<TodoDTO[]>("/todos", { method: "GET" }),

  listByProject: (projectId: string) =>
    request<TodoDTO[]>(`/todos/project/${projectId}`, { method: "GET" }),

  create: (body: {
    title: string;
    description?: string;
    project_id?: string;
    assignee_member_ids?: string[];
    due_date?: string;
    start_date?: string;
    difficulty?: number;
  }) =>
    request<TodoDTO>("/todos", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: {
    title?: string;
    description?: string;
    done?: boolean;
    due_date?: string;
    difficulty?: number;
    assignee_member_ids?: string[];
  }) =>
    request<TodoDTO>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  toggleDone: (id: string) =>
    request<TodoDTO>(`/todos/${id}/done`, { method: "PATCH" }),

  delete: (id: string) =>
    request<void>(`/todos/${id}`, { method: "DELETE" }),
};

// ── Meeting API ────────────────────────────────────────────
export interface MeetingParticipantDTO {
  id: string;
  name: string;
  speak_time_seconds: number;
  member_id: string | null;
  speaker_label?: string | null;
}

export interface MeetingAttendanceDTO {
  user_id: string;
  member_id: string | null;
  name: string;
  joined_at: string | null;
  late_seconds: number;
  reason: string | null;
}

export interface MeetingAbsenteeDTO {
  member_id: string | null;
  user_id: string | null;
  name: string;
  reason: string | null;
}

export interface MeetingActionItemDTO {
  title: string;
  date: string | null;
  added: boolean;
}

export interface MeetingDTO {
  id: string;
  title: string;
  project_id: string | null;
  project_name: string | null;
  duration_seconds: number;
  summary: string[];
  transcript: string | null;
  keywords: string[];
  speaker_stats: Record<string, number>;
  speaker_samples: Record<string, string>;
  participants: MeetingParticipantDTO[];
  started_at: string | null;
  attendance: MeetingAttendanceDTO[];
  absentees: MeetingAbsenteeDTO[];
  action_items: MeetingActionItemDTO[];
  created_at: string;
}

export const MeetingAPI = {
  list: (projectId?: string) =>
    request<MeetingDTO[]>(
      `/meetings${projectId ? `?project_id=${projectId}` : ""}`,
      { method: "GET" },
    ),

  create: (body: {
    title: string;
    project_id?: string;
    duration_seconds: number;
    summary?: string[];
    participants?: { name: string; speak_time_seconds: number; member_id?: string }[];
  }) =>
    request<MeetingDTO>("/meetings", { method: "POST", body: JSON.stringify(body) }),

  get: (id: string) =>
    request<MeetingDTO>(`/meetings/${id}`, { method: "GET" }),

  delete: (id: string) =>
    request<void>(`/meetings/${id}`, { method: "DELETE" }),

  /** 화자번호 → 멤버 수동 매칭 */
  setSpeakerMapping: (id: string, mappings: { speaker: string; member_id?: string }[]) =>
    request<MeetingDTO>(`/meetings/${id}/speaker-mapping`, {
      method: "POST",
      body: JSON.stringify({ mappings }),
    }),

  /** 녹음 시작 시 회의 생성 (QR 출석용) */
  start: (body: { title?: string; project_id?: string }) =>
    request<MeetingDTO>("/meetings/start", { method: "POST", body: JSON.stringify(body) }),

  /** QR 스캔 → 출석 */
  attend: (id: string) =>
    request<{ ok: boolean; late_seconds: number }>(`/meetings/${id}/attend`, { method: "POST" }),

  /** 출석 현황 */
  attendance: (id: string) =>
    request<{ attendees: MeetingAttendanceDTO[]; absentees: MeetingAbsenteeDTO[] }>(
      `/meetings/${id}/attendance`, { method: "GET" },
    ),

  /** 종료 → 사유 저장 + duration */
  finalize: (id: string, body: { duration_seconds: number; reasons: { user_id?: string; member_id?: string; reason: string }[] }) =>
    request<MeetingDTO>(`/meetings/${id}/finalize`, { method: "POST", body: JSON.stringify(body) }),

  /** 회의 할 일 → Todo 추가 (제목/담당자 지정 가능) */
  addActionItem: (id: string, index: number, body?: { title?: string; assignee_member_id?: string }) =>
    request<MeetingDTO>(`/meetings/${id}/action-items/${index}/add`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  /** 오디오 업로드 → 다글로 전사 + GPT 요약 */
  uploadAudio: async (id: string, audioUri: string): Promise<MeetingDTO> => {
    const form = new FormData();
    const filename = audioUri.split("/").pop() || "audio.m4a";
    const ext = filename.split(".").pop()?.toLowerCase() || "m4a";
    form.append("file", {
      uri: audioUri,
      name: filename,
      type: `audio/${ext === "m4a" ? "m4a" : ext}`,
    } as any);

    const res = await fetch(`${BASE_URL}/meetings/${id}/audio`, {
      method: "POST",
      headers: {
        ...(TokenStore.get() ? { Authorization: `Bearer ${TokenStore.get()}` } : {}),
      },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail ?? "오디오 업로드에 실패했습니다.");
    }
    return data as MeetingDTO;
  },
};

// ── Projects API ───────────────────────────────────────────
export interface MemberDTO {
  id: string;
  user_id: string | null;
  name: string;
  roles: string[];
}

export interface ProjectDTO {
  id: string;
  owner_id: string;
  name: string;
  emoji: string;
  color: string;
  status: "active" | "upcoming" | "completed";
  start_date: string;      // "YYYY.MM.DD"
  end_date: string;        // "YYYY.MM.DD"
  days_left: number;
  member_count: number;
  members: MemberDTO[];
  has_chat_alert: boolean;
  has_todo_alert: boolean;
}

export interface ProjectCreateBody {
  name: string;
  emoji: string;
  color: string;
  status: "active" | "upcoming" | "completed";
  start_date: string;      // "YYYY.MM.DD"
  end_date: string;        // "YYYY.MM.DD"
  members: { id?: string; user_id?: string; name: string; roles: string[] }[];
}

export type ProjectUpdateBody = Partial<ProjectCreateBody>;

export const ProjectAPI = {
  list: () =>
    request<ProjectDTO[]>("/projects", { method: "GET" }),

  create: (body: ProjectCreateBody) =>
    request<ProjectDTO>("/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  get: (id: string) =>
    request<ProjectDTO>(`/projects/${id}`, { method: "GET" }),

  update: (id: string, body: ProjectUpdateBody) =>
    request<ProjectDTO>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),
};

// ── When2Meet (일정 조율) API ───────────────────────────────
export interface MeetPollDTO {
  id: string;
  project_id: string;
  title: string;
  dates: string[];         // "YYYY-MM-DD"
  start_hour: number;
  end_hour: number;
  created_at: string;
  respondent_count: number;
  can_delete: boolean;
}

export interface MeetPollRespondentDTO {
  user_id: string;
  name: string;
  slots: string[];
}

export interface MeetPollDetailDTO extends MeetPollDTO {
  counts: Record<string, number>;   // slot -> 가능 인원수
  total_respondents: number;
  my_slots: string[];
  best_slots: string[];
  respondents: MeetPollRespondentDTO[];
}

export const MeetPollAPI = {
  listByProject: (projectId: string) =>
    request<MeetPollDTO[]>(`/projects/${projectId}/meet-polls`, { method: "GET" }),

  create: (projectId: string, body: { title: string; dates: string[]; start_hour: number; end_hour: number }) =>
    request<MeetPollDTO>(`/projects/${projectId}/meet-polls`, {
      method: "POST", body: JSON.stringify(body),
    }),

  get: (pollId: string) =>
    request<MeetPollDetailDTO>(`/meet-polls/${pollId}`, { method: "GET" }),

  setAvailability: (pollId: string, slots: string[]) =>
    request<MeetPollDetailDTO>(`/meet-polls/${pollId}/availability`, {
      method: "POST", body: JSON.stringify({ slots }),
    }),

  delete: (pollId: string) =>
    request<void>(`/meet-polls/${pollId}`, { method: "DELETE" }),
};

// ── Report API ─────────────────────────────────────────────
export interface MemberReportDTO {
  member_id: string;
  user_id: string | null;
  name: string;
  todos_done: number;
  todos_total: number;
  contribution: number;
  score: number;
  speak_seconds: number;
  ai_comment: string | null;
}

export interface ReportDTO {
  project_id: string;
  project_name: string;
  members: MemberReportDTO[];
  total_todos: number;
  done_todos: number;
  completion_rate: number;
  meeting_count: number;
  overall_comment: string | null;
}

export const ReportAPI = {
  get: (projectId: string) =>
    request<ReportDTO>(`/reports/${projectId}`, { method: "GET" }),

  /** 저장된 프로젝트별 내 기여도 점수 (AI 없이 빠름). { [projectId]: score } */
  myScores: () =>
    request<Record<string, number>>(`/reports/my-scores`, { method: "GET" }),
};

// ── Notification API ───────────────────────────────────────
export interface NotificationDTO {
  id: string;
  type: "todo" | "mention" | "meeting" | "report";
  title: string;
  body: string;
  project: string;
  time: string;
  read: boolean;
}

export const NotificationAPI = {
  list: () =>
    request<NotificationDTO[]>("/notifications", { method: "GET" }),

  markRead: (notificationId: string) =>
    request<void>("/notifications/read", {
      method: "POST",
      body: JSON.stringify({ notification_id: notificationId }),
    }),
};

// ── Chat API ───────────────────────────────────────────────
export interface ChatRoomDTO {
  id: string;
  type: "project" | "direct";
  name: string;
  project_id: string | null;
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessageDTO {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  attachment_type: "image" | "file" | null;
  attachment_name: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
}

export const ChatAPI = {
  rooms: () =>
    request<ChatRoomDTO[]>("/chat/rooms", { method: "GET" }),

  createDirect: (friendUserId: string) =>
    request<ChatRoomDTO>("/chat/rooms/direct", {
      method: "POST",
      body: JSON.stringify({ friend_user_id: friendUserId }),
    }),

  openProject: (projectId: string) =>
    request<ChatRoomDTO>(`/chat/rooms/project/${projectId}`, { method: "POST" }),

  messages: (roomId: string) =>
    request<MessageDTO[]>(`/chat/rooms/${roomId}/messages`, { method: "GET" }),

  roomMembers: (roomId: string) =>
    request<{ user_id: string; name: string; is_me: boolean }[]>(
      `/chat/rooms/${roomId}/members`, { method: "GET" },
    ),

  send: (roomId: string, content: string) =>
    request<MessageDTO>(`/chat/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  markAsRead: (roomId: string) =>
    request<void>(`/chat/rooms/${roomId}/read`, { method: "POST" }),

  /** 파일/사진 전송 */
  sendFile: async (roomId: string, uri: string, name: string, mime: string): Promise<MessageDTO> => {
    const form = new FormData();
    form.append("file", { uri, name, type: mime } as any);
    const res = await fetch(`${BASE_URL}/chat/rooms/${roomId}/messages/file`, {
      method: "POST",
      headers: { ...(TokenStore.get() ? { Authorization: `Bearer ${TokenStore.get()}` } : {}) },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail ?? "파일 전송에 실패했습니다.");
    return data as MessageDTO;
  },

  getReadStatus: (roomId: string) =>
    request<{ user_id: string; last_read_at: string | null }[]>(
      `/chat/rooms/${roomId}/read-status`,
      { method: "GET" },
    ),

  // ── 채팅방 설정 ──
  renameRoom: (roomId: string, name: string) =>
    request<ChatRoomDTO>(`/chat/rooms/${roomId}/rename`, { method: "POST", body: JSON.stringify({ name }) }),

  leaveRoom: (roomId: string) =>
    request<void>(`/chat/rooms/${roomId}/leave`, { method: "POST" }),

  // ── 공지 ──
  listNotices: (roomId: string) =>
    request<NoticeDTO[]>(`/chat/rooms/${roomId}/notices`, { method: "GET" }),

  createNotice: (roomId: string, content: string) =>
    request<NoticeDTO>(`/chat/rooms/${roomId}/notices`, {
      method: "POST", body: JSON.stringify({ content }),
    }),

  deleteNotice: (noticeId: string) =>
    request<void>(`/chat/notices/${noticeId}`, { method: "DELETE" }),

  // ── 투표 ──
  listPolls: (roomId: string) =>
    request<PollDTO[]>(`/chat/rooms/${roomId}/polls`, { method: "GET" }),

  createPoll: (roomId: string, question: string, options: string[]) =>
    request<PollDTO>(`/chat/rooms/${roomId}/polls`, {
      method: "POST", body: JSON.stringify({ question, options }),
    }),

  votePoll: (pollId: string, optionIndex: number) =>
    request<PollDTO>(`/chat/polls/${pollId}/vote`, {
      method: "POST", body: JSON.stringify({ option_index: optionIndex }),
    }),

  deletePoll: (pollId: string) =>
    request<void>(`/chat/polls/${pollId}`, { method: "DELETE" }),
};

export interface NoticeDTO {
  id: string;
  room_id: string;
  content: string;
  author_name: string;
  created_at: string;
  can_delete: boolean;
}

export interface PollDTO {
  id: string;
  room_id: string;
  question: string;
  options: string[];
  counts: number[];
  total_votes: number;
  my_vote: number | null;
  author_name: string;
  closed: boolean;
  created_at: string;
  can_delete: boolean;
}

// ── Drive API ──────────────────────────────────────────────
export interface DriveFolderDTO {
  id: string;
  name: string;
  item_count: number;
  project_id: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface DriveFileDTO {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  project_id: string | null;
  folder_id: string | null;
  created_at: string;
}

export const DriveAPI = {
  listFolders: (params: { projectId?: string; parentId?: string }) => {
    const q = new URLSearchParams();
    if (params.projectId) q.set("project_id", params.projectId);
    if (params.parentId) q.set("parent_id", params.parentId);
    const qs = q.toString();
    return request<DriveFolderDTO[]>(`/drive/folders${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  createFolder: (body: { name: string; project_id?: string; parent_id?: string }) =>
    request<DriveFolderDTO>("/drive/folders", { method: "POST", body: JSON.stringify(body) }),

  deleteFolder: (id: string) =>
    request<void>(`/drive/folders/${id}`, { method: "DELETE" }),

  listFiles: (params: { projectId?: string; folderId?: string }) => {
    const q = new URLSearchParams();
    if (params.projectId) q.set("project_id", params.projectId);
    if (params.folderId) q.set("folder_id", params.folderId);
    const qs = q.toString();
    return request<DriveFileDTO[]>(`/drive/files${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  /** 파일 업로드 (FormData) */
  uploadFile: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    ctx: { projectId?: string; folderId?: string },
  ): Promise<DriveFileDTO> => {
    const form = new FormData();
    form.append("file", { uri: fileUri, name: fileName, type: mimeType } as any);
    if (ctx.projectId) form.append("project_id", ctx.projectId);
    if (ctx.folderId) form.append("folder_id", ctx.folderId);

    const res = await fetch(`${BASE_URL}/drive/files`, {
      method: "POST",
      headers: { ...(TokenStore.get() ? { Authorization: `Bearer ${TokenStore.get()}` } : {}) },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail ?? "파일 업로드에 실패했습니다.");
    return data as DriveFileDTO;
  },

  downloadUrl: (id: string) =>
    request<{ url: string }>(`/drive/files/${id}/download`, { method: "GET" }),

  deleteFile: (id: string) =>
    request<void>(`/drive/files/${id}`, { method: "DELETE" }),

  moveFile: (id: string, targetFolderId: string | null) =>
    request<DriveFileDTO>(`/drive/files/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ target_folder_id: targetFolderId }),
    }),

  moveFolder: (id: string, targetFolderId: string | null) =>
    request<DriveFolderDTO>(`/drive/folders/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ target_folder_id: targetFolderId }),
    }),

  /** AI 자동 정리 (주제별 폴더로 묶기) */
  autoOrganize: (ctx: { projectId?: string; folderId?: string }) =>
    request<{ moved: number; folders: number; message: string }>("/drive/auto-organize", {
      method: "POST",
      body: JSON.stringify({ project_id: ctx.projectId, folder_id: ctx.folderId }),
    }),

  renameFile: (id: string, name: string) =>
    request<DriveFileDTO>(`/drive/files/${id}/rename`, { method: "POST", body: JSON.stringify({ name }) }),

  renameFolder: (id: string, name: string) =>
    request<DriveFolderDTO>(`/drive/folders/${id}/rename`, { method: "POST", body: JSON.stringify({ name }) }),
};

// ── Invitation API ─────────────────────────────────────────
export interface InvitationDTO {
  member_id: string;
  project_id: string;
  project_name: string;
  invited_by: string;
  created_at: string;
}

export const InvitationAPI = {
  list: () =>
    request<InvitationDTO[]>("/invitations", { method: "GET" }),

  accept: (memberId: string, roles: string[]) =>
    request<void>(`/invitations/${memberId}/accept`, {
      method: "POST",
      body: JSON.stringify({ roles }),
    }),

  decline: (memberId: string) =>
    request<void>(`/invitations/${memberId}/decline`, { method: "DELETE" }),
};

// ── Friends API ────────────────────────────────────────────
export interface FriendDTO {
  friendship_id: string;
  user_id: string;
  username: string;
  name: string;
}

export interface FriendRequestDTO {
  friendship_id: string;
  user_id: string;
  username: string;
  name: string;
}

export interface UserSearchDTO {
  user_id: string;
  username: string;
  name: string;
}

export const FriendsAPI = {
  list: () =>
    request<FriendDTO[]>("/friends", { method: "GET" }),

  requests: () =>
    request<FriendRequestDTO[]>("/friends/requests", { method: "GET" }),

  search: (username: string) =>
    request<UserSearchDTO>(`/friends/search?username=${encodeURIComponent(username)}`, { method: "GET" }),

  request: (username: string) =>
    request<FriendRequestDTO>("/friends/request", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  accept: (friendshipId: string) =>
    request<void>(`/friends/${friendshipId}/accept`, { method: "POST" }),

  remove: (friendshipId: string) =>
    request<void>(`/friends/${friendshipId}`, { method: "DELETE" }),
};

// ── Member API ─────────────────────────────────────────────
export const MemberAPI = {
  list: (projectId: string) =>
    request<MemberDTO[]>(`/projects/${projectId}/members`, { method: "GET" }),

  add: (projectId: string, body: { name: string; roles: string[]; user_id?: string }) =>
    request<MemberDTO>(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (memberId: string, body: { name?: string; roles?: string[] }) =>
    request<MemberDTO>(`/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (memberId: string) =>
    request<void>(`/members/${memberId}`, { method: "DELETE" }),
};

// ── Push Token API ──────────────────────────────────────────
export const PushAPI = {
  registerToken: (token: string) =>
    request<void>("/users/push-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};
