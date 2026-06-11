/**
 * src/contexts/AuthContext.tsx
 *
 * 로그인한 유저의 프로필 정보를 앱 전체에서 공유
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AuthAPI, TokenStore, PushAPI } from "@/services/api";
import { registerForPushNotifications } from "@/lib/notifications";

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;       // lastName + firstName
  email: string;
  affiliationType?: string;
  organizationName?: string;
  department?: string;
  studentId?: string;
  onboardingCompleted: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  /** 앱 시작 시 저장된 토큰 복원이 끝났는지 (스플래시 라우팅 판단용) */
  bootstrapped: boolean;
  /** 토큰 저장 후 /auth/me 를 호출해 유저 정보를 채움 */
  fetchUser: () => Promise<void>;
  /** 유저 정보 직접 세팅 (부분 업데이트 등) */
  setUser: (user: UserProfile | null) => void;
  /** 로그아웃 — 토큰·유저 초기화 */
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  bootstrapped: false,
  fetchUser: async () => {},
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const data = await AuthAPI.getMe();
      setUser({
        id: data.id,
        username: data.username,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: `${data.last_name}${data.first_name}`,
        email: data.email,
        affiliationType: data.affiliation_type ?? undefined,
        organizationName: data.organization_name ?? undefined,
        department: data.department ?? undefined,
        studentId: data.student_id ?? undefined,
        onboardingCompleted: data.onboarding_completed,
      });
      // 로그인 성공 후 푸시 토큰 등록
      registerForPushNotifications()
        .then((token) => { if (token) PushAPI.registerToken(token).catch(() => {}); })
        .catch(() => {});
    } catch {
      // 토큰이 없거나 만료된 경우 무시
    }
  }, []);

  // 앱 시작 시 저장된 토큰 복원 후 유저 정보 로드
  useEffect(() => {
    (async () => {
      try {
        const token = await TokenStore.load();
        if (token) await fetchUser();
      } finally {
        setBootstrapped(true);   // 복원 시도 완료 (성공/실패 무관)
      }
    })();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await TokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootstrapped, fetchUser, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
