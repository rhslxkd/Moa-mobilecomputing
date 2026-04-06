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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";
import MoaLogo from "@/components/common/MoaLogo";

// ── 컴포넌트: 아이디 찾기 ─────────────────────
function FindIDTab() {
  const C = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [phase, setPhase] = useState<"form" | "success">("form");

  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSendCode = () => {
    if (!email) return;
    Keyboard.dismiss();
    setCodeSent(true);
  };

  const handleVerify = () => {
    if (!authCode) return;
    Keyboard.dismiss();
    setVerified(true);
  };

  const handleFindID = () => {
    if (!verified) return;
    setPhase("success");
  };

  if (phase === "success") {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.successText, { color: C.text }]}>
          이메일로 아이디를 전송하였습니다.
        </Text>
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
          style={[styles.sideBtn, { backgroundColor: email ? C.primary : C.bgMuted }]}
          onPress={handleSendCode}
          disabled={!email}
          activeOpacity={0.8}
        >
          <Text style={[styles.sideBtnText, { color: email ? "#FFF" : C.textMuted }]}>
            인증번호 발송
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <InputBox
          containerStyle={{ flex: 1 }}
          placeholder="인증번호를 입력하세요."
          value={authCode}
          onChangeText={setAuthCode}
          keyboardType="number-pad"
        />
        <TouchableOpacity
          style={[styles.sideBtn, { backgroundColor: authCode && !verified ? C.primary : C.bgMuted }]}
          onPress={handleVerify}
          disabled={!authCode || verified}
          activeOpacity={0.8}
        >
          <Text style={[styles.sideBtnText, { color: authCode && !verified ? "#FFF" : C.textMuted }]}>
            확인
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }} />
      <Button
        label="아이디 찾기"
        onPress={handleFindID}
        disabled={!verified}
      />
    </View>
  );
}

// ── 컴포넌트: 비밀번호 찾기 ────────────────────
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

  const handleSendCode = () => {
    if (!email || !id) return;
    Keyboard.dismiss();
    setCodeSent(true);
  };

  const handleVerify = () => {
    if (!authCode) return;
    Keyboard.dismiss();
    setVerified(true);
  };

  const handleNextToReset = () => {
    if (!verified) return;
    setPhase("reset");
  };

  const handleResetPassword = () => {
    if (!newPw || !newPwCheck || newPw !== newPwCheck) return;
    setPhase("success");
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
    const isResetReady = newPw.length > 0 && newPw === newPwCheck;
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
          disabled={!isResetReady}
        />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={{ gap: 16 }}>
        {/* ID */}
        <InputBox
          placeholder="아이디를 입력하세요."
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
        />

        {/* 이메일 */}
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
            style={[styles.sideBtn, { backgroundColor: email && id ? C.primary : C.bgMuted }]}
            onPress={handleSendCode}
            disabled={!email || !id}
            activeOpacity={0.8}
          >
            <Text style={[styles.sideBtnText, { color: email && id ? "#FFF" : C.textMuted }]}>
              인증번호 발송
            </Text>
          </TouchableOpacity>
        </View>

        {/* 인증번호 */}
        <View style={styles.inputRow}>
          <InputBox
            containerStyle={{ flex: 1 }}
            placeholder="인증번호를 입력하세요."
            value={authCode}
            onChangeText={setAuthCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[styles.sideBtn, { backgroundColor: authCode && !verified ? C.primary : C.bgMuted }]}
            onPress={handleVerify}
            disabled={!authCode || verified}
            activeOpacity={0.8}
          >
            <Text style={[styles.sideBtnText, { color: authCode && !verified ? "#FFF" : C.textMuted }]}>
              확인
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <Button
        label="다음"
        onPress={handleNextToReset}
        disabled={!verified}
      />
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
        {/* 헤더 & 로고 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <MoaLogo size={32} />
            <Text style={[styles.appName, { color: C.primary }]}>MOA</Text>
          </View>
        </View>

        {/* 탭 네비게이션 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "ID" && { borderBottomColor: C.text }]}
            onPress={() => setTab("ID")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === "ID" ? C.text : C.textMuted, fontWeight: tab === "ID" ? "700" : "500" }]}>
              아이디 찾기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "PW" && { borderBottomColor: C.text }]}
            onPress={() => setTab("PW")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === "PW" ? C.text : C.textMuted, fontWeight: tab === "PW" ? "700" : "500" }]}>
              비밀번호 찾기
            </Text>
          </TouchableOpacity>
        </View>

        {/* 탭 콘텐츠 */}
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {tab === "ID" ? <FindIDTab /> : <FindPWTab />}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  backArrow: {
    fontSize: 28,
    fontWeight: "300",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 12,
    gap: 6,
  },
  appName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0", // C.border
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 15,
  },

  scroll: {
    flexGrow: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },

  // 성공 메시지
  successText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#475569",
    marginTop: 16,
    marginLeft: 4,
  },

  // 인풋 row
  inputRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 16,
  },
  sideBtn: {
    width: 100, // 추가: 버튼들을 고정된 동일 크기로 변경
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
