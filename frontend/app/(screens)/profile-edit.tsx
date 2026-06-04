/**
 * app/(screens)/profile-edit.tsx
 * 회원정보 수정 화면
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { AuthAPI } from "@/services/api";
import InputBox from "@/components/common/InputBox";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import MoaLogo from "@/components/common/MoaLogo";

export default function ProfileEditScreen() {
  const C = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName]   = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [org, setOrg]     = useState(user?.organizationName ?? "");
  const [dept, setDept]   = useState(user?.department ?? "");
  const [sid, setSid]     = useState(user?.studentId ?? "");
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({ name: "", email: "" });

  const validate = () => {
    const next = { name: "", email: "" };
    let ok = true;
    if (!name.trim()) { next.name = "이름을 입력해주세요."; ok = false; }
    if (!email.trim()) {
      next.email = "이메일을 입력해주세요."; ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "올바른 이메일 형식이 아닙니다."; ok = false;
    }
    setErrors(next);
    return ok;
  };

  const { fetchUser } = useAuth();

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await AuthAPI.updateProfile({
        name: name.trim(),
        organization_name: org.trim() || undefined,
        department: dept.trim() || undefined,
        student_id: sid.trim() || undefined,
      });
      await fetchUser().catch(() => {});
      Alert.alert("완료", "회원정보가 수정되었습니다.");
      router.back();
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const INFO_ROWS = [
    { label: "학교", value: org,  set: setOrg,  placeholder: "학교명을 입력해주세요." },
    { label: "학과", value: dept, set: setDept, placeholder: "학과명을 입력해주세요." },
    { label: "학번", value: sid,  set: setSid,  placeholder: "학번을 입력해주세요." },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
        {/* 헤더 */}
        <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
            <Icon name="back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <MoaLogo size={24} variant="primary" />
            <Text style={[s.headerTitle, { color: C.text }]}>회원정보 수정</Text>
          </View>
          <View style={s.iconBtn} />
        </View>

        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 필수 정보 */}
          <Text style={[s.sectionLabel, { color: C.textMuted }]}>기본 정보</Text>
          <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <InputBox
              label="이름"
              placeholder="이름을 입력해주세요."
              value={name}
              onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
              error={errors.name}
              autoCorrect={false}
              returnKeyType="next"
            />
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
          </View>

          {/* 소속 정보 */}
          <Text style={[s.sectionLabel, { color: C.textMuted }]}>소속 정보</Text>
          <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            {INFO_ROWS.map(({ label, value, set, placeholder }) => (
              <InputBox
                key={label}
                label={label}
                placeholder={placeholder}
                value={value}
                onChangeText={set}
                autoCorrect={false}
                returnKeyType="next"
              />
            ))}
          </View>
        </ScrollView>

        <View style={[s.footer, { backgroundColor: C.bg }]}>
          <Button label="저장" onPress={handleSave} loading={loading} />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  body: { padding: 16, gap: 8, paddingBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: "600", paddingHorizontal: 4, marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, gap: 4 },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
