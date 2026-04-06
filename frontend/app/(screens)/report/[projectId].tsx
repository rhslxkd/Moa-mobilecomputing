/**
 * app/(screens)/report/[projectId].tsx
 *
 * 프로젝트 기여도 리포트 화면 — 피그마 Project/Card "기여도 리포트" 버튼 연결
 * - 프로젝트 개요 (진행률, 마감일)
 * - 팀원별 기여도 바
 * - 할일 완료 통계
 * - 회의 횟수
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useProject, type Project } from "@/contexts/ProjectContext";
import OptionSheet, { REPORT_OPTIONS } from "@/components/modals/OptionSheet";

// ── Mock 리포트 데이터 ─────────────────────
interface MemberReport {
  name: string;
  initial: string;
  contribution: number; // 0-100
  todosDone: number;
  todosTotal: number;
}

const MOCK_REPORTS: Record<string, MemberReport[]> = {
  "1": [
    { name: "박지민", initial: "박", contribution: 35, todosDone: 8,  todosTotal: 10 },
    { name: "이지은", initial: "이", contribution: 28, todosDone: 6,  todosTotal: 8  },
    { name: "김철수", initial: "김", contribution: 20, todosDone: 5,  todosTotal: 7  },
    { name: "최유진", initial: "최", contribution: 17, todosDone: 4,  todosTotal: 6  },
  ],
  "2": [
    { name: "박지민", initial: "박", contribution: 40, todosDone: 5, todosTotal: 6 },
    { name: "이지은", initial: "이", contribution: 35, todosDone: 4, todosTotal: 5 },
    { name: "김철수", initial: "김", contribution: 25, todosDone: 3, todosTotal: 4 },
  ],
  "3": [
    { name: "박지민", initial: "박", contribution: 50, todosDone: 3, todosTotal: 4 },
    { name: "이지은", initial: "이", contribution: 30, todosDone: 2, todosTotal: 3 },
    { name: "김철수", initial: "김", contribution: 20, todosDone: 1, todosTotal: 2 },
  ],
};

const MOCK_MEETINGS: Record<string, number> = { "1": 12, "2": 7, "3": 5 };

// ── 컬러 매핑 ─────────────────────────────
function getAccent(project: Project, C: ReturnType<typeof useTheme>) {
  switch (project.color) {
    case "blue":   return C.primary;
    case "purple": return C.purple;
    case "green":  return C.success;
  }
}

// ── 기여도 바 아이템 ───────────────────────
interface ContribBarProps {
  member: MemberReport;
  accent: string;
  rank: number;
}

function ContribBar({ member, accent, rank }: ContribBarProps) {
  const C = useTheme();
  const isFirst = rank === 0;

  return (
    <View style={styles.contribRow}>
      {/* 순위 + 아바타 */}
      <View style={styles.contribLeft}>
        <Text style={[styles.rank, { color: isFirst ? accent : C.textMuted }]}>
          {rank + 1}
        </Text>
        <View
          style={[
            styles.memberAvatar,
            { backgroundColor: isFirst ? accent + "20" : C.bgMuted },
          ]}
        >
          <Text
            style={[
              styles.memberInitial,
              { color: isFirst ? accent : C.textSub },
            ]}
          >
            {member.initial}
          </Text>
        </View>
        <View>
          <Text style={[styles.memberName, { color: C.text }]}>{member.name}</Text>
          <Text style={[styles.memberTodo, { color: C.textMuted }]}>
            {member.todosDone}/{member.todosTotal} 완료
          </Text>
        </View>
      </View>

      {/* 기여도 바 */}
      <View style={styles.contribRight}>
        <View style={[styles.barTrack, { backgroundColor: C.bgMuted }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${member.contribution}%`,
                backgroundColor: isFirst ? accent : C.border,
              },
            ]}
          />
        </View>
        <Text style={[styles.contribPct, { color: isFirst ? accent : C.textMuted }]}>
          {member.contribution}%
        </Text>
      </View>
    </View>
  );
}

// ── 통계 카드 ──────────────────────────────
interface StatCardProps {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}

function StatCard({ emoji, label, value, sub, accent }: StatCardProps) {
  const C = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: C.bgCard, borderColor: C.border },
      ]}
    >
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.textSub }]}>{label}</Text>
      {sub && (
        <Text style={[styles.statSub, { color: C.textMuted }]}>{sub}</Text>
      )}
    </View>
  );
}

// ── 메인 화면 ──────────────────────────────
export default function ReportScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { projects } = useProject();

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const members = MOCK_REPORTS[project.id] ?? MOCK_REPORTS["1"];
  const meetingCount = MOCK_MEETINGS[project.id] ?? 0;
  const accent = getAccent(project, C);
  const [optionOpen, setOptionOpen] = useState(false);

  const totalDone  = members.reduce((s, m) => s + m.todosDone, 0);
  const totalTodos = members.reduce((s, m) => s + m.todosTotal, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          { backgroundColor: C.bgCard, borderBottomColor: C.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          기여도 리포트
        </Text>
        {/* 옵션 버튼 */}
        <TouchableOpacity
          onPress={() => setOptionOpen(true)}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.moreIcon, { color: C.textSub }]}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* 리포트 옵션 바텀시트 */}
      <OptionSheet
        isOpen={optionOpen}
        onClose={() => setOptionOpen(false)}
        title="기여도 리포트"
        subtitle={project.name}
        options={REPORT_OPTIONS(
          () => Alert.alert("공유", "리포트를 공유했습니다."),
          () => { Alert.alert("삭제", "리포트가 삭제되었습니다."); router.back(); }
        )}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로젝트 개요 */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: C.bgCard, borderColor: C.border },
          ]}
        >
          <View style={styles.overviewTop}>
            <Text style={{ fontSize: 28 }}>{project.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.projectName, { color: C.text }]}>
                {project.name}
              </Text>
              <Text style={[styles.projectMeta, { color: C.textMuted }]}>
                마감 {project.dueDate} · D-{project.daysLeft}
              </Text>
            </View>
          </View>

          {/* 전체 진행률 */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: C.textSub }]}>
                전체 진행률
              </Text>
              <Text style={[styles.progressPct, { color: accent }]}>
                {project.progress}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.bgMuted }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${project.progress}%`, backgroundColor: accent },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 통계 카드 3개 */}
        <View style={styles.statGrid}>
          <StatCard
            emoji="✅"
            label="할일 완료"
            value={`${totalDone}/${totalTodos}`}
            sub={`${Math.round((totalDone / totalTodos) * 100)}%`}
            accent={accent}
          />
          <StatCard
            emoji="🎙"
            label="총 회의"
            value={`${meetingCount}회`}
            accent={accent}
          />
          <StatCard
            emoji="👥"
            label="팀원"
            value={`${members.length}명`}
            accent={accent}
          />
        </View>

        {/* 팀원별 기여도 */}
        <View
          style={[
            styles.section,
            { backgroundColor: C.bgCard, borderColor: C.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            팀원별 기여도
          </Text>
          <View style={styles.contribList}>
            {members.map((member, idx) => (
              <ContribBar
                key={member.name}
                member={member}
                accent={accent}
                rank={idx}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 32, fontWeight: "300", lineHeight: 36 },
  moreIcon: { fontSize: 22, fontWeight: "600", letterSpacing: 2 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },

  body: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  // 개요
  overviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  projectName: { fontSize: 16, fontWeight: "700" },
  projectMeta: { fontSize: 12, marginTop: 2 },
  progressSection: { gap: 8 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  progressPct: { fontSize: 13, fontWeight: "700" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  // 통계 그리드
  statGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  statSub: { fontSize: 11 },

  // 기여도 섹션
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },

  contribList: { gap: 12 },
  contribRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contribLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 150,
    flexShrink: 0,
  },
  rank: { fontSize: 14, fontWeight: "700", width: 16, textAlign: "center" },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memberInitial: { fontSize: 14, fontWeight: "700" },
  memberName: { fontSize: 13, fontWeight: "600" },
  memberTodo: { fontSize: 11, marginTop: 1 },

  contribRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  contribPct: { fontSize: 12, fontWeight: "700", width: 36, textAlign: "right" },
});
