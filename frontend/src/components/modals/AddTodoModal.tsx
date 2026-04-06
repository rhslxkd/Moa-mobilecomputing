/**
 * src/components/modals/AddTodoModal.tsx
 *
 * 할일 추가 바텀시트 모달
 * - 할일 제목 입력 (InputBox)
 * - 프로젝트 선택 (Dropdown)
 * - 마감일 선택 (CalendarPicker)
 * - 추가 버튼 (Button)
 *
 * 사용법:
 *   <AddTodoModal
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     onAdd={(todo) => addTodo(todo)}
 *   />
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import InputBox from "@/components/common/InputBox";
import Dropdown from "@/components/common/Dropdown";
import CalendarPicker from "@/components/common/CalendarPicker";
import Button from "@/components/common/Button";
import { type Todo } from "@/components/todos/TodoItem";

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (todo: Omit<Todo, "id">) => void;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calcDaysLeft(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AddTodoModal({ isOpen, onClose, onAdd }: AddTodoModalProps) {
  const C = useTheme();
  const { projects } = useProject();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [titleError, setTitleError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  const projectOptions = projects.map((p) => ({
    label: `${p.emoji} ${p.name}`,
    value: p.id,
  }));

  const selectedProject = projects.find((p) => p.id === projectId);

  const handleClose = () => {
    setTitle("");
    setProjectId(projects[0]?.id ?? "");
    setDueDate(null);
    setTitleError("");
    setShowCalendar(false);
    onClose();
  };

  const handleAdd = () => {
    if (!title.trim()) {
      setTitleError("할일 제목을 입력해주세요.");
      return;
    }
    if (!selectedProject) return;

    const dueDateStr = dueDate ? toDateKey(dueDate) : toDateKey(new Date());
    const daysLeft = calcDaysLeft(dueDateStr);

    onAdd({
      title: title.trim(),
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      projectColor: selectedProject.color,
      dueDate: dueDateStr,
      daysLeft,
      done: false,
    });

    handleClose();
  };

  const dueDateLabel = dueDate
    ? `${dueDate.getFullYear()}년 ${dueDate.getMonth() + 1}월 ${dueDate.getDate()}일`
    : "마감일 선택";

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: C.bgOverlay }]}
        onPress={handleClose}
      />

      <View style={[styles.sheet, { backgroundColor: C.bgCard }]}>
        {/* 핸들 */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: C.border }]} />
        </View>

        {/* 타이틀 */}
        <View style={styles.titleWrap}>
          <Text style={[styles.sheetTitle, { color: C.text }]}>할일 추가</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* 제목 입력 */}
          <InputBox
            label="할일 제목"
            placeholder="할 일을 입력해주세요."
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (t.trim()) setTitleError("");
            }}
            error={titleError}
          />

          {/* 프로젝트 선택 */}
          <View style={{ zIndex: 10 }}>
            <Dropdown
              label="프로젝트"
              options={projectOptions}
              value={projectId}
              onChange={setProjectId}
              placeholder="프로젝트를 선택해주세요."
            />
          </View>

          {/* 마감일 선택 */}
          <View>
            <Text style={[styles.label, { color: C.textSub }]}>마감일</Text>
            <TouchableOpacity
              onPress={() => setShowCalendar((v) => !v)}
              activeOpacity={0.8}
              style={[
                styles.dateTrigger,
                {
                  borderColor: showCalendar ? C.primary : C.border,
                  backgroundColor: C.bgCard,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateTriggerText,
                  { color: dueDate ? C.text : C.textMuted },
                ]}
              >
                📅 {dueDateLabel}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 10 }}>
                {showCalendar ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showCalendar && (
              <CalendarPicker
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date);
                  setShowCalendar(false);
                }}
                minDate={new Date()}
                containerStyle={{ marginTop: 8 }}
              />
            )}
          </View>

          {/* 추가 버튼 */}
          <Button label="할일 추가" onPress={handleAdd} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 40,
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateTriggerText: {
    fontSize: 15,
  },
});
