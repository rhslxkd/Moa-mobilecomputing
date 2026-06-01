/**
 * src/components/common/InputBox.tsx
 *
 * 피그마 InputBox 기반
 *
 * 상태:
 *   - default  : 테두리 border (#E2E8F0)
 *   - focused  : 테두리 primary (#2563EB)
 *   - error    : 테두리 danger (#DC2626) + 에러 메시지
 *   - disabled : 배경 bgMuted, 텍스트 textMuted
 *
 * 사용법:
 *   <InputBox placeholder="소속명을 입력해주세요." />
 *   <InputBox label="소속" placeholder="소속명을 입력해주세요." />
 *   <InputBox placeholder="..." error="필수 항목입니다." />
 *   <InputBox placeholder="..." disabled />
 */

import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface InputBoxProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export default function InputBox({
  label,
  error,
  disabled = false,
  containerStyle,
  ...inputProps
}: InputBoxProps) {
  const C = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? C.danger
    : focused
      ? C.primary
      : C.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: C.textSub }]}>{label}</Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: disabled ? C.bgMuted : C.bgCard,
          },
        ]}
      >
        <TextInput
          editable={!disabled}
          placeholderTextColor={C.textMuted}
          underlineColorAndroid="transparent"
          style={[
            styles.input,
            { color: disabled ? C.textMuted : C.text },
          ]}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
      </View>

      {error && (
        <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    minHeight: 24,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "400",
  },
});
