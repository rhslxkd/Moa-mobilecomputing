/**
 * app/(onboarding)/signin.tsx
 * 로그인 화면 — POST /auth/login 연결
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";
import MoaLogo from "@/components/common/MoaLogo";
import { AuthAPI, TokenStore } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInScreen() {
  const C = useTheme();
  const router = useRouter();
  const { fetchUser } = useAuth();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [idError, setIdError] = useState("");
  const [pwError, setPwError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
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
    try {
      const data = await AuthAPI.login({ username: id.trim(), password });
      TokenStore.set(data.access_token);
      await fetchUser();
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = err?.message ?? "로그인에 실패했습니다.";
      // 서버 에러 메시지를 필드별로 분류
      if (msg.includes("아이디") || msg.includes("username")) {
        setIdError(msg);
      } else if (msg.includes("비밀번호") || msg.includes("password")) {
        setPwError(msg);
      } else {
        Alert.alert("로그인 실패", msg);
      }
    } finally {
      setLoading(false);
    }
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
          <View style={styles.logoRow}>
            <MoaLogo size={48} />
          </View>

          <View style={styles.heading}>
            <Text style={[styles.headingLine1, { color: C.text }]}>
              팀플의 모든 것,
            </Text>
            <Text style={[styles.headingLine2, { color: C.text }]}>
              <Text style={{ color: C.primary }}>MOA </Text>
              시작하기
            </Text>
          </View>

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

        <View style={[styles.footer, { backgroundColor: C.bg }]}>
          <Button label="로그인" onPress={handleLogin} loading={loading} />
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
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 48,
  },
  heading: { marginBottom: 48, gap: 2 },
  headingLine1: { fontSize: 32, fontWeight: "700", lineHeight: 42 },
  headingLine2: { fontSize: 32, fontWeight: "700", lineHeight: 42 },
  form: { gap: 20 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  linkPrimary: { fontSize: 14, fontWeight: "600" },
  divider: { width: 1, height: 12 },
  linkMuted: { fontSize: 14, fontWeight: "400" },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
