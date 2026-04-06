/**
 * app/(onboarding)/signin.tsx
 *
 * 피그마 SignIn 화면 기반
 *
 * 레이아웃:
 *   - 좌상단: MOA 로고 아이콘 + "MOA" 텍스트
 *   - 헤딩: "팀플의 모든 것," / "MOA 시작하기"
 *   - InputBox: 아이디, 비밀번호
 *   - 링크: 회원가입 | 아이디 / 비밀번호 찾기
 *   - 하단 고정: 로그인 Button
 *
 * 플로우:
 *   로그인 → /(tabs) (메인)
 *   회원가입 → /(onboarding)/usersetup
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";
import MoaLogo from "@/components/common/MoaLogo";

// ── 메인 화면 ──────────────────────────────
export default function SignInScreen() {
  const C = useTheme();
  const router = useRouter();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [idError, setIdError] = useState("");
  const [pwError, setPwError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    let valid = true;

    if (!id.trim()) {
      setIdError("아이디를 입력해주세요.");
      valid = false;
    } else {
      setIdError("");
    }

    if (!password) {
      setPwError("비밀번호를 입력해주세요.");
      valid = false;
    } else {
      setPwError("");
    }

    if (!valid) return;

    setLoading(true);
    // TODO: 실제 로그인 API 연결
    setTimeout(() => {
      setLoading(false);
      router.replace("/(tabs)");
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 상단 로고 ── */}
          <View style={styles.logoRow}>
            <MoaLogo size={48} />
          </View>

          {/* ── 헤딩 ── */}
          <View style={styles.heading}>
            <Text style={[styles.headingLine1, { color: C.text }]}>
              팀플의 모든 것,
            </Text>
            <Text style={[styles.headingLine2, { color: C.text }]}>
              <Text style={{ color: C.primary }}>MOA </Text>
              시작하기
            </Text>
          </View>

          {/* ── 입력 폼 ── */}
          <View style={styles.form}>
            <InputBox
              label="아이디"
              placeholder="아이디를 입력해주세요."
              value={id}
              onChangeText={(t) => { setId(t); setIdError(""); }}
              error={idError}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="next"
            />
            <InputBox
              label="비밀번호"
              placeholder="비밀번호를 입력해주세요."
              value={password}
              onChangeText={(t) => { setPassword(t); setPwError(""); }}
              error={pwError}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* 회원가입 | 아이디/비밀번호 찾기 */}
            <View style={styles.linkRow}>
              <TouchableOpacity
                onPress={() => router.push("/(onboarding)/signup" as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.linkPrimary, { color: C.primary }]}>
                  회원가입
                </Text>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: C.border }]} />

              <TouchableOpacity
                onPress={() => router.push("/(onboarding)/find-account" as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.linkMuted, { color: C.textMuted }]}>
                  아이디 / 비밀번호 찾기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* ── 하단 고정 로그인 버튼 ── */}
        <View style={[styles.footer, { backgroundColor: C.bg }]}>
          <Button
            label="로그인"
            onPress={handleLogin}
            loading={loading}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    flexGrow: 1,
  },

  // 로고
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 48,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // 헤딩
  heading: {
    marginBottom: 48,
    gap: 2,
  },
  headingLine1: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 42,
  },
  headingLine2: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 42,
  },

  // 폼
  form: {
    gap: 20,
  },

  // 링크 행
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  linkPrimary: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 12,
  },
  linkMuted: {
    fontSize: 14,
    fontWeight: "400",
  },

  // 하단 버튼
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
