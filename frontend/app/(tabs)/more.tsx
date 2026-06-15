/**
 * app/(tabs)/more.tsx — 프로필 탭
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { ReportAPI } from "@/services/api";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";

function EditIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FriendIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 8v6M16 11h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

type HealthStatus = { label: string; desc: string; color: string; bg: string; border: string };

/** 내 기여도 점수 기반: 80↑ 양호 / 60↑ 보통 / 그 외 주의 */
function getProjectHealth(score: number): HealthStatus {
  if (score >= 80) return { label: "양호", desc: `내 기여도 ${score}점 · 잘 참여 중`,    color: "#27AE60", bg: "rgba(34,255,136,0.1)",  border: "#27AE60" };
  if (score >= 60) return { label: "보통", desc: `내 기여도 ${score}점 · 조금 더 힘내요`, color: "#E2B93B", bg: "rgba(226,185,59,0.1)", border: "#E2B93B" };
  return                  { label: "주의", desc: `내 기여도 ${score}점 · 참여가 필요해요`, color: "#EB5757", bg: "rgba(235,87,87,0.1)",  border: "#EB5757" };
}

export default function MoreScreen() {
  const C = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { projects, loading } = useProject();

  // 저장된 프로젝트별 내 기여도 점수 (DB에서 한 번에 조회, AI 없음)
  const [myScores, setMyScores] = useState<Record<string, number>>({});
  const [scoresLoaded, setScoresLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      ReportAPI.myScores()
        .then((scores) => { if (!cancelled) setMyScores(scores || {}); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setScoresLoaded(true); });
      return () => { cancelled = true; };
    }, [])
  );

  const displayName = user?.fullName || user?.username || "-";
  const avatarChar = displayName.charAt(0);
  const projectCount = projects.length;
  const affiliationParts = [user?.organizationName, user?.department, user?.studentId].filter(Boolean);

  const INFO_ROWS = [
    { label: "이름",   value: displayName },
    { label: "이메일", value: user?.email },
    { label: "학교",   value: user?.organizationName },
    { label: "학과",   value: user?.department },
    { label: "학번",   value: user?.studentId },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <View style={s.headerLeft}>
          <MoaLogo size={32} />
          <Text style={[s.headerTitle, { color: C.text }]}>프로필</Text>
        </View>
        <TouchableOpacity
          style={s.iconBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/(screens)/settings" as any)}
        >
          <Icon name="settings" size={22} color={C.textSub} />
        </TouchableOpacity>
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

        {/* ── 액션 버튼 ── */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/(screens)/profile-edit" as any)}
          >
            <EditIcon color={C.textSub} />
            <Text style={[s.actionBtnText, { color: C.text }]}>회원정보 수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/(screens)/friends" as any)}
          >
            <FriendIcon color={C.textSub} />
            <Text style={[s.actionBtnText, { color: C.text }]}>친구 관리</Text>
          </TouchableOpacity>
        </View>

        {/* ── 회원정보 ── */}
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMuted, borderBottomColor: C.border }]}>회원정보</Text>
          {INFO_ROWS.map(({ label, value }, i) => (
            <View
              key={label}
              style={[
                s.infoRow,
                { borderBottomColor: C.border },
                i < INFO_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[s.infoLabel, { color: C.textMuted }]}>{label}</Text>
              <Text style={[s.infoValue, { color: C.text }]}>{value || "-"}</Text>
            </View>
          ))}
        </View>

        {/* ── 폴더 바로가기 ── */}
        <TouchableOpacity
          style={[s.driveRow, { backgroundColor: C.bgCard, borderColor: C.border }]}
          activeOpacity={0.8}
          onPress={() => router.push("/(screens)/drive" as any)}
        >
          <Icon name="folder" size={22} color={C.primary} />
          <Text style={[s.driveRowText, { color: C.text }]}>드라이브 바로가기</Text>
          <Icon name="chevron" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* ── 팀 컨디션 모니터링 ── */}
        <Text style={[s.sectionLabel, { color: C.textMuted }]}>팀 컨디션 모니터링</Text>
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {loading ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : projects.map((proj, idx) => {
            const score = myScores[proj.id];
            const scoreLoading = !scoresLoaded;
            const analyzed = score !== undefined;
            const health = analyzed ? getProjectHealth(score) : null;
            return (
              <View
                key={proj.id}
                style={[
                  s.healthRow,
                  { borderBottomColor: C.border },
                  idx < projects.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[s.healthAvatar, { backgroundColor: proj.color + "22" }]}>
                  <Text style={s.healthEmoji}>{proj.emoji}</Text>
                </View>
                <View style={s.healthInfo}>
                  <Text style={[s.healthName, { color: C.text }]} numberOfLines={1}>{proj.name}</Text>
                  <Text style={[s.healthDesc, { color: C.textMuted }]}>
                    {scoreLoading
                      ? "불러오는 중…"
                      : analyzed
                        ? health!.desc
                        : "기여도 리포트를 열면 분석돼요"}
                  </Text>
                </View>
                {scoreLoading ? (
                  <ActivityIndicator size="small" color={C.textMuted} />
                ) : analyzed ? (
                  <View style={[s.healthBadge, { backgroundColor: health!.bg, borderColor: health!.border }]}>
                    <Text style={[s.healthBadgeText, { color: health!.color }]}>{health!.label}</Text>
                  </View>
                ) : (
                  <View style={[s.healthBadge, { backgroundColor: C.bgMuted, borderColor: C.border }]}>
                    <Text style={[s.healthBadgeText, { color: C.textMuted }]}>분석 전</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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

  body: { padding: 16, gap: 12, paddingBottom: 120 },

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
  avatarText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  profileInfo: { flex: 1, gap: 5 },
  profileName: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  profileUsername: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  projectBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  projectBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  profileAffiliation: { color: "rgba(255,255,255,0.7)", fontSize: 12 },

  // 액션 버튼
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: "600" },

  // 카드
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "500" },

  // 섹션 레이블
  sectionLabel: { fontSize: 12, fontWeight: "600", paddingHorizontal: 4, marginBottom: -4 },

  // 팀 컨디션 모니터링 행
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  healthAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  healthEmoji: { fontSize: 20 },
  healthInfo: { flex: 1, gap: 3 },
  healthName: { fontSize: 14, fontWeight: "500" },
  healthDesc: { fontSize: 12 },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  healthBadgeText: { fontSize: 12, fontWeight: "600" },

  // 폴더 바로가기 행
  driveRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driveRowText: { flex: 1, fontSize: 15, fontWeight: "500" },
});
