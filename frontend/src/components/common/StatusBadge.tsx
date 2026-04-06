/**
 * src/components/common/StatusBadge.tsx
 *
 * 피그마 Status 컴포넌트 기반
 *
 * 사용법:
 *   <StatusBadge status="진행중" />
 *   <StatusBadge status="예정" />
 *   <StatusBadge status="완료" />
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Status = "진행중" | "예정" | "완료";

interface StatusBadgeProps {
  status: Status;
}

const STATUS_STYLES: Record<Status, { border: string; bg: string; text: string }> = {
  진행중: {
    border: "#2F80ED",
    bg: "rgba(47, 128, 237, 0.10)",
    text: "#2F80ED",
  },
  예정: {
    border: "#999999",
    bg: "rgba(119, 119, 119, 0.10)",
    text: "#999999",
  },
  완료: {
    border: "#27AE60",
    bg: "rgba(34, 255, 136, 0.10)",
    text: "#27AE60",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const s = STATUS_STYLES[status];

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: s.border,
          backgroundColor: s.bg,
        },
      ]}
    >
      <Text style={[styles.text, { color: s.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 9999,
    borderWidth: 0.5,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});