/**
 * app/(screens)/report/[projectId].tsx
 * 기여도 리포트 — 피그마 디자인 기준
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import OptionSheet, { REPORT_OPTIONS } from "@/components/modals/OptionSheet";
import Icon from "@/components/common/Icon";
import MoaLogo from "@/components/common/MoaLogo";
import { ReportAPI } from "@/services/api";

interface MemberReport {
  name: string;
  initial: string;
  contribution: number;
  score: number;
  todosDone: number;
  todosTotal: number;
  aiComment: string | null;
}

// ── 다운로드 아이콘 ────────────────────────
function DownloadIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v12M8 11l4 4 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 19h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ── 기여도 바 ──────────────────────────────
function ContribBar({ member, accent, rank }: { member: MemberReport; accent: string; rank: number }) {
  const C = useTheme();
  const isFirst = rank === 0;
  return (
    <View style={s.contribRow}>
      <View style={s.contribLeft}>
        <Text style={[s.rank, { color: isFirst ? accent : C.textMuted }]}>{rank + 1}</Text>
        <View style={[s.memberAvatar, { backgroundColor: isFirst ? accent + "20" : C.bgMuted }]}>
          <Text style={[s.memberInitial, { color: isFirst ? accent : C.textSub }]}>{member.initial}</Text>
        </View>
        <View>
          <Text style={[s.memberName, { color: C.text }]}>{member.name}</Text>
          <Text style={[s.memberTodo, { color: C.textMuted }]}>{member.todosDone}/{member.todosTotal} 완료</Text>
        </View>
      </View>
      <View style={s.contribRight}>
        <View style={[s.barTrack, { backgroundColor: C.bgMuted }]}>
          <View style={[s.barFill, { width: `${member.score}%` as any, backgroundColor: isFirst ? accent : C.border }]} />
        </View>
        <Text style={[s.contribPct, { color: isFirst ? accent : C.textMuted }]}>{member.score}점</Text>
      </View>
    </View>
  );
}

// ── 메인 화면 ──────────────────────────────
export default function ReportScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { projects } = useProject();
  const [optionOpen, setOptionOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  const [members, setMembers] = useState<MemberReport[]>([]);
  const [meetingCount, setMeetingCount] = useState(0);
  const [overallComment, setOverallComment] = useState<string | null>(null);
  const [todoStats, setTodoStats] = useState({ total: 0, done: 0, rate: 0 });

  useFocusEffect(
    useCallback(() => {
      if (!projectId) return;
      ReportAPI.get(projectId).then((r) => {
        setMembers(r.members.map((m) => ({
          name: m.name,
          initial: m.name.charAt(0),
          contribution: m.contribution,
          score: m.score,
          todosDone: m.todos_done,
          todosTotal: m.todos_total,
          aiComment: m.ai_comment,
        })));
        setMeetingCount(r.meeting_count);
        setOverallComment(r.overall_comment);
        setTodoStats({ total: r.total_todos, done: r.done_todos, rate: r.completion_rate });
      }).catch(() => {});
    }, [projectId])
  );

  // 통계 계산 (점수 기준)
  const myScore = members[0]?.score ?? 0;
  const teamAvg = members.length
    ? Math.round(members.reduce((s, m) => s + m.score, 0) / members.length)
    : 0;
  const myRank = 1;

  // 미배정 할 일 = 전체 - 멤버 합
  const assignedTotal = members.reduce((s, m) => s + m.todosTotal, 0);
  const assignedDone = members.reduce((s, m) => s + m.todosDone, 0);
  const unassignedTotal = Math.max(0, todoStats.total - assignedTotal);
  const unassignedDone = Math.max(0, todoStats.done - assignedDone);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top", "bottom"]}>
      {/* 흰색 헤더 */}
      <View style={[s.topBar, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.topBarTitleWrap}>
          <MoaLogo size={22} variant="primary" />
          <Text style={[s.topBarSub, { color: C.textMuted }]}>기여도 리포트 · </Text>
          <Text style={[s.topBarBold, { color: C.text }]} numberOfLines={1}>{project.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setOptionOpen(true)} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="settings" size={22} color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* 파란 그라디언트 섹션 */}
      <LinearGradient
        colors={["#00A9EC", "#0084FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        {/* 제목 + PDF 버튼 */}
        <View style={s.headerTitleRow}>
          <View>
            <Text style={s.headerProjectName}>{project.name}</Text>
            <Text style={s.headerTitle}>기여도 리포트</Text>
          </View>
          <TouchableOpacity
            style={s.pdfBtn}
            activeOpacity={0.85}
            onPress={() => Alert.alert("PDF 다운로드", "리포트를 PDF로 저장합니다.")}
          >
            <DownloadIcon color="#00A9EC" />
          </TouchableOpacity>
        </View>

        {/* 통계 4개 카드 */}
        <View style={s.statRow}>
          {[
            { label: "순위",    value: `${myRank}위` },
            { label: "내 점수", value: `${myScore}` },
            { label: "팀 평균", value: `${teamAvg}` },
            { label: "회의 횟수", value: `${meetingCount}회` },
          ].map((stat) => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* 콘텐츠 */}
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={[s.contentCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[s.contentTitle, { color: C.text }]}>팀원별 기여도</Text>
          <View style={s.contribList}>
            {members.map((member, idx) => (
              <ContribBar key={member.name} member={member} accent={project.color} rank={idx} />
            ))}
          </View>
        </View>

        {/* Todo 현황 */}
        <View style={[s.contentCard, { backgroundColor: C.bgCard, borderColor: C.border, marginTop: 14 }]}>
          <View style={s.todoHeaderRow}>
            <Text style={[s.contentTitle, { color: C.text }]}>📋 Todo 현황</Text>
            <Text style={[s.todoOverall, { color: C.textMuted }]}>
              전체 {todoStats.total}개 중 {todoStats.done}개 완료 · {todoStats.rate}%
            </Text>
          </View>
          {/* 전체 진행 바 */}
          <View style={[s.todoTrack, { backgroundColor: C.bgMuted }]}>
            <View style={[s.todoFill, { width: `${todoStats.rate}%` as any, backgroundColor: project.color }]} />
          </View>
          {/* 멤버별 진행 */}
          <View style={{ gap: 10, marginTop: 6 }}>
            {members.map((m) => {
              const pct = m.todosTotal > 0 ? Math.round((m.todosDone / m.todosTotal) * 100) : 0;
              return (
                <View key={m.name} style={s.todoMemberRow}>
                  <Text style={[s.todoMemberName, { color: C.text }]} numberOfLines={1}>{m.name}</Text>
                  <View style={[s.todoTrack, { flex: 1, backgroundColor: C.bgMuted }]}>
                    <View style={[s.todoFill, { width: `${pct}%` as any, backgroundColor: project.color }]} />
                  </View>
                  <Text style={[s.todoMemberCount, { color: C.textMuted }]}>{m.todosDone}/{m.todosTotal}</Text>
                </View>
              );
            })}
            {/* 미배정 (담당자 없는 할 일) */}
            {unassignedTotal > 0 && (
              <View style={s.todoMemberRow}>
                <Text style={[s.todoMemberName, { color: C.textMuted }]} numberOfLines={1}>미배정</Text>
                <View style={[s.todoTrack, { flex: 1, backgroundColor: C.bgMuted }]}>
                  <View style={[s.todoFill, { width: `${unassignedTotal > 0 ? Math.round((unassignedDone / unassignedTotal) * 100) : 0}%` as any, backgroundColor: C.textMuted }]} />
                </View>
                <Text style={[s.todoMemberCount, { color: C.textMuted }]}>{unassignedDone}/{unassignedTotal}</Text>
              </View>
            )}
          </View>
          {unassignedTotal > 0 && (
            <Text style={[s.todoHint, { color: C.textMuted }]}>
              담당자 없는 할 일 {unassignedTotal}개 — To-Do에서 길게 눌러 담당자를 지정하면 기여도에 반영돼요.
            </Text>
          )}
        </View>

        {/* AI 종합 평가 */}
        {overallComment && (
          <View style={[s.contentCard, { backgroundColor: C.primary + "08", borderColor: C.primary + "30", marginTop: 14 }]}>
            <Text style={[s.contentTitle, { color: C.primary }]}>🤖 AI 종합 평가</Text>
            <Text style={[s.aiOverall, { color: C.textSub }]}>{overallComment}</Text>
          </View>
        )}

        {/* 멤버별 AI 코멘트 */}
        {members.some((m) => m.aiComment) && (
          <View style={[s.contentCard, { backgroundColor: C.bgCard, borderColor: C.border, marginTop: 14 }]}>
            <Text style={[s.contentTitle, { color: C.text }]}>💬 팀원별 AI 코멘트</Text>
            <View style={{ gap: 12 }}>
              {members.filter((m) => m.aiComment).map((m) => (
                <View key={m.name} style={s.aiCommentRow}>
                  <View style={[s.memberAvatar, { backgroundColor: project.color + "20" }]}>
                    <Text style={[s.memberInitial, { color: project.color }]}>{m.initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.memberName, { color: C.text }]}>{m.name}</Text>
                    <Text style={[s.aiCommentText, { color: C.textSub }]}>{m.aiComment}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  // 흰색 상단 바
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarTitleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  topBarSub: { fontSize: 15, fontWeight: "400" },
  topBarBold: { fontSize: 15, fontWeight: "700", flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  // 파란 그라디언트 섹션
  header: { paddingBottom: 20 },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  headerProjectName: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500", marginBottom: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  pdfBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // 통계 카드
  statRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "500" },
  statValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },

  // 콘텐츠
  body: { padding: 16, paddingBottom: 40 },
  contentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  contentTitle: { fontSize: 15, fontWeight: "700" },

  // 기여도 바
  contribList: { gap: 12 },
  contribRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  contribLeft: { flexDirection: "row", alignItems: "center", gap: 8, width: 150, flexShrink: 0 },
  rank: { fontSize: 14, fontWeight: "700", width: 16, textAlign: "center" },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  memberInitial: { fontSize: 14, fontWeight: "700" },
  memberName: { fontSize: 13, fontWeight: "600" },
  memberTodo: { fontSize: 11, marginTop: 1 },
  contribRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  contribPct: { fontSize: 12, fontWeight: "700", width: 40, textAlign: "right" },

  todoHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  todoOverall: { fontSize: 12, fontWeight: "500" },
  todoTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  todoFill: { height: "100%", borderRadius: 4 },
  todoMemberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  todoMemberName: { fontSize: 13, fontWeight: "600", width: 70 },
  todoMemberCount: { fontSize: 12, fontWeight: "600", width: 40, textAlign: "right" },
  todoHint: { fontSize: 11, lineHeight: 16, marginTop: 8 },

  aiOverall: { fontSize: 14, lineHeight: 22 },
  aiCommentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  aiCommentText: { fontSize: 13, lineHeight: 20, marginTop: 3 },
});
