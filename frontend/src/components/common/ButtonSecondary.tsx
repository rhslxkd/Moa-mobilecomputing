/**
 * src/components/common/ButtonSecondary.tsx
 *
 * 피그마 Button/Secondary 기반
 *
 * 상태:
 *   - default  : 배경 투명, 테두리 #EEE
 *   - pressed  : 배경 rgba(0,0,0,0.10), 테두리 #EEE
 *   - disabled : 배경 #999, 테두리 없음
 *
 * 사이즈:
 *   - small : width 152px
 *   - full  : width 100%
 *
 * 사용법:
 *   <ButtonSecondary label="회의 시작" onPress={() => {}} />
 *   <ButtonSecondary label="회의 시작" size="full" onPress={() => {}} />
 *   <ButtonSecondary label="회의 시작" disabled onPress={() => {}} />
 */

import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";

interface ButtonSecondaryProps {
  label: string;
  onPress: () => void;
  size?: "small" | "full";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function ButtonSecondary({
  label,
  onPress,
  size = "small",
  disabled = false,
  loading = false,
  style,
}: ButtonSecondaryProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={1}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.base,
        size === "small" ? styles.small : styles.full,
        isDisabled
          ? styles.disabled
          : pressed
          ? styles.pressed
          : styles.default,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#555" size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: isDisabled ? "#FFFFFF" : "#555555" },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  small: {
    width: 152,
  },
  full: {
    width: "100%",
  },
  default: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  pressed: {
    backgroundColor: "rgba(0, 0, 0, 0.10)",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  disabled: {
    backgroundColor: "#999999",
    borderWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});