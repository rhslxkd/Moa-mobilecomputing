/**
 * app/(onboarding)/signup.tsx
 *
 * 피그마 SignUp 화면 기반 — 2단계 회원가입
 *
 * Step 1: 이용약관 및 정책
 *   - 전체 동의하기
 *   - (필수) 서비스 이용약관 동의
 *   - (필수) 개인정보 수집 및 이용 동의
 *   - (선택) 마케팅 수신 정보 동의
 *   - 약관 상세 모달
 *
 * Step 2: 이메일, 아이디, 비밀번호 설정
 *   - 이메일, 아이디, 비밀번호, 비밀번호 확인
 *   - 완료 → /(tabs) 이동
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";

import MoaLogo from "@/components/common/MoaLogo";

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
        {/* 체크 원 */}
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

      {/* 상세 보기 */}
      <TouchableOpacity onPress={onDetail} activeOpacity={0.7} style={styles.termDetailBtn}>
        <Text style={[styles.termChevron, { color: C.textMuted }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 약관 상세 모달 ──────────────────────────
interface TermDetailModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
}

function TermDetailModal({ visible, title, onClose }: TermDetailModalProps) {
  const C = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.modalBackdrop, { backgroundColor: C.bgOverlay }]}
        onPress={onClose}
      >
        <Pressable style={[styles.modalCard, { backgroundColor: C.bgCard }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>{title}</Text>
          <View style={[styles.modalContent, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Text style={[styles.modalContentText, { color: C.textMuted }]}>
              이용약관 상세
            </Text>
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
interface Step1Props {
  onNext: () => void;
}

function Step1({ onNext }: Step1Props) {
  const C = useTheme();
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    marketing: false,
  });
  const [detailModal, setDetailModal] = useState<string | null>(null);

  const allRequired = terms.service && terms.privacy;
  const allChecked = allRequired && terms.marketing;

  const toggleAll = () => {
    const next = !allChecked;
    setTerms({ service: next, privacy: next, marketing: next });
  };

  const toggle = (key: keyof typeof terms) => {
    setTerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.stepScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 로고 */}
        <View style={styles.logoRow}>
          <MoaLogo size={36} />
          <Text style={[styles.logoText, { color: C.primary }]}>MOA</Text>
        </View>

        {/* 타이틀 */}
        <Text style={[styles.stepTitle, { color: C.text }]}>이용약관 및 정책</Text>

        {/* 전체 동의 */}
        <TouchableOpacity
          onPress={toggleAll}
          activeOpacity={0.7}
          style={styles.allAgreeRow}
        >
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

        {/* 약관 항목들 */}
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

      {/* 하단 버튼 */}
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button
          label="다음"
          onPress={onNext}
          disabled={!allRequired}
        />
      </View>

      {/* 약관 상세 모달 */}
      <TermDetailModal
        visible={detailModal !== null}
        title={detailModal ?? ""}
        onClose={() => setDetailModal(null)}
      />
    </>
  );
}

// ── Step 2: 계정 설정 ──────────────────────
interface Step2Props {
  onComplete: () => void;
}

function Step2({ onComplete }: Step2Props) {
  const C = useTheme();

  const [email, setEmail] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [pwCheck, setPwCheck] = useState("");
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "", id: "", password: "", pwCheck: "",
  });

  const validate = () => {
    const next = { email: "", id: "", password: "", pwCheck: "" };
    let ok = true;

    if (!email.trim()) {
      next.email = "이메일을 입력해주세요.";
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "올바른 이메일 형식이 아닙니다.";
      ok = false;
    }
    if (!id.trim()) {
      next.id = "아이디를 입력해주세요.";
      ok = false;
    }
    if (!password) {
      next.password = "비밀번호를 입력해주세요.";
      ok = false;
    } else if (password.length < 8) {
      next.password = "비밀번호는 8자 이상이어야 합니다.";
      ok = false;
    }
    if (!pwCheck) {
      next.pwCheck = "비밀번호를 한 번 더 입력해주세요.";
      ok = false;
    } else if (password !== pwCheck) {
      next.pwCheck = "비밀번호가 일치하지 않습니다.";
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleComplete = () => {
    if (!validate()) return;
    setLoading(true);
    Keyboard.dismiss(); // ✅ 고스트 키보드 방지용 강제 닫기
    // TODO: 실제 회원가입 API 연결
    setTimeout(() => {
      setLoading(false);
      onComplete();
    }, 800);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.stepScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 */}
        <View style={styles.logoRow}>
          <MoaLogo size={36} />
          <Text style={[styles.logoText, { color: C.primary }]}>MOA</Text>
        </View>

        {/* 타이틀 */}
        <Text style={[styles.stepTitle, { color: C.text }]}>
          이메일, 아이디, 비밀번호를{"\n"}설정해주세요.
        </Text>

        {/* 입력 폼 */}
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
            placeholder="아이디를 입력해주세요."
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
            onSubmitEditing={handleComplete}
          />
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button label="완료" onPress={handleComplete} loading={loading} />
      </View>
    </>
  );
}

// ── 메인 화면 ──────────────────────────────
export default function SignUpScreen() {
  const C = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        {/* 뒤로가기 헤더 */}
        <View style={[styles.navBar, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => (step === 2 ? setStep(1) : router.back())}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
          </TouchableOpacity>

          {/* 스텝 인디케이터 */}
          <View style={styles.stepIndicator}>
            {([1, 2] as const).map((s) => (
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

        {step === 1 ? (
          <Step1 onNext={() => setStep(2)} />
        ) : (
          <Step2 onComplete={() => router.replace("/(onboarding)/usersetup" as any)} />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // 네비 바
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 32, fontWeight: "300", lineHeight: 36 },

  // 스텝 인디케이터
  stepIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },

  // 공통 스텝 레이아웃
  stepScroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    flexGrow: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 40,
  },
  logoText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  stepTitle: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 36,
    marginBottom: 36,
  },

  // 전체 동의
  allAgreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  allAgreeText: { fontSize: 16, fontWeight: "600" },

  separator: { height: 1, marginBottom: 16 },

  // 약관 목록
  termList: { gap: 4 },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  termLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
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
  termDetailBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  termChevron: { fontSize: 20, fontWeight: "300" },

  // 약관 상세 모달
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalContent: {
    height: 280,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContentText: { fontSize: 14 },
  modalCloseBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseBtnText: { fontSize: 15, fontWeight: "600" },

  // 폼
  form: { gap: 20 },

  // 하단 버튼
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
