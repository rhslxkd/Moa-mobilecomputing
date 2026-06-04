/**
 * app/(screens)/change-credentials.tsx
 * 아이디 / 비밀번호 변경 화면
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

type Tab = "id" | "password";

export default function ChangeCredentialsScreen() {
  const C = useTheme();
  const router = useRouter();
  const { fetchUser } = useAuth();
  const [tab, setTab] = useState<Tab>("password");

  // 비밀번호 변경
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwErrors, setPwErrors]     = useState({ current: "", new: "", confirm: "" });
  const [pwLoading, setPwLoading]   = useState(false);

  // 아이디 변경
  const [newId, setNewId]           = useState("");
  const [idPw, setIdPw]             = useState("");
  const [idErrors, setIdErrors]     = useState({ id: "", pw: "" });
  const [idLoading, setIdLoading]   = useState(false);

  const handleChangePw = async () => {
    const next = { current: "", new: "", confirm: "" };
    let ok = true;
    if (!currentPw) { next.current = "현재 비밀번호를 입력해주세요."; ok = false; }
    if (!newPw) {
      next.new = "새 비밀번호를 입력해주세요."; ok = false;
    } else if (newPw.length < 8) {
      next.new = "비밀번호는 8자 이상이어야 합니다."; ok = false;
    }
    if (!confirmPw) {
      next.confirm = "비밀번호를 한 번 더 입력해주세요."; ok = false;
    } else if (newPw !== confirmPw) {
      next.confirm = "비밀번호가 일치하지 않습니다."; ok = false;
    }
    setPwErrors(next);
    if (!ok) return;

    setPwLoading(true);
    try {
      await AuthAPI.changePassword({ current_password: currentPw, new_password: newPw });
      Alert.alert("완료", "비밀번호가 변경되었습니다.");
      router.back();
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "비밀번호 변경에 실패했습니다.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangeId = async () => {
    const next = { id: "", pw: "" };
    let ok = true;
    if (!newId.trim()) {
      next.id = "새 아이디를 입력해주세요."; ok = false;
    } else if (newId.length < 3 || newId.length > 20) {
      next.id = "아이디는 3~20자여야 합니다."; ok = false;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(newId)) {
      next.id = "영문, 숫자, _ - 만 사용 가능합니다."; ok = false;
    }
    if (!idPw) { next.pw = "비밀번호를 입력해주세요."; ok = false; }
    setIdErrors(next);
    if (!ok) return;

    setIdLoading(true);
    try {
      await AuthAPI.changeUsername({ new_username: newId.trim(), password: idPw });
      await fetchUser().catch(() => {});
      Alert.alert("완료", "아이디가 변경되었습니다.");
      router.back();
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "아이디 변경에 실패했습니다.");
    } finally {
      setIdLoading(false);
    }
  };

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
            <Text style={[s.headerTitle, { color: C.text }]}>아이디·비밀번호 변경</Text>
          </View>
          <View style={s.iconBtn} />
        </View>

        {/* 탭 */}
        <View style={[s.tabBar, { backgroundColor: C.bg }]}>
          <View style={[s.tabWrap, { backgroundColor: C.bgCard }]}>
            {(["password", "id"] as Tab[]).map((t) => {
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  activeOpacity={0.8}
                  style={[s.tabBtn, active && { backgroundColor: C.primary }]}
                >
                  <Text style={[s.tabText, { color: active ? "#fff" : C.textMuted, fontWeight: active ? "700" : "500" }]}>
                    {t === "password" ? "비밀번호 변경" : "아이디 변경"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "password" ? (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <InputBox
                label="현재 비밀번호"
                placeholder="현재 비밀번호를 입력해주세요."
                value={currentPw}
                onChangeText={(t) => { setCurrentPw(t); setPwErrors((e) => ({ ...e, current: "" })); }}
                error={pwErrors.current}
                secureTextEntry
                autoCapitalize="none"
                textContentType="oneTimeCode"
                returnKeyType="next"
              />
              <InputBox
                label="새 비밀번호"
                placeholder="8자 이상 입력해주세요."
                value={newPw}
                onChangeText={(t) => { setNewPw(t); setPwErrors((e) => ({ ...e, new: "" })); }}
                error={pwErrors.new}
                secureTextEntry
                autoCapitalize="none"
                textContentType="oneTimeCode"
                returnKeyType="next"
              />
              <InputBox
                label="새 비밀번호 확인"
                placeholder="새 비밀번호를 한 번 더 입력해주세요."
                value={confirmPw}
                onChangeText={(t) => { setConfirmPw(t); setPwErrors((e) => ({ ...e, confirm: "" })); }}
                error={pwErrors.confirm}
                secureTextEntry
                autoCapitalize="none"
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={handleChangePw}
              />
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <InputBox
                label="새 아이디"
                placeholder="새 아이디를 입력해주세요. (영문·숫자·_-)"
                value={newId}
                onChangeText={(t) => { setNewId(t); setIdErrors((e) => ({ ...e, id: "" })); }}
                error={idErrors.id}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <InputBox
                label="비밀번호 확인"
                placeholder="본인 확인을 위해 비밀번호를 입력해주세요."
                value={idPw}
                onChangeText={(t) => { setIdPw(t); setIdErrors((e) => ({ ...e, pw: "" })); }}
                error={idErrors.pw}
                secureTextEntry
                autoCapitalize="none"
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={handleChangeId}
              />
            </View>
          )}
        </ScrollView>

        <View style={[s.footer, { backgroundColor: C.bg }]}>
          <Button
            label="변경하기"
            onPress={tab === "password" ? handleChangePw : handleChangeId}
            loading={tab === "password" ? pwLoading : idLoading}
          />
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

  tabBar: { paddingHorizontal: 20, paddingVertical: 14 },
  tabWrap: { flexDirection: "row", borderRadius: 50, padding: 4, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 14 },

  body: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, gap: 4 },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
    paddingTop: 12,
  },
});
