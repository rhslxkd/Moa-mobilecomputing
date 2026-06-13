/**
 * app/(screens)/project/[projectId].tsx
 *
 * 프로젝트 세부 화면 — 탭별 내용 (개요 / 채팅 / 할일 / 파일)
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { ChatAPI } from "@/services/api";
import Icon from "@/components/common/Icon";
import MoaLogo from "@/components/common/MoaLogo";
import ProjectEditSheet from "@/components/modals/ProjectEditSheet";

const STATUS_CONFIG = {
  active:    { label: "진행중", color: "#00A9EC", bg: "#E6F7FD" },
  upcoming:  { label: "예정",   color: "#7C3AED", bg: "#F5F3FF" },
  completed: { label: "완료",   color: "#16A34A", bg: "#F0FDF4" },
} as const;

type Tab = "overview" | "chat" | "todo" | "files" | "schedule";

export default function ProjectDetailScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { projects, setCurrentProject, updateProject, deleteProject } = useProject();
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
  const accentColor = project.color;

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "개요",   icon: "home"     },
    { key: "chat",     label: "채팅",   icon: "chat"     },
    { key: "todo",     label: "할일",   icon: "todo"     },
    { key: "files",    label: "파일",   icon: "folder"   },
    { key: "schedule", label: "일정",   icon: "calendar" },
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
              onPress={() => {
                if (tab.key === "files") {
                  // 프로젝트 폴더로 진입 (project_id 컨텍스트)
                  router.push({ pathname: "/(screens)/drive/[folderId]", params: { folderId: project.id, folderName: project.name, isPersonal: "0" } } as any);
                } else if (tab.key === "chat") {
                  setCurrentProject(project);
                  router.push({ pathname: "/(screens)/chat/[projectId]", params: { projectId: project.id, name: project.name, isProjectId: "1" } } as any);
                } else if (tab.key === "todo") {
                  router.push(`/(screens)/todo/${project.id}` as any);
                } else if (tab.key === "schedule") {
                  router.push(`/(screens)/when2meet/${project.id}` as any);
                } else {
                  setActiveTab(tab.key);
                }
              }}
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
      </ScrollView>

      {/* 프로젝트 수정 시트 */}
      <ProjectEditSheet
        isOpen={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => {
          updateProject(updated);
        }}
        onDelete={async (id) => {
          await deleteProject(id).catch(() => {});
          setEditOpen(false);
          router.replace("/(tabs)");
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
                { left: `${timeProgress}%` as any, borderColor: accentColor, backgroundColor: C.bgCard },
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
            <View style={styles.memberRolesRow}>
              {member.roles.map(role => (
                <View key={role} style={[styles.roleBadge, { backgroundColor: C.bg }]}>
                  <Text style={[styles.roleText, { color: C.textSub }]}>{role}</Text>
                </View>
              ))}
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

// ── 팀 투두 탭 ──────────────────────────────────────────────────

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  팀장:          { bg: "#FFF3CD", color: "#B45309" },
  개발자:        { bg: "#E0F2FE", color: "#0369A1" },
  디자이너:      { bg: "#F3E8FF", color: "#7C3AED" },
  기획자:        { bg: "#DCFCE7", color: "#16A34A" },
  "데이터 분석": { bg: "#FEE2E2", color: "#DC2626" },
  QA:            { bg: "#F1F5F9", color: "#64748B" },
};

const TODO_POOL: Record<string, string[]> = {
  팀장:          ["스프린트 계획 수립", "팀 주간 회의 진행", "프로젝트 일정 업데이트", "리스크 관리 문서 작성"],
  개발자:        ["API 엔드포인트 개발", "단위 테스트 작성", "코드 리뷰 진행", "버그 수정 및 배포", "기술 문서 업데이트"],
  디자이너:      ["UI 컴포넌트 제작", "피그마 프로토타입 수정", "사용자 인터뷰 분석", "디자인 시스템 정리"],
  기획자:        ["요구사항 명세서 작성", "사용자 스토리 정의", "경쟁사 분석 보고서", "기능 우선순위 정리"],
  "데이터 분석": ["데이터 전처리 스크립트 작성", "모델 성능 평가", "분석 결과 시각화"],
  QA:            ["테스트 시나리오 작성", "회귀 테스트 수행", "버그 리포트 정리"],
};

interface TodoItemT { id: string; title: string; done: boolean; dueDate: Date }

function toDateStrT(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDdayT(d: Date): { label: string; color: string; bg: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(d);  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: "D-Day", color: "#fff",     bg: "#00A9EC" };
  if (diff > 0)   return { label: `D-${diff}`,             color: "#16A34A", bg: "#DCFCE7" };
  return                  { label: `D+${Math.abs(diff)}`,  color: "#DC2626", bg: "#FEE2E2" };
}

function getMockTodosT(memberId: string, role: string): TodoItemT[] {
  const pool = TODO_POOL[role] ?? TODO_POOL["개발자"];
  const seed = memberId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 2 + (seed % 3);
  const doneCount = seed % 2;
  return pool.slice(0, count + doneCount).map((title, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (seed % 5) + i * 2);
    return { id: `${memberId}-${i}`, title, done: i >= count, dueDate: d };
  });
}

function TChevronLeft({ color }: { color: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function TChevronRight({ color }: { color: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function TChevronDown({ color }: { color: string }) {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"><Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function TChevronUp({ color }: { color: string }) {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"><Path d="M18 15L12 9L6 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function TodoCalendar({ selectedDate, onSelectDate, todosByDate, accent, C }: {
  selectedDate: Date | null;
  onSelectDate: (d: Date | null) => void;
  todosByDate: Record<string, number>;
  accent: string;
  C: ReturnType<typeof useTheme>;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const todayStr = toDateStrT(today);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const next = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <View style={[tcalS.card, { backgroundColor: C.bgCard }]}>
      <View style={tcalS.navRow}>
        <TouchableOpacity onPress={prev} activeOpacity={0.7} style={tcalS.navBtn}><TChevronLeft color={C.textSub} /></TouchableOpacity>
        <Text style={[tcalS.monthLabel, { color: C.text }]}>{viewMonth + 1}월</Text>
        <TouchableOpacity onPress={next} activeOpacity={0.7} style={tcalS.navBtn}><TChevronRight color={C.textSub} /></TouchableOpacity>
      </View>
      <View style={tcalS.weekRow}>
        {DAY_KO.map((d, i) => (
          <Text key={d} style={[tcalS.dayLabel, { color: i === 0 ? "#FF3B30" : i === 6 ? accent : C.textMuted }]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={tcalS.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={tcalS.dayCell} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate
              ? selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day
              : false;
            const count = todosByDate[dateStr] ?? 0;
            const isSun = di === 0, isSat = di === 6;
            return (
              <TouchableOpacity
                key={di}
                style={tcalS.dayCell}
                onPress={() => isSelected ? onSelectDate(null) : onSelectDate(new Date(viewYear, viewMonth, day))}
                activeOpacity={0.7}
              >
                <View style={[tcalS.dayCircle, isSelected && { backgroundColor: accent }, isToday && !isSelected && { borderWidth: 1.5, borderColor: accent }]}>
                  <Text style={[tcalS.dayText, { color: isSelected ? "#fff" : isSun ? "#FF3B30" : isSat ? accent : C.text, fontWeight: isToday ? "700" : "400" }]}>{day}</Text>
                </View>
                {count > 0 && (
                  <View style={tcalS.dotRow}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, pi) => (
                      <View key={pi} style={[tcalS.dot, { backgroundColor: accent }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const tcalS = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 16 },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 17, fontWeight: "700", minWidth: 36, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", paddingVertical: 6, letterSpacing: 0.3 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 4, gap: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 13 },
  dotRow: { flexDirection: "row", gap: 2, height: 5, alignItems: "center" },
  dot: { width: 4, height: 4, borderRadius: 2 },
});

function TTodoRow({ todo, onToggle, accent, C }: { todo: TodoItemT; onToggle: (id: string) => void; accent: string; C: ReturnType<typeof useTheme> }) {
  const dday = getDdayT(todo.dueDate);
  return (
    <TouchableOpacity onPress={() => onToggle(todo.id)} activeOpacity={0.7} style={[trowS.row, { borderBottomColor: C.border }]}>
      <View style={[trowS.checkbox, { borderColor: todo.done ? accent : C.border, backgroundColor: todo.done ? accent : "transparent" }]}>
        {todo.done && (
          <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
            <Polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <Text style={[trowS.title, { color: todo.done ? C.textMuted : C.text, textDecorationLine: todo.done ? "line-through" : "none" }]} numberOfLines={1}>{todo.title}</Text>
      {!todo.done && (
        <View style={[trowS.badge, { backgroundColor: dday.bg }]}>
          <Text style={[trowS.badgeText, { color: dday.color }]}>{dday.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const trowS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { flex: 1, fontSize: 14, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

function TMemberSection({ member, todos, accent, onToggle, C }: {
  member: { id: string; name: string; roles: string[] };
  todos: TodoItemT[];
  accent: string;
  onToggle: (id: string) => void;
  C: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [doneOpen, setDoneOpen] = useState(false);

  if (todos.length === 0) return null;

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  const toggle = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(v => !v); };
  const toggleDone = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setDoneOpen(v => !v); };

  return (
    <View style={[tmemS.card, { backgroundColor: C.bgCard }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={tmemS.header}>
        <View style={[tmemS.avatar, { backgroundColor: accent + "20" }]}>
          <Text style={[tmemS.avatarText, { color: accent }]}>{member.name.charAt(0)}</Text>
        </View>
        <View style={tmemS.nameWrap}>
          <Text style={[tmemS.name, { color: C.text }]}>{member.name}</Text>
          <View style={tmemS.rolesRow}>
            {member.roles.map(role => {
              const rs = ROLE_STYLE[role] ?? { bg: "#F1F5F9", color: "#64748B" };
              return (
                <View key={role} style={[tmemS.rolePill, { backgroundColor: rs.bg }]}>
                  <Text style={[tmemS.roleText, { color: rs.color }]}>{role}</Text>
                </View>
              );
            })}
          </View>
        </View>
        {pending.length > 0 && (
          <View style={[tmemS.countBadge, { backgroundColor: accent }]}>
            <Text style={tmemS.countText}>{pending.length}</Text>
          </View>
        )}
        {expanded ? <TChevronUp color={C.textMuted} /> : <TChevronDown color={C.textMuted} />}
      </TouchableOpacity>

      {expanded && (
        <>
          {pending.map(t => <TTodoRow key={t.id} todo={t} onToggle={onToggle} accent={accent} C={C} />)}
          {done.length > 0 && (
            <>
              <TouchableOpacity onPress={toggleDone} activeOpacity={0.7} style={[tmemS.doneToggle, { borderTopColor: C.border }]}>
                <Text style={[tmemS.doneLabel, { color: C.textMuted }]}>완료 {done.length}개</Text>
                {doneOpen ? <TChevronUp color={C.textMuted} /> : <TChevronDown color={C.textMuted} />}
              </TouchableOpacity>
              {doneOpen && done.map(t => <TTodoRow key={t.id} todo={t} onToggle={onToggle} accent={accent} C={C} />)}
            </>
          )}
          {pending.length === 0 && done.length === 0 && (
            <Text style={[tmemS.empty, { color: C.textMuted }]}>할 일이 없어요.</Text>
          )}
        </>
      )}
    </View>
  );
}

const tmemS = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: "800" },
  nameWrap: { flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 4 },
  name: { fontSize: 15, fontWeight: "700" },
  rolesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  rolePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: "600" },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  doneToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  doneLabel: { fontSize: 12, fontWeight: "500" },
  empty: { textAlign: "center", fontSize: 13, paddingVertical: 18 },
});

function TodoTab({
  project, accentColor, C,
}: {
  project: ReturnType<typeof useProject>["projects"][0];
  accentColor: string;
  C: ReturnType<typeof useTheme>;
}) {
  const [todoMap, setTodoMap] = useState<Record<string, TodoItemT[]>>(() =>
    Object.fromEntries(project.members.map(m => [m.id, getMockTodosT(m.id, m.roles[0] ?? "개발자")]))
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const toggleTodo = (memberId: string, todoId: string) => {
    setTodoMap(prev => ({
      ...prev,
      [memberId]: prev[memberId].map(t => t.id === todoId ? { ...t, done: !t.done } : t),
    }));
  };

  const allTodos = useMemo(() => Object.values(todoMap).flat(), [todoMap]);

  const todosByDate = useMemo(() => {
    const map: Record<string, number> = {};
    allTodos.forEach(t => { if (!t.done) { const k = toDateStrT(t.dueDate); map[k] = (map[k] ?? 0) + 1; } });
    return map;
  }, [allTodos]);

  const filteredMap = useMemo(() => {
    if (!selectedDate) return todoMap;
    const sel = toDateStrT(selectedDate);
    return Object.fromEntries(
      Object.entries(todoMap).map(([id, todos]) => [id, todos.filter(t => toDateStrT(t.dueDate) === sel)])
    );
  }, [todoMap, selectedDate]);

  const totalPending = useMemo(() => Object.values(filteredMap).flat().filter(t => !t.done).length, [filteredMap]);
  const hasAny = useMemo(() => Object.values(filteredMap).some(ts => ts.length > 0), [filteredMap]);

  const dateLabelStr = selectedDate
    ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAY_KO[selectedDate.getDay()]})`
    : "전체";

  return (
    <>
      <TodoCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        todosByDate={todosByDate}
        accent={accentColor}
        C={C}
      />

      <View style={ttabS.filterRow}>
        <Text style={[ttabS.filterLabel, { color: C.text }]}>{dateLabelStr}</Text>
        <View style={ttabS.filterRight}>
          {totalPending > 0 && (
            <View style={[ttabS.totalBadge, { backgroundColor: accentColor + "18" }]}>
              <Text style={[ttabS.totalBadgeText, { color: accentColor }]}>{totalPending}개 남음</Text>
            </View>
          )}
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)} activeOpacity={0.7} style={[ttabS.clearBtn, { borderColor: C.border }]}>
              <Text style={[ttabS.clearText, { color: C.textMuted }]}>전체 보기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {hasAny ? (
        project.members.map(member => (
          <TMemberSection
            key={member.id}
            member={member}
            todos={filteredMap[member.id] ?? []}
            accent={accentColor}
            onToggle={(todoId) => toggleTodo(member.id, todoId)}
            C={C}
          />
        ))
      ) : (
        <View style={ttabS.emptyWrap}>
          <Text style={ttabS.emptyEmoji}>🎉</Text>
          <Text style={[ttabS.emptyTitle, { color: C.text }]}>
            {selectedDate ? "이 날은 할 일이 없어요!" : "모든 할 일을 완료했어요!"}
          </Text>
          <Text style={[ttabS.emptyDesc, { color: C.textMuted }]}>새로운 할 일을 추가해보세요</Text>
        </View>
      )}
    </>
  );
}

const ttabS = StyleSheet.create({
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: -2 },
  filterLabel: { fontSize: 16, fontWeight: "700" },
  filterRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  totalBadgeText: { fontSize: 12, fontWeight: "600" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  clearText: { fontSize: 12, fontWeight: "500" },
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13 },
});

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

  memberRolesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" },

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
