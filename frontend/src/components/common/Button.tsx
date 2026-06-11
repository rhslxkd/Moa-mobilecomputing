/**
 * src/components/common/Button.tsx
 *
 * 피그마 Button/Primary 기반
 *
 * 상태:
 *   - default  : Linear gradient #00A9EC → #0084FF (좌상→우하)
 *   - pressed  : 동일 그라데이션 + opacity 0.75
 *   - disabled : #999999
 *
 * 사이즈:
 *   - small : width 152px
 *   - full  : width 100%
 *
 * 사용법:
 *   <Button label="회의 시작" onPress={() => {}} />
 *   <Button label="회의 시작" size="small" onPress={() => {}} />
 *   <Button label="회의 시작" disabled onPress={() => {}} />
 */

import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ButtonProps {
  label: string;
  onPress: () => void;
  size?: "small" | "full";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  label,
  onPress,
  size = "full",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
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
        size === "small" ? styles.small : styles.full,
        style,
      ]}
    >
      {isDisabled ? (
        // disabled — 단색 회색
        <LinearGradient
          colors={["#999999", "#999999"]}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </LinearGradient>
      ) : (
        // default / pressed — 그라데이션
        <LinearGradient
          colors={["#00A9EC", "#0084FF"]}
          start={{ x: 0.09, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  small: {
    width: 152,
    borderRadius: 100,
    overflow: "hidden",
  },
  full: {
    width: "100%",
    borderRadius: 100,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 100,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});