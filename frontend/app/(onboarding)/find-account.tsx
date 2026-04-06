/**
 * app/(onboarding)/find-account.tsx
 * 아이디 찾기 / 비밀번호 찾기
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
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";
import MoaLogo from "@/components/common/MoaLogo";
import { AuthAPI } from "@/services/api";

// ── 아이디 찾기 ─────────────────────────────
function FindIDTab() {
  const C = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [foundUsername, setFoundUsername] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [phase, setPhase] = useState<"form" | "success">("form");

  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [findLoading, setFindLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) return;
    Keyboard.dismiss();
    setSendLoading(true);
    try {
      await AuthAPI.findIdSendOtp({ email: email.trim() });
      setCodeSent(true);
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "인증번호 발송에 실패했습니다.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!authCode) return;
    Keyboard.dismiss();
    setVerifyLoading(true);
    try {
      const data = await AuthAPI.findIdVerify({ email: email.trim(), token: authCode.trim() });
      setFoundUsername(data.username);
      setVerified(true);
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "인증번호가 올바르지 않습니다.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFindID = () => {
    if (!verified) return;
    setPhase("success");
  };

  if (phase === "success") {
    return (
      <View style={styles.tabContent}>
        <View style={styles.successBox}>
          <Text style={[styles.successLabel, { color: C.textMuted }]}>회원님의 아이디</Text>
          <Text style={[styles.successUsername, { color: C.primary }]}>{foundUsername}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Button label="로그인 화면으로 돌아가기" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.inputRow}>
        <InputBox
          containerStyle={{ flex: 1 }}
          placeholder="이메일을 입력하세요."
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.sideBtn, { backgroundColor: email && !sendLoading ? C.primary : C.bgMuted }]}
          onPress={handleSendCode}
          disabled={!email || sendLoading}
          activeOpacity={0.8}
        >
          <Text style={[styles.sideBtnText, { color: email && !sendLoading ? "#FFF" : C.textMuted }]}>
            {sendLoading ? "발송 중..." : codeSent ? "재발송" : "인증번호 발송"}
          </Text>
        </TouchableOpacity>
      </View>

      {codeSent && (
        <View style={styles.inputRow}>
          <InputBox
            containerStyle={{ flex: 1 }}
            placeholder="인증번호를 입력하세요."
            value={authCode}
            onChangeText={setAuthCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[
              styles.sideBtn,
              { backgroundColor: authCode && !verified && !verifyLoading ? C.primary : C.bgMuted },
            ]}
            onPress={handleVerify}
            disabled={!authCode || verified || verifyLoading}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sideBtnText,
                { color: authCode && !verified && !verifyLoading ? "#FFF" : C.textMuted },
              ]}
            >
              {verifyLoading ? "확인 중..." : verified ? "✓ 완료" : "확인"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }} />
      <Button label="아이디 찾기" onPress={handleFindID} disabled={!verified} />
    </View>
  );
}

// ── 비밀번호 찾기 ───────────────────────────
function FindPWTab() {
  const C = useTheme();
  const router = useRouter();

  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwCheck, setNewPwCheck] = useState("");

  const [phase, setPhase] = useState<"verify" | "reset" | "success">("verify");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email || !id) return;
    Keyboard.dismiss();
    setSendLoading(true);
    try {
      await AuthAPI.findPasswordSendOtp({ email: email.trim(), username: id.trim() });
      setCodeSent(true);
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "인증번호 발송에 실패했습니다.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!authCode) return;
    Keyboard.dismiss();
    setVerifyLoading(true);
    try {
      const data = await AuthAPI.findPasswordVerify({
        email: email.trim(),
        username: id.trim(),
        token: authCode.trim(),
      });
      setResetToken(data.access_token);
      setVerified(true);
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "인증번호가 올바르지 않습니다.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleNextToReset = () => {
    if (!verified) return;
    setPhase("reset");
  };

  const handleResetPassword = async () => {
    if (!newPw || newPw !== newPwCheck) return;
    if (newPw.length < 8) {
      Alert.alert("오류", "비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setResetLoading(true);
    try {
      await AuthAPI.resetPassword({ new_password: newPw }, resetToken);
      setPhase("success");
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "비밀번호 재설정에 실패했습니다.");
    } finally {
      setResetLoading(false);
    }
  };

  if (phase === "success") {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.successText, { color: C.text }]}>
          비밀번호 재설정을 완료하였습니다.
        </Text>
        <View style={{ flex: 1 }} />
        <Button label="로그인 화면으로 돌아가기" onPress={() => router.back()} />
      </View>
    );
  }

  if (phase === "reset") {
    const isResetReady = newPw.length >= 8 && newPw === newPwCheck;
    return (
      <View style={styles.tabContent}>
        <View style={{ gap: 24 }}>
          <InputBox
            label="새로운 비밀번호"
            placeholder="8자 이상 입력해주세요."
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
            textContentType="newPassword"
            autoCapitalize="none"
          />
          <InputBox
            label="비밀번호 확인"
            placeholder="비밀번호를 한 번 더 입력해주세요."
            value={newPwCheck}
            onChangeText={setNewPwCheck}
            secureTextEntry
            textContentType="newPassword"
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }} />
        <Button
          label="비밀번호 재설정"
          onPress={handleResetPassword}
          loading={resetLoading}
          disabled={!isResetReady}
        />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={{ gap: 16 }}>
        <InputBox
          placeholder="아이디를 입력하세요."
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
        />

        <View style={styles.inputRow}>
          <InputBox
            containerStyle={{ flex: 1 }}
            placeholder="이메일을 입력하세요."
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.sideBtn, { backgroundColor: email && id && !sendLoading ? C.primary : C.bgMuted }]}
            onPress={handleSendCode}
            disabled={!email || !id || sendLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.sideBtnText, { color: email && id && !sendLoading ? "#FFF" : C.textMuted }]}>
              {sendLoading ? "발송 중..." : codeSent ? "재발송" : "인증번호 발송"}
            </Text>
          </TouchableOpacity>
        </View>

        {codeSent && (
          <View style={styles.inputRow}>
            <InputBox
              containerStyle={{ flex: 1 }}
              placeholder="인증번호를 입력하세요."
              value={authCode}
              onChangeText={setAuthCode}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[
                styles.sideBtn,
                { backgroundColor: authCode && !verified && !verifyLoading ? C.primary : C.bgMuted },
              ]}
              onPress={handleVerify}
              disabled={!authCode || verified || verifyLoading}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.sideBtnText,
                  { color: authCode && !verified && !verifyLoading ? "#FFF" : C.textMuted },
                ]}
              >
                {verifyLoading ? "확인 중..." : verified ? "✓ 완료" : "확인"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }} />
      <Button label="다음" onPress={handleNextToReset} disabled={!verified} />
    </View>
  );
}

// ── 메인 화면 ──────────────────────────────
export default function FindAccountScreen() {
  const C = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<"ID" | "PW">("ID");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <MoaLogo size={32} />
            <Text style={[styles.appName, { color: C.primary }]}>MOA</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "ID" && { borderBottomColor: C.text }]}
            onPress={() => setTab("ID")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === "ID" ? C.text : C.textMuted, fontWeight: tab === "ID" ? "700" : "500" },
              ]}
            >
              아이디 찾기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "PW" && { borderBottomColor: C.text }]}
            onPress={() => setTab("PW")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === "PW" ? C.text : C.textMuted, fontWeight: tab === "PW" ? "700" : "500" },
              ]}
            >
              비밀번호 찾기
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {tab === "ID" ? <FindIDTab /> : <FindPWTab />}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 24 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" },
  backArrow: { fontSize: 28, fontWeight: "300" },
  logoWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginTop: 12, gap: 6 },
  appName: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 15 },

  scroll: { flexGrow: 1 },
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },

  successBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  successLabel: { fontSize: 14 },
  successUsername: { fontSize: 24, fontWeight: "700" },
  successText: { fontSize: 15, fontWeight: "500", marginTop: 16, marginLeft: 4 },

  inputRow: { flexDirection: "row", alignItems: "stretch", gap: 8, marginBottom: 0 },
  sideBtn: { width: 100, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sideBtnText: { fontSize: 13, fontWeight: "600", letterSpacing: -0.3 },
});
