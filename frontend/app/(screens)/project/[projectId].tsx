/**
 * app/(screens)/project/[projectId].tsx
 *
 * 프로젝트 세부 화면 — 탭별 내용 (개요 / 채팅 / 할일 / 파일)
 */

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
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import Icon from "@/components/common/Icon";
import MoaLogo from "@/components/common/MoaLogo";
import ProjectEditSheet from "@/components/modals/ProjectEditSheet";

const STATUS_CONFIG = {
  active:    { label: "진행중", color: "#00A9EC", bg: "#E6F7FD" },
  upcoming:  { label: "예정",   color: "#7C3AED", bg: "#F5F3FF" },
  completed: { label: "완료",   color: "#16A34A", bg: "#F0FDF4" },
} as const;

const PROJECT_COLOR = {
  blue:   "#00A9EC",
  purple: "#7C3AED",
  green:  "#16A34A",
} as const;

type Tab = "overview" | "chat" | "todo" | "files";

export default function ProjectDetailScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { projects, setCurrentProject, updateProject } = useProject();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <Text style={{ color: C.text, textAlign: "center", marginTop: 40 }}>
          프로젝트를 찾을 수 없습니다.
        </Text>
      </SafeAreaView>
    );
  }

  const { label, color: statusColor, bg: statusBg } = STATUS_CONFIG[project.status];
  const accentColor = PROJECT_COLOR[project.color];

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "개요",   icon: "home"     },
    { key: "chat",     label: "채팅",   icon: "chat"     },
    { key: "todo",     label: "할일",   icon: "todo"     },
    { key: "files",    label: "파일",   icon: "folder"   },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={["top", "bottom"]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <MoaLogo size={24} variant="primary" />
          <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
            {project.name}
          </Text>
        </View>

        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => setEditOpen(true)}>
          <Icon name="option" size={22} color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* ── 탭 바 ── */}
      <View style={[styles.tabBar, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        {TABS.map((tab) => {
          const focused = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Icon
                name={tab.icon}
                size={20}
                color={focused ? accentColor : C.textMuted}
                active={focused}
              />
              <Text style={[styles.tabLabel, { color: focused ? accentColor : C.textMuted }]}>
                {tab.label}
              </Text>
              {focused && (
                <View style={[styles.tabUnderline, { backgroundColor: accentColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 탭 콘텐츠 ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" && (
          <OverviewTab
            project={project}
            C={C}
            accentColor={accentColor}
            statusLabel={label}
            statusColor={statusColor}
            statusBg={statusBg}
            onMeeting={() => {
              setCurrentProject(project);
              router.push("/(screens)/meeting");
            }}
            onReport={() => {
              setCurrentProject(project);
              router.push(`/(screens)/report/${project.id}`);
            }}
          />
        )}
        {activeTab === "chat" && <PlaceholderTab icon="chat" label="채팅" C={C} />}
        {activeTab === "todo" && <PlaceholderTab icon="todo" label="할일" C={C} />}
        {activeTab === "files" && <PlaceholderTab icon="folder" label="파일" C={C} />}
      </ScrollView>

      {/* 프로젝트 수정 시트 */}
      <ProjectEditSheet
        isOpen={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => {
          updateProject(updated);
        }}
      />
    </SafeAreaView>
  );
}

// ── 날짜 파싱 유틸 ("YYYY.MM.DD" → Date) ──────────────────────
function parseDate(s: string): Date {
  const [y, m, d] = s.split(".").map(Number);
  return new Date(y, m - 1, d);
}

function calcTimeProgress(startDate: string, endDate: string): number {
  const now   = new Date();
  const start = parseDate(startDate);
  const end   = parseDate(endDate);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

// ── 개요 탭 ─────────────────────────────────────────────────────
interface OverviewTabProps {
  project: ReturnType<typeof useProject>["projects"][0];
  C: ReturnType<typeof useTheme>;
  accentColor: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  onMeeting: () => void;
  onReport: () => void;
}

function OverviewTab({
  project, C, accentColor,
  statusLabel, statusColor, statusBg,
  onMeeting, onReport,
}: OverviewTabProps) {
  const timeProgress = calcTimeProgress(project.startDate, project.endDate);

  return (
    <>
      {/* 프로젝트 히어로 카드 */}
      <LinearGradient
        colors={[accentColor + "28", accentColor + "06"]}
        style={[styles.heroCard, { borderColor: accentColor + "40" }]}
      >
        <View style={styles.heroTop}>
          <Text style={styles.heroEmoji}>{project.emoji}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={[styles.heroName, { color: C.text }]}>{project.name}</Text>

        {/* 기간 + 진행률 바 */}
        <View style={styles.periodSection}>
          {/* 날짜 범위 + D-day */}
          <View style={styles.periodRow}>
            <View style={styles.periodDates}>
              <Icon name="alarm" size={13} color={C.textMuted} />
              <Text style={[styles.periodText, { color: C.textMuted }]}>
                {project.startDate} ~ {project.endDate}
              </Text>
            </View>
            <View style={[styles.dDayBadge, { backgroundColor: accentColor + "18" }]}>
              <Text style={[styles.dDayText, { color: accentColor }]}>
                D-{project.daysLeft}
              </Text>
            </View>
          </View>

          {/* 진행률 바 */}
          <View style={[styles.progressTrack, { backgroundColor: accentColor + "20" }]}>
            <LinearGradient
              colors={[accentColor + "CC", accentColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${timeProgress}%` as any }]}
            />
            {/* 오늘 마커 */}
            <View
              style={[
                styles.todayMarker,
                { left: `${timeProgress}%` as any, borderColor: accentColor },
              ]}
            />
          </View>

          {/* 하단 레이블 */}
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabelText, { color: C.textMuted }]}>
              {project.startDate}
            </Text>
            <Text style={[styles.progressPercent, { color: accentColor }]}>
              {timeProgress}% 경과
            </Text>
            <Text style={[styles.progressLabelText, { color: C.textMuted }]}>
              {project.endDate}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* 빠른 실행 버튼 */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: accentColor }]}
          onPress={onMeeting}
          activeOpacity={0.85}
        >
          <Icon name="mic" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>회의 시작</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: C.border, backgroundColor: C.bgCard }]}
          onPress={onReport}
          activeOpacity={0.85}
        >
          <Icon name="file" size={18} color={C.textSub} />
          <Text style={[styles.btnSecondaryText, { color: C.textSub }]}>기여도 리포트</Text>
        </TouchableOpacity>
      </View>

      {/* 정보 카드 */}
      <View style={[styles.infoCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        <InfoRow icon="alarm"    label="시작일" value={project.startDate} C={C} />
        <InfoRow icon="alarm"    label="마감일" value={project.endDate}   C={C} />
        <View style={[styles.infoRow, { borderBottomWidth: 0, borderBottomColor: C.border }]}>
          <Icon name="checkbox" size={18} color={C.textMuted} />
          <Text style={[styles.infoLabel, { color: C.textMuted }]}>상태</Text>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {/* 팀원 카드 */}
      <View style={[styles.infoCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        <View style={[styles.memberHeader, { borderBottomColor: C.border }]}>
          <Icon name="profile" size={18} color={C.textMuted} />
          <Text style={[styles.memberHeaderLabel, { color: C.textMuted }]}>팀원</Text>
          <Text style={[styles.memberCount, { color: C.textMuted }]}>{project.memberCount}명</Text>
        </View>
        {project.members.map((member, idx) => (
          <View
            key={member.id}
            style={[
              styles.memberRow,
              { borderBottomColor: C.border },
              idx === project.members.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.memberAvatar, { backgroundColor: accentColor + "22" }]}>
              <Text style={[styles.memberAvatarText, { color: accentColor }]}>
                {member.name.charAt(0)}
              </Text>
            </View>
            <Text style={[styles.memberName, { color: C.text }]}>{member.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: C.bg }]}>
              <Text style={[styles.roleText, { color: C.textSub }]}>{member.role}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function InfoRow({
  icon, label, value, C, valueColor,
}: {
  icon: any;
  label: string;
  value: string;
  C: ReturnType<typeof useTheme>;
  valueColor?: string;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        { borderBottomColor: C.border },
      ]}
    >
      <Icon name={icon} size={18} color={C.textMuted} />
      <Text style={[styles.infoLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor ?? C.text }]}>{value}</Text>
    </View>
  );
}

// ── 준비 중 탭 ───────────────────────────────────────────────────
function PlaceholderTab({
  icon, label, C,
}: {
  icon: any;
  label: string;
  C: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.placeholder}>
      <Icon name={icon} size={48} color={C.border} />
      <Text style={[styles.placeholderText, { color: C.textMuted }]}>
        {label} 기능 준비 중
      </Text>
    </View>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },

  // 탭 바
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 4,
    position: "relative",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 2,
  },

  // 스크롤 바디
  body: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  // 히어로 카드
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heroEmoji: {
    fontSize: 32,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroMeta: {
    fontSize: 13,
    marginBottom: 4,
  },

  // 기간 섹션
  periodSection: {
    marginTop: 14,
    gap: 8,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "500",
  },
  dDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  dDayText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  todayMarker: {
    position: "absolute",
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    borderWidth: 2.5,
    marginLeft: -7,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabelText: {
    fontSize: 10,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "700",
  },

  // 배지
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // 빠른 실행 버튼
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: "500",
  },

  // 정보 카드
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },

  // 팀원 카드
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberHeaderLabel: {
    fontSize: 14,
    flex: 1,
  },
  memberCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // 준비 중
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  placeholderText: {
    fontSize: 15,
  },
});
