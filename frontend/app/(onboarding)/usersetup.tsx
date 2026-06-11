/**
 * app/(onboarding)/usersetup.tsx
 *
 * 3단계 유저 설정
 * Step 1: 역할 선택 (학생 / 직장인)
 * Step 2: 소속 정보 입력 → POST /auth/setup/affiliation
 * Step 3: 이름 입력 → POST /auth/setup/name → welcome
 */

import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

// ── 역할 카드 ──────────────────────────────
type Role = "student" | "expert";

function RoleCard({
  selected,
  title,
  description,
  emoji,
  onPress,
}: {
  selected: boolean;
  title: string;
  description: string;
  emoji: string;
  onPress: () => void;
}) {
  const C = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.roleCard,
        {
          borderColor: selected ? C.primary : C.border,
          backgroundColor: selected ? C.primaryBg : C.bgCard,
        },
      ]}
    >
      <Text style={styles.roleEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.roleTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.roleDesc, { color: C.textMuted }]}>{description}</Text>
      </View>
      <View
        style={[
          styles.roleRadio,
          {
            borderColor: selected ? C.primary : C.border,
            backgroundColor: selected ? C.primary : "transparent",
          },
        ]}
      >
        {selected && <View style={styles.roleRadioInner} />}
      </View>
    </TouchableOpacity>
  );
}

// ── Step 1: 역할 선택 ──────────────────────
function RoleStep({
  role,
  setRole,
  onNext,
}: {
  role: Role | null;
  setRole: (r: Role) => void;
  onNext: () => void;
}) {
  const C = useTheme();
  return (
    <>
      <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <MoaLogo size={36} />
          <Text style={[styles.logoText, { color: C.primary }]}>MOA</Text>
        </View>
        <Text style={[styles.stepTitle, { color: C.text }]}>어디에서 활동 중이신가요?</Text>
        <Text style={[styles.stepSub, { color: C.textMuted }]}>소속을 알려주세요.</Text>
        <View style={{ marginTop: 32, gap: 12 }}>
          <RoleCard
            selected={role === "student"}
            title="학생"
            description="대학교 / 대학원에서 팀 프로젝트를 진행해요"
            emoji="🎓"
            onPress={() => setRole("student")}
          />
          <RoleCard
            selected={role === "expert"}
            title="직장인 / 전문가"
            description="회사 또는 외부 프로젝트에서 협업해요"
            emoji="💼"
            onPress={() => setRole("expert")}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button label="다음" onPress={onNext} disabled={role === null} />
      </View>
    </>
  );
}

// ── Step 2: 소속 정보 입력 ─────────────────
function AffiliationStep({
  role,
  onComplete,
}: {
  role: Role;
  onComplete: () => void;
}) {
  const C = useTheme();
  const [loading, setLoading] = useState(false);
  const isStudent = role === "student";

  // Student fields
  const [school, setSchool] = useState("");
  const [dept, setDept] = useState("");
  const [grade, setGrade] = useState("");

  // Expert fields
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const canSubmit = isStudent
    ? school.trim() && dept.trim() && grade.trim()
    : company.trim() && jobTitle.trim();

  const handleComplete = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      if (isStudent) {
        await AuthAPI.setupAffiliation({
          affiliation_type: "student",
          organization_name: school.trim(),
          department: dept.trim(),
          student_id: grade.trim(),
        });
      } else {
        await AuthAPI.setupAffiliation({
          affiliation_type: "worker",
          organization_name: company.trim(),
          department: jobTitle.trim(),
        });
      }
      onComplete();
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "소속 정보 저장에 실패했습니다.");
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
          {isStudent ? "학교 정보를\n알려주세요." : "직장 정보를\n알려주세요."}
        </Text>
        <Text style={[styles.stepSub, { color: C.textMuted }]}>
          {isStudent ? "학교, 학과, 학년을 입력해주세요." : "회사명과 직무를 입력해주세요."}
        </Text>
        <View style={{ marginTop: 32, gap: 20 }}>
          {isStudent ? (
            <>
              <InputBox
                label="학교"
                placeholder="학교명을 입력해주세요."
                value={school}
                onChangeText={setSchool}
                returnKeyType="next"
              />
              <InputBox
                label="학과"
                placeholder="학과명을 입력해주세요."
                value={dept}
                onChangeText={setDept}
                returnKeyType="next"
              />
              <InputBox
                label="학년"
                placeholder="학년을 입력해주세요. (예: 3학년)"
                value={grade}
                onChangeText={setGrade}
                returnKeyType="done"
                onSubmitEditing={handleComplete}
              />
            </>
          ) : (
            <>
              <InputBox
                label="회사명"
                placeholder="회사명을 입력해주세요."
                value={company}
                onChangeText={setCompany}
                returnKeyType="next"
              />
              <InputBox
                label="직무"
                placeholder="직무를 입력해주세요. (예: 프론트엔드 개발자)"
                value={jobTitle}
                onChangeText={setJobTitle}
                returnKeyType="done"
                onSubmitEditing={handleComplete}
              />
            </>
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button label="다음" onPress={handleComplete} loading={loading} disabled={!canSubmit} />
      </View>
    </>
  );
}

// ── Step 3: 이름 입력 ──────────────────────
function NameStep({ onNext }: { onNext: () => void }) {
  const C = useTheme();
  const { fetchUser } = useAuth();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!lastName.trim() || !firstName.trim()) {
      setError("성, 이름을 모두 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await AuthAPI.setupName({
        last_name: lastName.trim(),
        first_name: firstName.trim(),
      });
      await fetchUser(); // 이름 저장 후 최신 프로필 불러오기
      onNext();
    } catch (err: any) {
      Alert.alert("오류", err?.message ?? "이름 저장에 실패했습니다.");
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
        <Text style={[styles.stepSub, { color: C.textMuted }]}>어떻게 부르면 좋을까요?</Text>
        <Text style={[styles.stepTitle, { color: C.text }]}>이름을 입력해주세요.</Text>
        <View style={{ marginTop: 32, gap: 15 }}>
          <InputBox
            label="성"
            placeholder="성을 입력해주세요."
            value={lastName}
            onChangeText={(t) => { setLastName(t); setError(""); }}
            error={error ? " " : ""}
            returnKeyType="next"
          />
          <InputBox
            label="이름"
            placeholder="이름을 입력해주세요."
            value={firstName}
            onChangeText={(t) => { setFirstName(t); setError(""); }}
            error={error}
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Button
          label="완료"
          onPress={handleNext}
          loading={loading}
          disabled={!lastName.trim() || !firstName.trim()}
        />
      </View>
    </>
  );
}

// ── 메인 화면 ──────────────────────────────
export default function UserSetupScreen() {
  const C = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    Keyboard.dismiss();
  }, []);

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
        {/* 네비 헤더 */}
        <View style={[styles.navBar, { borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backBtn}>
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
          <RoleStep role={role} setRole={setRole} onNext={() => setStep(2)} />
        )}
        {step === 2 && role && (
          <AffiliationStep role={role} onComplete={() => setStep(3)} />
        )}
        {step === 3 && (
          <NameStep onNext={() => router.replace("/(onboarding)/welcome" as any)} />
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
  stepTitle: { fontSize: 28, fontWeight: "700", lineHeight: 38 },
  stepSub: { fontSize: 15, marginTop: 8, marginBottom: 4 },

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    gap: 14,
  },
  roleEmoji: { fontSize: 32 },
  roleTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  roleDesc: { fontSize: 13, lineHeight: 18 },
  roleRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  roleRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
