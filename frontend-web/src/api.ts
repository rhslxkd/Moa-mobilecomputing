export const BASE_URL = "/api";

const TOKEN_KEY = "moa_access_token";

export const TokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, options: RequestInit = {}, overrideToken?: string): Promise<T> {
  const authToken = overrideToken ?? TokenStore.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const message = typeof detail === "string" ? detail
      : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(", ")
      : "서버 오류가 발생했습니다.";
    throw new Error(message);
  }
  return data as T;
}

// ── Types ──────────────────────────────────────────────────────
export interface TokenResponse { access_token: string; refresh_token: string; token_type: string; }
export interface MessageResponse { message: string; }

export interface UserProfile {
  id: string; username: string; first_name: string; last_name: string;
  email: string; affiliation_type: string | null; organization_name: string | null;
  department: string | null; student_id: string | null; onboarding_completed: boolean;
}

export interface ProjectDTO {
  id: string; owner_id: string; name: string; emoji: string; color: string;
  status: "active" | "upcoming" | "completed";
  start_date: string; end_date: string; days_left: number;
  member_count: number; members: MemberDTO[];
  has_chat_alert: boolean; has_todo_alert: boolean;
}

export interface MemberDTO { id: string; user_id: string | null; name: string; roles: string[]; }

export interface TodoDTO {
  id: string; title: string; description: string | null;
  project_id: string | null; project_name: string | null;
  assignee_member_id: string | null; assignee_name: string | null;
  assignee_roles: string[]; done: boolean; due_date: string | null;
  start_date: string | null; difficulty: number;
}

export interface NotificationDTO {
  id: string; type: "todo" | "mention" | "meeting" | "report";
  title: string; body: string; project: string; time: string; read: boolean;
}

export interface ChatRoomDTO {
  id: string; type: "project" | "direct"; name: string;
  project_id: string | null; member_count: number;
  last_message: string | null; last_message_at: string | null; unread_count: number;
}

export interface MessageDTO {
  id: string; room_id: string; sender_id: string; sender_name: string;
  content: string; created_at: string;
  attachment_type: "image" | "file" | null; attachment_name: string | null;
  attachment_url: string | null; attachment_mime: string | null;
}

export interface MeetingDTO {
  id: string; title: string; project_id: string | null; project_name: string | null;
  duration_seconds: number; summary: string[]; transcript: string | null;
  keywords: string[]; participants: { id: string; name: string; speak_time_seconds: number; member_id: string | null }[];
  started_at: string | null; created_at: string;
  attendance: { user_id: string; name: string; joined_at: string | null; late_seconds: number; reason: string | null }[];
  absentees: { member_id: string | null; user_id: string | null; name: string; reason: string | null }[];
  action_items: { title: string; date: string | null; added: boolean }[];
}

export interface ReportDTO {
  project_id: string; project_name: string;
  members: { member_id: string; user_id: string | null; name: string; todos_done: number; todos_total: number; contribution: number; score: number; speak_seconds: number; ai_comment: string | null }[];
  total_todos: number; done_todos: number; completion_rate: number;
  meeting_count: number; overall_comment: string | null;
}

export interface MeetPollDTO {
  id: string; project_id: string; title: string; dates: string[];
  start_hour: number; end_hour: number; created_at: string; respondent_count: number;
}

export interface MeetPollDetailDTO extends MeetPollDTO {
  counts: Record<string, number>; total_respondents: number;
  my_slots: string[]; best_slots: string[];
  respondents: { user_id: string; name: string; slots: string[] }[];
}

// ── API ────────────────────────────────────────────────────────
export const AuthAPI = {
  signup: (body: { username: string; email: string; password: string; terms_agreed: boolean; privacy_agreed: boolean; marketing_agreed: boolean }) =>
    request<MessageResponse>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  verifyEmail: (body: { email: string; token: string }) =>
    request<TokenResponse>("/auth/signup/verify-email", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  setupName: (body: { last_name: string; first_name: string }) =>
    request<MessageResponse>("/auth/setup/name", { method: "POST", body: JSON.stringify(body) }),
  setupAffiliation: (body: { affiliation_type: string; organization_name?: string; department?: string; student_id?: string }) =>
    request<MessageResponse>("/auth/setup/affiliation", { method: "POST", body: JSON.stringify(body) }),
  getMe: () => request<UserProfile>("/auth/me", { method: "GET" }),
  updateProfile: (body: { name: string; organization_name?: string; department?: string; student_id?: string }) =>
    request<MessageResponse>("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    request<MessageResponse>("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
  findIdSendOtp: (body: { email: string }) =>
    request<MessageResponse>("/auth/find-id/send-otp", { method: "POST", body: JSON.stringify(body) }),
  findIdVerify: (body: { email: string; token: string }) =>
    request<{ username: string }>("/auth/find-id/verify", { method: "POST", body: JSON.stringify(body) }),
  findPasswordSendOtp: (body: { email: string; username: string }) =>
    request<MessageResponse>("/auth/find-password/send-otp", { method: "POST", body: JSON.stringify(body) }),
  findPasswordVerify: (body: { email: string; username: string; token: string }) =>
    request<TokenResponse>("/auth/find-password/verify", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: (body: { new_password: string }, resetToken: string) =>
    request<MessageResponse>("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }, resetToken),
};

export const ProjectAPI = {
  list: () => request<ProjectDTO[]>("/projects", { method: "GET" }),
  get: (id: string) => request<ProjectDTO>(`/projects/${id}`, { method: "GET" }),
  create: (body: any) => request<ProjectDTO>("/projects", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => request<ProjectDTO>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
};

export const MemberAPI = {
  list: (projectId: string) => request<MemberDTO[]>(`/projects/${projectId}/members`, { method: "GET" }),
  add: (projectId: string, body: { user_id?: string; name: string; roles: string[] }) =>
    request<MemberDTO>(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(body) }),
  update: (memberId: string, body: { name?: string; roles?: string[] }) =>
    request<MemberDTO>(`/members/${memberId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (memberId: string) => request<void>(`/members/${memberId}`, { method: "DELETE" }),
};

export const TodoAPI = {
  list: () => request<TodoDTO[]>("/todos", { method: "GET" }),
  listByProject: (projectId: string) => request<TodoDTO[]>(`/todos/project/${projectId}`, { method: "GET" }),
  create: (body: any) => request<TodoDTO>("/todos", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => request<TodoDTO>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  toggleDone: (id: string) => request<TodoDTO>(`/todos/${id}/done`, { method: "PATCH" }),
  delete: (id: string) => request<void>(`/todos/${id}`, { method: "DELETE" }),
};

export const NotificationAPI = {
  list: () => request<NotificationDTO[]>("/notifications", { method: "GET" }),
  markRead: (id: string) => request<void>("/notifications/read", { method: "POST", body: JSON.stringify({ notification_id: id }) }),
};

export interface NoticeDTO { id: string; room_id: string; content: string; author_name: string; created_at: string; can_delete: boolean; }
export interface PollDTO {
  id: string; room_id: string; question: string; options: string[];
  counts: number[]; total_votes: number; my_vote: number | null;
  author_name: string; closed: boolean; created_at: string; can_delete: boolean;
}

export const ChatAPI = {
  rooms: () => request<ChatRoomDTO[]>("/chat/rooms", { method: "GET" }),
  openProject: (projectId: string) => request<ChatRoomDTO>(`/chat/rooms/project/${projectId}`, { method: "POST" }),
  createDirect: (friendUserId: string) => request<ChatRoomDTO>("/chat/rooms/direct", { method: "POST", body: JSON.stringify({ friend_user_id: friendUserId }) }),
  messages: (roomId: string) => request<MessageDTO[]>(`/chat/rooms/${roomId}/messages`, { method: "GET" }),
  send: (roomId: string, content: string) => request<MessageDTO>(`/chat/rooms/${roomId}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  markRead: (roomId: string) => request<void>(`/chat/rooms/${roomId}/read`, { method: "POST" }),
  leaveRoom: (roomId: string) => request<void>(`/chat/rooms/${roomId}/leave`, { method: "POST" }),
  readStatus: (roomId: string) => request<{ user_id: string; last_read_at: string | null }[]>(`/chat/rooms/${roomId}/read-status`, { method: "GET" }),
  sendFile: async (roomId: string, file: File): Promise<MessageDTO> => {
    const form = new FormData();
    form.append("file", file);
    const token = TokenStore.get();
    const res = await fetch(`${BASE_URL}/chat/rooms/${roomId}/messages/file`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data?.detail as string) || "파일 업로드에 실패했습니다.");
    return data as MessageDTO;
  },
  // 공지
  listNotices: (roomId: string) => request<NoticeDTO[]>(`/chat/rooms/${roomId}/notices`, { method: "GET" }),
  createNotice: (roomId: string, content: string) => request<NoticeDTO>(`/chat/rooms/${roomId}/notices`, { method: "POST", body: JSON.stringify({ content }) }),
  deleteNotice: (noticeId: string) => request<void>(`/chat/notices/${noticeId}`, { method: "DELETE" }),
  // 투표
  listPolls: (roomId: string) => request<PollDTO[]>(`/chat/rooms/${roomId}/polls`, { method: "GET" }),
  createPoll: (roomId: string, question: string, options: string[]) => request<PollDTO>(`/chat/rooms/${roomId}/polls`, { method: "POST", body: JSON.stringify({ question, options }) }),
  votePoll: (pollId: string, optionIndex: number) => request<PollDTO>(`/chat/polls/${pollId}/vote`, { method: "POST", body: JSON.stringify({ option_index: optionIndex }) }),
  deletePoll: (pollId: string) => request<void>(`/chat/polls/${pollId}`, { method: "DELETE" }),
};

export const MeetingAPI = {
  list: (projectId?: string) => request<MeetingDTO[]>(`/meetings${projectId ? `?project_id=${projectId}` : ""}`, { method: "GET" }),
  get: (id: string) => request<MeetingDTO>(`/meetings/${id}`, { method: "GET" }),
  delete: (id: string) => request<void>(`/meetings/${id}`, { method: "DELETE" }),
};

export const ReportAPI = {
  get: (projectId: string) => request<ReportDTO>(`/reports/${projectId}`, { method: "GET" }),
};

export interface FriendDTO {
  friendship_id: string; user_id: string; username: string; name: string;
}
export interface FriendRequestDTO {
  friendship_id: string; user_id: string; username: string; name: string;
}
export interface UserSearchResponse { user_id: string; username: string; name: string; }

export interface FolderDTO { id: string; name: string; project_id: string | null; parent_id: string | null; created_at: string; }
export interface FileDTO { id: string; name: string; mime_type: string | null; size_bytes: number; project_id: string | null; folder_id: string | null; url: string | null; created_at: string; }

export const DriveAPI = {
  folders: (projectId?: string) => request<FolderDTO[]>(`/drive/folders${projectId ? `?project_id=${projectId}` : ''}`, { method: 'GET' }),
  createFolder: (name: string, projectId?: string, parentId?: string) =>
    request<FolderDTO>('/drive/folders', { method: 'POST', body: JSON.stringify({ name, project_id: projectId, parent_id: parentId }) }),
  deleteFolder: (id: string) => request<void>(`/drive/folders/${id}`, { method: 'DELETE' }),
  files: (projectId?: string, folderId?: string) => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (folderId) params.set('folder_id', folderId)
    return request<FileDTO[]>(`/drive/files?${params}`, { method: 'GET' })
  },
  deleteFile: (id: string) => request<void>(`/drive/files/${id}`, { method: 'DELETE' }),
  downloadUrl: (id: string) => request<{ url: string }>(`/drive/files/${id}/download`, { method: 'GET' }),
  uploadFile: async (file: File, projectId?: string, folderId?: string): Promise<FileDTO> => {
    const form = new FormData();
    form.append('file', file);
    if (projectId) form.append('project_id', projectId);
    if (folderId) form.append('folder_id', folderId);
    const token = TokenStore.get();
    const res = await fetch(`${BASE_URL}/drive/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data?.detail as string) || '업로드에 실패했습니다.');
    return data as FileDTO;
  },
};

export const FriendAPI = {
  list: () => request<FriendDTO[]>("/friends", { method: "GET" }),
  requests: () => request<FriendRequestDTO[]>("/friends/requests", { method: "GET" }),
  search: (username: string) => request<UserSearchResponse>(`/friends/search?username=${encodeURIComponent(username)}`, { method: "GET" }),
  sendRequest: (userId: string) => request<FriendRequestDTO>("/friends/request", { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  accept: (friendshipId: string) => request<void>(`/friends/${friendshipId}/accept`, { method: "POST" }),
  remove: (friendshipId: string) => request<void>(`/friends/${friendshipId}`, { method: "DELETE" }),
};

export const MeetPollAPI = {
  listByProject: (projectId: string) => request<MeetPollDTO[]>(`/projects/${projectId}/meet-polls`, { method: "GET" }),
  create: (projectId: string, body: { title: string; dates: string[]; start_hour: number; end_hour: number }) =>
    request<MeetPollDTO>(`/projects/${projectId}/meet-polls`, { method: "POST", body: JSON.stringify(body) }),
  get: (pollId: string) => request<MeetPollDetailDTO>(`/meet-polls/${pollId}`, { method: "GET" }),
  setAvailability: (pollId: string, slots: string[]) =>
    request<MeetPollDetailDTO>(`/meet-polls/${pollId}/availability`, { method: "POST", body: JSON.stringify({ slots }) }),
  delete: (pollId: string) => request<void>(`/meet-polls/${pollId}`, { method: "DELETE" }),
};
