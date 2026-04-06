import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import OptionSheet, { MORE_OPTIONS } from "@/components/modals/OptionSheet";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";

interface MenuItemProps {
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
}

function MenuItem({ label, onPress, showChevron = true, isDestructive = false }: MenuItemProps) {
  const C = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.menuItem, { borderBottomColor: C.border }]}
    >
      <Text style={[styles.menuLabel, { color: isDestructive ? C.danger : C.text }]}>{label}</Text>
      {showChevron && <Icon name="chevron" size={18} color={C.textMuted} />}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const C = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [optionOpen, setOptionOpen] = useState(false);

  // 프로필 표시용 값
  const displayName = user?.fullName || user?.username || "-";
  const avatarChar = displayName.charAt(0);
  const affiliationDetail = [user?.organizationName, user?.department, user?.studentId]
    .filter(Boolean).join(" · ");

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: () => { logout(); router.replace("/(onboarding)/signin" as any); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <View style={styles.headerLeft}>
          <MoaLogo size={32} />
          <Text style={[styles.headerTitle, { color: C.text }]}>더보기</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={() => setOptionOpen(true)}
        >
          <Icon name="option" size={22} color={C.textSub} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── 프로필 카드 (파란 배경) ── */}
        <View style={[styles.profileCard, { backgroundColor: C.primary }]}>
          <View style={styles.profileLeft}>
            <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
              <Text style={styles.avatarText}>{avatarChar}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
            </View>
            <Text style={styles.profileEmail}>{user?.email ?? "-"}</Text>
            {!!affiliationDetail && (
              <Text style={styles.profileDetail}>{affiliationDetail}</Text>
            )}
          </View>
        </View>

        {/* ── 회원정보 ── */}
        <View style={[styles.menuCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <MenuItem label="회원정보" onPress={() => {}} />
        </View>

        {/* ── QR / 알림 / 계정 설정 ── */}
        <View style={[styles.menuCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.menuGroupLabel, { color: C.textMuted }]}>QR, 알림 설정, 계정 설정</Text>
          <MenuItem label="QR 코드" onPress={() => router.push("/(screens)/qr/scan" as any)} />
          <MenuItem label="알림 설정" onPress={() => {}} />
          <MenuItem label="계정 설정" onPress={() => {}} showChevron />
        </View>

        {/* ── 로그아웃 ── */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={[styles.logoutBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
        >
          <Text style={[styles.logoutText, { color: C.textSub }]}>로그아웃</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* 더보기 옵션 바텀시트 */}
      <OptionSheet
        isOpen={optionOpen}
        onClose={() => setOptionOpen(false)}
        title="설정"
        options={MORE_OPTIONS(
          () => Alert.alert("프로필", "프로필 페이지로 이동합니다."),
          handleLogout
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  body: { padding: 16, gap: 12, paddingBottom: 40 },

  // 프로필 카드
  profileCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileLeft: {},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  profileInfo: { flex: 1, gap: 4 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profileName: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  projectBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  projectBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "500" },
  profileEmail: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  profileDetail: { color: "rgba(255,255,255,0.75)", fontSize: 12 },

  // 메뉴 카드
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuGroupLabel: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuLabel: { fontSize: 15, fontWeight: "500" },

  // 로그아웃
  logoutBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutText: { fontSize: 15, fontWeight: "500" },
});
