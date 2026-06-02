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

export const BASE_URL = "http://192.168.0.13:8000";

// ── 토큰 인메모리 저장소 ────────────────────────────────────────
// 앱 재시작 시 초기화됨. 실제 운영 시 expo-secure-store 사용 권장.
let _accessToken: string | null = null;

export const TokenStore = {
  get: () => _accessToken,
  set: (token: string) => {
    _accessToken = token;
  },
  clear: () => {
    _accessToken = null;
  },
};

// ── HTTP 헬퍼 ──────────────────────────────────────────────────
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
};

// ── Projects API ───────────────────────────────────────────
export interface MemberDTO {
  id: string;
  name: string;
  roles: string[];
}

export interface ProjectDTO {
  id: string;
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
  members: { name: string; roles: string[] }[];
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
