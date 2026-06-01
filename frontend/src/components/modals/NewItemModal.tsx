/**
 * src/components/modals/NewItemModal.tsx
 *
 * + 버튼을 눌렀을 때 올라오는 바텀시트
 * 회의 시작 / 프로젝트 추가 / 투두 추가 / 파일 업로드
 *
 * 사용법:
 * <NewItemModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../hooks/useTheme";
import { useProject, type Project } from "../../contexts/ProjectContext";

// ── 타입 ──────────────────────────────────
interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
}

type ExpandedAction = "meeting" | null;

// ── 메인 컴포넌트 ──────────────────────────
export default function NewItemModal({ isOpen, onClose, onOpenCreate }: NewItemModalProps) {
  const C = useTheme();
  const router = useRouter();
  const { projects, setCurrentProject } = useProject();
  const [expanded, setExpanded] = useState<ExpandedAction>(null);
  const [selectedId, setSelectedId] = useState<string>(projects[0]?.id ?? "");

  const selectedProject = projects.find((p) => p.id === selectedId);

  const handleClose = () => {
    setExpanded(null);
    onClose();
  };

  const handleStartMeeting = () => {
    if (selectedProject) {
      setCurrentProject(selectedProject);
      handleClose();
      router.push("/(screens)/meeting");
    }
  };

  const handleTodo = () => {
    handleClose();
    router.push("/(tabs)/todos");
  };

  const handleDrive = () => {
    handleClose();
    router.push("/(screens)/drive" as any);
  };

  const s = makeStyles(C);

  // ── 액션 목록 ─────────────────────────
  const ACTIONS = [
    {
      id: "project",
      emoji: "📋",
      label: "프로젝트 추가",
      sub: "새 팀 프로젝트 만들기",
      onPress: () => { handleClose(); onOpenCreate(); },
    },
    {
      id: "todo",
      emoji: "✅",
      label: "투두 추가",
      sub: "프로젝트 선택 후 할 일 등록",
      onPress: handleTodo,
    },
    {
      id: "file",
      emoji: "📁",
      label: "파일 업로드",
      sub: "프로젝트 파일함에 바로 추가",
      onPress: handleDrive,
    },
  ];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* 바텀 시트를 아래로 밀어내기 위한 래퍼 추가 */}
      <View style={s.modalWrapper}>

        {/* 배경 딤 (절대 위치로 화면 전체를 덮도록 수정) */}
        <Pressable style={[s.backdrop, { backgroundColor: C.bgOverlay }]} onPress={handleClose} />

        {/* 바텀 시트 */}
        <View style={[s.sheet, { backgroundColor: C.bgCard }]}>
          {/* 핸들 */}
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: C.border }]} />
          </View>

          {/* 타이틀 */}
          <View style={s.titleWrap}>
            <Text style={[s.title, { color: C.text }]}>무엇을 추가할까요?</Text>
            <Text style={[s.titleSub, { color: C.textMuted }]}>
              프로젝트 또는 액션을 선택하세요
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* ── 회의 시작 (강조) ── */}
            <View>
              <TouchableOpacity
                style={[
                  s.actionRow,
                  { backgroundColor: C.bgMuted, borderColor: C.border },
                  expanded === "meeting" && {
                    backgroundColor: C.primaryBg,
                    borderColor: C.primary + "60",
                  },
                ]}
                onPress={() =>
                  setExpanded((prev) => (prev === "meeting" ? null : "meeting"))
                }
                activeOpacity={0.7}
              >
                <Text style={s.actionEmoji}>🎙</Text>
                <View style={s.actionInfo}>
                  <Text style={[
                    s.actionLabel,
                    { color: expanded === "meeting" ? C.primary : C.text },
                  ]}>
                    회의 시작
                  </Text>
                  <Text style={[s.actionSub, { color: C.textMuted }]}>
                    어느 프로젝트의 회의인지 선택
                  </Text>
                </View>
                <Text style={[
                  s.chevron,
                  { color: expanded === "meeting" ? C.primary : C.textMuted },
                  expanded === "meeting" && s.chevronDown,
                ]}>
                  ›
                </Text>
              </TouchableOpacity>

              {/* 프로젝트 선택 피커 */}
              {expanded === "meeting" && (
                <View style={[s.picker, { backgroundColor: C.bgMuted, borderColor: C.border }]}>
                  <Text style={[s.pickerLabel, { color: C.textMuted }]}>
                    어느 프로젝트?
                  </Text>
                  {projects.map((project) => (
                    <ProjectOption
                      key={project.id}
                      project={project}
                      isSelected={selectedId === project.id}
                      onSelect={() => setSelectedId(project.id)}
                      C={C}
                    />
                  ))}
                  {/* 확인 버튼 */}
                  <TouchableOpacity
                    style={[s.confirmBtn, { backgroundColor: C.primary }]}
                    onPress={handleStartMeeting}
                    activeOpacity={0.85}
                  >
                    <Text style={s.confirmText}>
                      🎙 {selectedProject?.name} 회의 시작
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── 나머지 액션들 ── */}
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[s.actionRow, { backgroundColor: C.bgMuted, borderColor: C.border }]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Text style={s.actionEmoji}>{action.emoji}</Text>
                <View style={s.actionInfo}>
                  <Text style={[s.actionLabel, { color: C.text }]}>
                    {action.label}
                  </Text>
                  <Text style={[s.actionSub, { color: C.textMuted }]}>
                    {action.sub}
                  </Text>
                </View>
                <Text style={[s.chevron, { color: C.textMuted }]}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── 프로젝트 선택 옵션 ─────────────────────
interface ProjectOptionProps {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  C: ReturnType<typeof useTheme>;
}

function ProjectOption({ project, isSelected, onSelect, C }: ProjectOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.projOption,
        {
          backgroundColor: C.bgCard,
          borderColor: isSelected ? C.primary : C.border,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[
        styles.projEmoji,
        { backgroundColor: project.color + "20" },
      ]}>
        <Text style={{ fontSize: 16 }}>{project.emoji}</Text>
      </View>
      <Text style={[styles.projName, { color: C.text }]}>
        {project.name}
      </Text>
      {/* 라디오 */}
      <View style={[
        styles.radio,
        { borderColor: isSelected ? C.primary : C.border },
        isSelected && { backgroundColor: C.primary },
      ]}>
        {isSelected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

// ── 스타일 ────────────────────────────────
function makeStyles(C: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    modalWrapper: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject, // 둥근 모서리 뒤 빈틈까지 완전히 덮어줍니다.
    },
    sheet: {
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      paddingBottom: 40,
      maxHeight: "85%",
      // 위쪽 방향으로 퍼지는 그림자 추가
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 15,
    },
    handleWrap: {
      alignItems: "center",
      paddingTop: 12,
      paddingBottom: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
    },
    titleWrap: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
    },
    titleSub: {
      fontSize: 13,
      marginTop: 3,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 10,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
    },
    actionEmoji: {
      fontSize: 24,
      flexShrink: 0,
    },
    actionInfo: {
      flex: 1,
    },
    actionLabel: {
      fontSize: 15,
      fontWeight: "600",
    },
    actionSub: {
      fontSize: 12,
      marginTop: 2,
    },
    chevron: {
      fontSize: 20,
      fontWeight: "300",
    },
    chevronDown: {
      transform: [{ rotate: "90deg" }],
    },
    picker: {
      marginTop: 8,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      gap: 8,
    },
    pickerLabel: {
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    confirmBtn: {
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      marginTop: 8,
    },
    confirmText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
  });
}

const styles = StyleSheet.create({
  projOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  projEmoji: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  projName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
});