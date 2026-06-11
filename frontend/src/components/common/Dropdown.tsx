/**
 * src/components/common/Dropdown.tsx
 *
 * 피그마 Dropdown_Primary / Dropdown_Secondary 기반
 *
 * variant:
 *   - "primary"   : 전체 너비, 옵션 목록이 아래 펼쳐짐
 *   - "secondary" : 전체 너비, 연한 배경 스타일
 *
 * 사용법:
 *   const [val, setVal] = useState("");
 *
 *   <Dropdown
 *     options={[
 *       { label: "학생(학교/대학원)", value: "student" },
 *       { label: "직장인(기업/공공기관/전문직)", value: "worker" },
 *       { label: "연구원(연구소/LAB)", value: "researcher" },
 *       { label: "기타(동아리/개인 등)", value: "other" },
 *     ]}
 *     value={val}
 *     onChange={setVal}
 *     placeholder="소속을 선택해주세요."
 *   />
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "선택해주세요.",
  label,
  variant = "primary",
  disabled = false,
  containerStyle,
}: DropdownProps) {
  const C = useTheme();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const isSecondary = variant === "secondary";

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: C.textSub }]}>{label}</Text>
      )}

      {/* 트리거 버튼 */}
      <TouchableOpacity
        onPress={() => !disabled && setOpen((prev) => !prev)}
        activeOpacity={0.8}
        style={[
          styles.trigger,
          {
            borderColor: open ? C.primary : C.border,
            backgroundColor: isSecondary ? C.bgMuted : C.bgCard,
          },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedLabel ? C.text : C.textMuted },
          ]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>

        {/* 화살표 */}
        <View
          style={[
            styles.chevron,
            open && styles.chevronUp,
          ]}
        >
          <Text style={{ color: C.textMuted, fontSize: 10 }}>▼</Text>
        </View>
      </TouchableOpacity>

      {/* 옵션 목록 */}
      {open && (
        <View
          style={[
            styles.list,
            {
              borderColor: C.border,
              backgroundColor: C.bgCard,
              shadowColor: C.text,
            },
          ]}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isLast = index === options.length - 1;

            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                activeOpacity={0.7}
                style={[
                  styles.option,
                  !isLast && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  },
                  isSelected && { backgroundColor: C.primaryBg },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? C.primary : C.text },
                    isSelected && { fontWeight: "600" },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    zIndex: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerText: {
    fontSize: 15,
    fontWeight: "400",
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
    transform: [{ rotate: "0deg" }],
  },
  chevronUp: {
    transform: [{ rotate: "180deg" }],
  },
  list: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "400",
  },
});
