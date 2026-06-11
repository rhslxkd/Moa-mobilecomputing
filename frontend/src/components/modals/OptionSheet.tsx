/**
 * src/components/modals/OptionSheet.tsx
 *
 * 피그마 Meeting/Option, Report/Option, More/Option, Chat/Room/Archive&Option 기반
 *
 * 범용 옵션 바텀시트 모달
 *
 * 사용법:
 *   <OptionSheet
 *     isOpen={isOpen}
 *     onClose={onClose}
 *     title="회의 옵션"
 *     options={[
 *       { label: "회의록 수정", onPress: () => {} },
 *       { label: "회의 삭제", onPress: () => {}, isDestructive: true },
 *     ]}
 *   />
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

export interface OptionItem {
  label: string;
  emoji?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

interface OptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options: OptionItem[];
}

export default function OptionSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
}: OptionSheetProps) {
  const C = useTheme();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: C.bgOverlay }]}
        onPress={onClose}
      >
        <Pressable style={[styles.sheet, { backgroundColor: C.bgCard }]}>
          {/* 핸들 */}
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* 타이틀 */}
          {(title || subtitle) && (
            <View style={styles.titleArea}>
              {title && (
                <Text style={[styles.title, { color: C.text }]}>{title}</Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, { color: C.textMuted }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}

          {/* 옵션 목록 */}
          <View style={[styles.optionList, { borderColor: C.border }]}>
            {options.map((opt, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => { opt.onPress(); onClose(); }}
                activeOpacity={0.7}
                style={[
                  styles.optionItem,
                  {
                    borderBottomColor: C.border,
                    borderBottomWidth: index < options.length - 1 ? 1 : 0,
                  },
                ]}
              >
                {opt.emoji && (
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                )}
                <Text
                  style={[
                    styles.optionLabel,
                    { color: opt.isDestructive ? C.danger : C.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 취소 */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={[styles.cancelBtn, { backgroundColor: C.bgMuted }]}
          >
            <Text style={[styles.cancelLabel, { color: C.textSub }]}>취소</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── 사전 정의 옵션 세트 ────────────────────

/** Meeting/Option */
export const MEETING_OPTIONS = (
  onView: () => void,
  onDelete: () => void,
  onShare?: () => void,
): OptionItem[] => [
  { label: "회의록 보기",  emoji: "📄", onPress: onView },
  { label: "공유하기",    emoji: "🔗", onPress: onShare ?? (() => {}) },
  { label: "회의 삭제",   emoji: "🗑️", onPress: onDelete, isDestructive: true },
];

/** Report/Option */
export const REPORT_OPTIONS = (onShare: () => void, onDelete: () => void): OptionItem[] => [
  { label: "리포트 공유",  emoji: "🔗", onPress: onShare },
  { label: "PDF 내보내기", emoji: "📎", onPress: () => {} },
  { label: "리포트 삭제",  emoji: "🗑️", onPress: onDelete, isDestructive: true },
];

/** More/Option (설정) */
export const MORE_OPTIONS = (onEdit: () => void, onLogout: () => void): OptionItem[] => [
  { label: "프로필 수정",  emoji: "✏️", onPress: onEdit },
  { label: "알림 설정",   emoji: "🔔", onPress: () => {} },
  { label: "공지사항",    emoji: "📢", onPress: () => {} },
  { label: "로그아웃",    emoji: "🚪", onPress: onLogout, isDestructive: true },
];

/** Chat/Room/Archive&Option */
export const CHAT_ARCHIVE_OPTIONS = (onArchive: () => void, onLeave: () => void): OptionItem[] => [
  { label: "사진",        emoji: "🖼️", onPress: () => {} },
  { label: "폴더",        emoji: "📁", onPress: () => {} },
  { label: "링크",        emoji: "🔗", onPress: () => {} },
  { label: "채팅방 보관",  emoji: "📦", onPress: onArchive },
  { label: "채팅방 나가기", emoji: "🚪", onPress: onLeave, isDestructive: true },
];

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },

  // 타이틀
  titleArea: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 4 },

  // 옵션 목록
  optionList: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionEmoji: { fontSize: 18 },
  optionLabel: { fontSize: 16, fontWeight: "500" },

  // 취소 버튼
  cancelBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelLabel: { fontSize: 16, fontWeight: "600" },
});
