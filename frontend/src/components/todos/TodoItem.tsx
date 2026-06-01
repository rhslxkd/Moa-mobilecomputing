/**
 * src/components/todos/TodoItem.tsx
 *
 * 피그마 Button/Todo 기반 할일 아이템 컴포넌트
 *
 * 기능:
 *   - 체크박스 토글 (완료/미완료)
 *   - 프로젝트 태그
 *   - 마감일 표시 (D-3 이하일 때 빨간색 강조 — 피그마 주석 참고)
 *
 * 사용법:
 *   <TodoItem
 *     todo={todo}
 *     onToggle={(id) => toggleTodo(id)}
 *   />
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export interface Todo {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  dueDate: string;    // "YYYY-MM-DD"
  daysLeft: number;   // 음수면 기한 초과
  done: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
}

export default function TodoItem({ todo, onToggle }: TodoItemProps) {
  const C = useTheme();

  // 마감 임박: D-3 이하 (피그마 주석: "ToDo 마감일 임박 시 표시")
  const isUrgent = !todo.done && todo.daysLeft <= 3;
  const isOverdue = !todo.done && todo.daysLeft < 0;

  const tagColor = todo.projectColor || C.primary;
  const tagBg    = todo.projectColor ? todo.projectColor + "20" : C.primaryBg;

  const dueDateLabel = isOverdue
    ? `D+${Math.abs(todo.daysLeft)}`
    : todo.daysLeft === 0
    ? "오늘 마감"
    : `D-${todo.daysLeft}`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: C.bgCard,
          borderColor: isUrgent ? C.danger + "40" : C.border,
        },
      ]}
    >
      {/* 체크박스 */}
      <TouchableOpacity
        onPress={() => onToggle(todo.id)}
        activeOpacity={0.7}
        style={[
          styles.checkbox,
          {
            borderColor: todo.done ? C.primary : C.border,
            backgroundColor: todo.done ? C.primary : "transparent",
          },
        ]}
      >
        {todo.done && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* 내용 */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: todo.done ? C.textMuted : C.text,
              textDecorationLine: todo.done ? "line-through" : "none",
            },
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>

        <View style={styles.metaRow}>
          {/* 프로젝트 태그 */}
          <View style={[styles.projectTag, { backgroundColor: tagBg }]}>
            <Text style={[styles.projectTagText, { color: tagColor }]}>
              {todo.projectName}
            </Text>
          </View>

          {/* 마감일 */}
          {!todo.done && (
            <View
              style={[
                styles.dueBadge,
                {
                  backgroundColor: isUrgent ? C.dangerBg : C.bgMuted,
                },
              ]}
            >
              <Text
                style={[
                  styles.dueText,
                  { color: isUrgent ? C.danger : C.textMuted },
                  isUrgent && { fontWeight: "700" },
                ]}
              >
                {dueDateLabel}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  projectTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  projectTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
