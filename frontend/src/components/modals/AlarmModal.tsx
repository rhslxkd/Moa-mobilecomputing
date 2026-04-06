/**
 * src/components/modals/AlarmModal.tsx
 *
 * 피그마 Home/Alarm 화면 기반
 *
 * 레이아웃:
 *   - 바텀시트 스타일 모달
 *   - 알림 목록 (프로젝트별 grouped)
 *   - 읽음 / 삭제 기능
 *
 * 사용법:
 *   <AlarmModal isOpen={isOpen} onClose={onClose} />
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

export interface AlarmItem {
  id: string;
  type: "todo" | "mention" | "meeting" | "report";
  title: string;
  body: string;
  project: string;
  time: string;
  read: boolean;
}

const MOCK_ALARMS: AlarmItem[] = [
  {
    id: "1",
    type: "meeting",
    title: "회의 시작 알림",
    body: "AI 챗봇 개발 프로젝트 회의가 10분 후 시작됩니다.",
    project: "AI 챗봇 개발",
    time: "10분 전",
    read: false,
  },
  {
    id: "2",
    type: "todo",
    title: "할일 마감 임박",
    body: "로그인 UI 디자인 검토가 오늘까지 마감입니다.",
    project: "모바일 앱 디자인",
    time: "1시간 전",
    read: false,
  },
  {
    id: "3",
    type: "mention",
    title: "채팅에서 멘션됐어요",
    body: "김민준: @박지민 프론트엔드 API 연동 확인 부탁드려요!",
    project: "AI 챗봇 개발",
    time: "2시간 전",
    read: true,
  },
  {
    id: "4",
    type: "report",
    title: "기여도 리포트 업데이트",
    body: "이번 주 기여도 분석 결과가 업데이트됐습니다.",
    project: "AI 챗봇 개발",
    time: "어제",
    read: true,
  },
];

const TYPE_INFO = {
  todo:    { emoji: "✅", color: "#2563EB" },
  mention: { emoji: "💬", color: "#7C3AED" },
  meeting: { emoji: "🎙️", color: "#0D9488" },
  report:  { emoji: "📊", color: "#D97706" },
};

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlarmModal({ isOpen, onClose }: AlarmModalProps) {
  const C = useTheme();

  const unreadCount = MOCK_ALARMS.filter((a) => !a.read).length;

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
        <Pressable
          style={[styles.sheet, { backgroundColor: C.bgCard }]}
        >
          {/* 핸들 */}
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* 헤더 */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: C.text }]}>알림</Text>
              {unreadCount > 0 && (
                <Text style={[styles.unreadCount, { color: C.primary }]}>
                  읽지 않은 알림 {unreadCount}개
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Text style={[styles.closeIcon, { color: C.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 알림 목록 */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {MOCK_ALARMS.map((alarm) => {
              const info = TYPE_INFO[alarm.type];
              return (
                <TouchableOpacity
                  key={alarm.id}
                  activeOpacity={0.75}
                  style={[
                    styles.alarmItem,
                    {
                      backgroundColor: alarm.read ? C.bgCard : C.primaryBg,
                      borderColor: C.border,
                    },
                  ]}
                >
                  {/* 아이콘 */}
                  <View style={[styles.alarmIcon, { backgroundColor: `${info.color}20` }]}>
                    <Text style={styles.alarmEmoji}>{info.emoji}</Text>
                  </View>

                  {/* 내용 */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.alarmTitleRow}>
                      <Text style={[styles.alarmTitle, { color: C.text }]} numberOfLines={1}>
                        {alarm.title}
                      </Text>
                      {!alarm.read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <Text style={[styles.alarmBody, { color: C.textSub }]} numberOfLines={2}>
                      {alarm.body}
                    </Text>
                    <View style={styles.alarmMeta}>
                      <Text style={[styles.alarmProject, { color: C.primary }]}>
                        {alarm.project}
                      </Text>
                      <Text style={[styles.alarmTime, { color: C.textMuted }]}>
                        {alarm.time}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 32 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },

  // 헤더
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700" },
  unreadCount: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 18 },

  // 알림 목록
  listContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  alarmItem: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "flex-start",
  },
  alarmIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alarmEmoji: { fontSize: 18 },
  alarmTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alarmTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  alarmBody: { fontSize: 13, lineHeight: 18 },
  alarmMeta: { flexDirection: "row", gap: 8, alignItems: "center" },
  alarmProject: { fontSize: 12, fontWeight: "500" },
  alarmTime: { fontSize: 12 },
});
