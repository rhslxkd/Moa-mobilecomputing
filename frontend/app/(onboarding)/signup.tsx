/**
 * app/(onboarding)/signup.tsx
 *
 * 3단계 회원가입
 * Step 1: 이용약관 동의
 * Step 2: 이메일·아이디·비밀번호 입력 → POST /auth/signup (OTP 발송)
 * Step 3: 이메일 OTP 인증 → POST /auth/signup/verify-email → 토큰 저장 → usersetup
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
  Modal,
  Pressable,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";
import MoaLogo from "@/components/common/MoaLogo";
import { AuthAPI, TokenStore } from "@/services/api";

// ── 약관 체크 아이템 ────────────────────────
interface TermItemProps {
  checked: boolean;
  label: string;
  required: boolean;
  onToggle: () => void;
  onDetail: () => void;
}

function TermItem({ checked, label, required, onToggle, onDetail }: TermItemProps) {
  const C = useTheme();
  return (
    <View style={styles.termRow}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.termLeft}>
        <View
          style={[
            styles.termCircle,
            {
              borderColor: checked ? C.primary : C.border,
              backgroundColor: checked ? C.primary : "transparent",
            },
          ]}
        >
          {checked && <Text style={styles.termCheck}>✓</Text>}
        </View>
        <Text style={[styles.termLabel, { color: C.text }]}>
          <Text style={{ color: required ? C.text : C.textMuted }}>
            ({required ? "필수" : "선택"})
          </Text>
          {" "}{label}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDetail} activeOpacity={0.7} style={styles.termDetailBtn}>
        <Text style={[styles.termChevron, { color: C.textMuted }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 약관 상세 모달 ──────────────────────────
function TermDetailModal({
  visible,
  title,
  onClose,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
}) {
  const C = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: C.bgOverlay }]} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: C.bgCard }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>{title}</Text>
          <View style={[styles.modalContent, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Text style={[styles.modalContentText, { color: C.textMuted }]}>이용약관 상세</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.modalCloseBtn, { backgroundColor: C.bgMuted }]}
          >
            <Text style={[styles.modalCloseBtnText, { color: C.textSub }]}>닫기</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Step 1: 이용약관 ───────────────────────
interface TermsData {
  service: boolean;
  privacy: boolean;
  marketing: boolean;
}

function Step1({ onNext }: { onNext: (terms: TermsData) => void }) {
  const C = useTheme();
  const [terms, setTerms] = useState<TermsData>({ service: false, privacy: false, marketing: false });
  const [detailModal, setDetailModal] = useState<string | null>(null);

  const allRequired = terms.service && terms.privacy;
  const allChecked = allRequired && terms.marketing;

  const toggleAll = () => {
    const next = !allChecked;
    setTerms({ service: next, privacy: next, marketing: next });
  };

  const toggle = (key: keyof TermsData) =>
    setTerms((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <MoaLogo size={36} />
          <Text style={[styles.logoText, { color: C.primary }]}>MOA</Text>
        </View>

        <Text style={[styles.stepTitle, { color: C.text }]}>이용약관 및 정책</Text>

        <TouchableOpacity onPress={toggleAll} activeOpacity={0.7} style={styles.allAgreeRow}>
          <View
            style={[
              styles.termCircle,
              {
                borderColor: allChecked ? C.primary : C.border,
                backgroundColor: allChecked ? C.primary : "transparent",
              },
            ]}
          >
            {allChecked && <Text style={styles.termCheck}>✓</Text>}
          </View>
          <Text style={[styles.allAgreeText, { color: C.text }]}>전체 동의하기</Text>
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: C.border }]} />

        <View style={styles.termList}>
          <TermItem
            checked={terms.service}
            label="서비스 이용약관 동의"
            required
            onToggle={() => toggle("service")}
            onDetail={() => setDetailModal("서비스 이용약관")}
          />
          <TermItem
            checked={terms.privacy}
            label="개인정보 수집 및 이용 동의"
            required
            onToggle={() => toggle("privacy")}
            onDetail={() => setDetailModal("개인정보 수집 및 이용")}
          />
          <TermItem
            checked={terms.marketing}
            label="마케팅 수신 정보 동의"
            required={false}
            onToggle={() => toggle("marketing")}
            onDetail={() => setDetailModal("마케팅 수신 정보")}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button label="다음" onPress={() => onNext(terms)} disabled={!allRequired} />
      </View>

      <TermDetailModal
        visible={detailModal !== null}
        title={detailModal ?? ""}
        onClose={() => setDetailModal(null)}
      />
    </>
  );
}

// ── Step 2: 계정 설정 ──────────────────────
function Step2({
  termsData,
  onOtpSent,
}: {
  termsData: TermsData;
  onOtpSent: (email: string) => void;
}) {
  const C = useTheme();

  const [email, setEmail] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [pwCheck, setPwCheck] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", id: "", password: "", pwCheck: "" });

  const validate = () => {
    const next = { email: "", id: "", password: "", pwCheck: "" };
    let ok = true;

    if (!email.trim()) {
      next.email = "이메일을 입력해주세요."; ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "올바른 이메일 형식이 아닙니다."; ok = false;
    }
    if (!id.trim()) {
      next.id = "아이디를 입력해주세요."; ok = false;
    } else if (id.length < 3 || id.length > 20) {
      next.id = "아이디는 3~20자여야 합니다."; ok = false;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      next.id = "아이디는 영문, 숫자, _  -  만 사용 가능합니다."; ok = false;
    }
    if (!password) {
      next.password = "비밀번호를 입력해주세요."; ok = false;
    } else if (password.length < 8) {
      next.password = "비밀번호는 8자 이상이어야 합니다."; ok = false;
    }
    if (!pwCheck) {
      next.pwCheck = "비밀번호를 한 번 더 입력해주세요."; ok = false;
    } else if (password !== pwCheck) {
      next.pwCheck = "비밀번호가 일치하지 않습니다."; ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    Keyboard.dismiss();
    setLoading(true);

    try {
      await AuthAPI.signup({
        username: id.trim(),
        email: email.trim(),
        password,
        terms_agreed: termsData.service,
        privacy_agreed: termsData.privacy,
        marketing_agreed: termsData.marketing,
      });
      onOtpSent(email.trim());
    } catch (err: any) {
      const msg = err?.message ?? "회원가입에 실패했습니다.";
      if (msg.toLowerCase().includes("email") || msg.includes("이메일")) {
        setErrors((e) => ({ ...e, email: msg }));
      } else if (msg.toLowerCase().includes("username") || msg.includes("아이디")) {
        setErrors((e) => ({ ...e, id: msg }));
      } else {
        Alert.alert("회원가입 오류", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.stepScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <MoaLogo size={36} />
          <Text style={[styles.logoText, { color: C.primary }]}>MOA</Text>
        </View>

        <Text style={[styles.stepTitle, { color: C.text }]}>
          이메일, 아이디, 비밀번호를{"\n"}설정해주세요.
        </Text>

        <View style={styles.form}>
          <InputBox
            label="이메일"
            placeholder="이메일을 입력해주세요."
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <InputBox
            label="아이디"
            placeholder="아이디를 입력해주세요. (영문·숫자·_-)"
            value={id}
            onChangeText={(t) => { setId(t); setErrors((e) => ({ ...e, id: "" })); }}
            error={errors.id}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <InputBox
            label="비밀번호"
            placeholder="8자 이상 입력해주세요."
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
            error={errors.password}
            secureTextEntry
            textContentType="oneTimeCode"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <InputBox
            label="비밀번호 확인"
            placeholder="비밀번호를 한 번 더 입력해주세요."
            value={pwCheck}
            onChangeText={(t) => { setPwCheck(t); setErrors((e) => ({ ...e, pwCheck: "" })); }}
            error={errors.pwCheck}
            secureTextEntry
            textContentType="oneTimeCode"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button label="인증번호 받기" onPress={handleSignup} loading={loading} />
      </View>
    </>
  );
}

// ── Step 3: 이메일 OTP 인증 ──────────────────
function Step3({ email, onVerified }: { email: string; onVerified: () => void }) {
  const C = useTheme();
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim()) { setOtpError("인증번호를 입력해주세요."); return; }
    setLoading(true);
    try {
      const data = await AuthAPI.verifyEmail({ email, token: otp.trim() });
      await TokenStore.set(data.access_token);
      onVerified();
    } catch (err: any) {
      setOtpError(err?.message ?? "인증번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <MoaLogo size={36} />
          <Text style={[styles.logoText, { color: C.primary }]}>MOA</Text>
        </View>
        <Text style={[styles.stepTitle, { color: C.text }]}>이메일 인증</Text>
        <Text style={[styles.stepSub, { color: C.textMuted }]}>
          {email}{"\n"}으로 발송된 인증번호를 입력해주세요.
        </Text>
        <View style={{ marginTop: 32 }}>
          <InputBox
            label="인증번호"
            placeholder="123456"
            value={otp}
            onChangeText={(t) => { setOtp(t); setOtpError(""); }}
            error={otpError}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button label="인증 완료" onPress={handleVerify} loading={loading} />
      </View>
    </>
  );
}

// ── 메인 화면 ──────────────────────────────
export default function SignUpScreen() {
  const C = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [termsData, setTermsData] = useState<TermsData>({ service: false, privacy: false, marketing: false });
  const [signupEmail, setSignupEmail] = useState("");

  const totalSteps = 3;

  const handleBack = () => {
    if (step === 1) router.back();
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        {/* 네비 바 */}
        <View style={[styles.navBar, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.stepIndicator}>
            {([1, 2, 3] as const).map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: s <= step ? C.primary : C.bgMuted,
                    width: s === step ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.backBtn} />
        </View>

        {step === 1 && (
          <Step1
            onNext={(terms) => {
              setTermsData(terms);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2
            termsData={termsData}
            onOtpSent={(email) => { setSignupEmail(email); setStep(3); }}
          />
        )}
        {step === 3 && (
          <Step3
            email={signupEmail}
            onVerified={() => router.replace("/(onboarding)/usersetup" as any)}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 32, fontWeight: "300", lineHeight: 36 },

  stepIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stepDot: { height: 8, borderRadius: 4 },

  stepScroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    flexGrow: 1,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 40 },
  logoText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  stepTitle: { fontSize: 26, fontWeight: "700", lineHeight: 36, marginBottom: 8 },
  stepSub: { fontSize: 15, lineHeight: 24 },

  allAgreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  allAgreeText: { fontSize: 16, fontWeight: "600" },
  separator: { height: 1, marginBottom: 16 },
  termList: { gap: 4 },
  termRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  termLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  termCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  termCheck: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  termLabel: { fontSize: 14, flex: 1 },
  termDetailBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  termChevron: { fontSize: 20, fontWeight: "300" },

  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalContent: { height: 280, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalContentText: { fontSize: 14 },
  modalCloseBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalCloseBtnText: { fontSize: 15, fontWeight: "600" },

  form: { gap: 20 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
