/**
 * app/(screens)/settings.tsx — 설정
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { AuthAPI } from "@/services/api";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";

export default function SettingsScreen() {
  const C = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { projects } = useProject();

  const [pushAll,      setPushAll]      = useState(true);
  const [notifInvite,  setNotifInvite]  = useState(true);
  const [notifMeeting, setNotifMeeting] = useState(true);
  const [notifChat,    setNotifChat]    = useState(true);
  const [notifTodo,    setNotifTodo]    = useState(true);

  const displayName = user?.fullName || user?.username || "-";
  const avatarChar = displayName.charAt(0);
  const projectCount = projects.length;
  const affiliationParts = [user?.organizationName, user?.department, user?.studentId].filter(Boolean);

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/(onboarding)/signin" as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "계정 삭제",
      "계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 정말 삭제하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await AuthAPI.deleteAccount();
              await logout();
              router.replace("/(onboarding)/signin" as any);
            } catch (e: any) {
              Alert.alert("오류", e?.message ?? "계정 삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  const SUB_NOTIFS = [
    { label: "초대 알림",       value: notifInvite,  set: setNotifInvite },
    { label: "회의 시작 알림",  value: notifMeeting, set: setNotifMeeting },
    { label: "채팅 알림",       value: notifChat,    set: setNotifChat },
    { label: "To-Do 마감 알림", value: notifTodo,    set: setNotifTodo },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* ── 헤더 ── */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <MoaLogo size={24} variant="primary" />
          <Text style={[s.headerTitle, { color: C.text }]}>더보기</Text>
        </View>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ── 프로필 카드 ── */}
        <View style={[s.profileCard, { backgroundColor: C.primary }]}>
          <View style={[s.avatar, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
            <Text style={s.avatarText}>{avatarChar}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileUsername}>@{user?.username ?? "-"}</Text>
            <View style={s.projectBadge}>
              <Text style={s.projectBadgeText}>{projectCount}개 프로젝트 참여중</Text>
            </View>
            {affiliationParts.length > 0 && (
              <Text style={s.profileAffiliation}>{affiliationParts.join(" · ")}</Text>
            )}
          </View>
        </View>

        {/* ── 설정 ── */}
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {/* 섹션 타이틀 */}
          <View style={[s.cardTitleRow, { borderBottomColor: C.border }]}>
            <Icon name="settings" size={16} color={C.text} />
            <Text style={[s.cardTitle, { color: C.text }]}>설정</Text>
          </View>

          {/* 푸시 알림 전체 */}
          <View style={[s.settingRow, { borderBottomColor: C.border }]}>
            <Text style={[s.settingLabel, { color: C.text }]}>푸시 알림(전체)</Text>
            <Switch
              value={pushAll}
              onValueChange={setPushAll}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor={C.border}
            />
          </View>

          {/* 세부 알림 */}
          {SUB_NOTIFS.map(({ label, value, set }, i) => (
            <TouchableOpacity
              key={label}
              onPress={() => pushAll && set(v => !v)}
              activeOpacity={pushAll ? 0.7 : 1}
              style={[
                s.subRow,
                { borderBottomColor: C.border },
                i < SUB_NOTIFS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[s.subLabel, { color: pushAll ? C.text : C.textMuted }]}>{label}</Text>
              {/* 라디오 점 */}
              <View style={[
                s.radio,
                { borderColor: value && pushAll ? C.primary : C.border },
                value && pushAll && { backgroundColor: C.primary },
              ]}>
                {value && pushAll && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 계정 관련 ── */}
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <TouchableOpacity
            style={[s.settingRow, { borderBottomColor: C.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/(screens)/change-credentials" as any)}
          >
            <Text style={[s.settingLabel, { color: C.text }]}>아이디·비밀번호 변경</Text>
            <Icon name="chevron" size={18} color={C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.settingRow, { borderBottomColor: C.border }]}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <Text style={[s.settingLabel, { color: C.text }]}>로그아웃</Text>
            <View style={s.settingRight}>
              <Text style={[s.settingValue, { color: C.textMuted }]}>{user?.username}</Text>
              <Icon name="chevron" size={18} color={C.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.settingRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
          >
            <Text style={[s.settingLabel, { color: "#EF4444" }]}>계정 삭제</Text>
            <Icon name="chevron" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  // 헤더
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

  body: { padding: 16, gap: 12, paddingBottom: 40 },

  // 프로필 카드
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileInfo: { flex: 1, gap: 5 },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  profileUsername: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  projectBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  projectBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  profileAffiliation: { color: "rgba(255,255,255,0.7)", fontSize: 12 },

  // 카드
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },

  // 설정 행
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: { fontSize: 15 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 14 },

  // 세부 알림 행
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  subLabel: { fontSize: 14 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
