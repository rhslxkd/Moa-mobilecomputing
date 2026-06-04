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

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { NotificationAPI, InvitationAPI } from "@/services/api";

const PRESET_ROLES = ["팀장", "개발자", "디자이너", "기획자", "QA", "데이터 분석"];

export interface AlarmItem {
  id: string;
  type: "todo" | "mention" | "meeting" | "report";
  title: string;
  body: string;
  project: string;
  time: string;
  read: boolean;
}

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
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  // 역할 선택 모달
  const [roleTarget, setRoleTarget] = useState<{ memberId: string; projectName: string } | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const loadAlarms = () => {
    NotificationAPI.list()
      .then((list) => setAlarms(list as AlarmItem[]))
      .catch(() => {});
  };

  useEffect(() => {
    if (!isOpen) return;
    loadAlarms();
  }, [isOpen]);

  // 초대 ID 추출 (id: "invite-{member_id}" 형식)
  const getMemberId = (alarmId: string) => alarmId.replace("invite-", "");

  const handleAcceptInvite = (alarm: AlarmItem) => {
    setRoleTarget({ memberId: getMemberId(alarm.id), projectName: alarm.project });
    setSelectedRoles([]);
  };

  const handleDeclineInvite = (alarm: AlarmItem) => {
    Alert.alert("초대 거절", `'${alarm.project}' 초대를 거절할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "거절", style: "destructive",
        onPress: async () => {
          await InvitationAPI.decline(getMemberId(alarm.id)).catch(() => {});
          loadAlarms();
        },
      },
    ]);
  };

  const handleConfirmRole = async () => {
    if (!roleTarget || selectedRoles.length === 0) {
      Alert.alert("역할 선택", "역할을 최소 1개 선택해주세요.");
      return;
    }
    await InvitationAPI.accept(roleTarget.memberId, selectedRoles).catch(() => {});
    setRoleTarget(null);
    loadAlarms();
    Alert.alert("수락 완료", `'${roleTarget.projectName}' 프로젝트 팀원이 됐어요!`);
  };

  const unreadCount = alarms.filter((a) => !a.read).length;

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
            {alarms.length === 0 && (
              <Text style={{ color: C.textMuted, textAlign: "center", paddingVertical: 32, fontSize: 14 }}>
                새로운 알림이 없어요.
              </Text>
            )}
            {alarms.map((alarm) => {
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
                    {/* 프로젝트 초대 수락/거절 버튼 */}
                    {alarm.id.startsWith("invite-") && (
                      <View style={styles.inviteButtons}>
                        <TouchableOpacity
                          onPress={() => handleAcceptInvite(alarm)}
                          style={[styles.inviteBtn, { backgroundColor: C.primary }]}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.inviteBtnText}>수락</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeclineInvite(alarm)}
                          style={[styles.inviteBtn, { borderWidth: 1, borderColor: C.border }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.inviteBtnText, { color: C.textMuted }]}>거절</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* 역할 선택 모달 */}
      <Modal visible={!!roleTarget} transparent animationType="fade" onRequestClose={() => setRoleTarget(null)}>
        <Pressable style={styles.roleBackdrop} onPress={() => setRoleTarget(null)}>
          <Pressable style={[styles.roleSheet, { backgroundColor: C.bgCard }]}>
            <Text style={[styles.roleTitle, { color: C.text }]}>역할을 선택해주세요</Text>
            <Text style={[styles.roleSub, { color: C.textMuted }]}>{roleTarget?.projectName}</Text>
            <View style={styles.roleChips}>
              {PRESET_ROLES.map((role) => {
                const active = selectedRoles.includes(role);
                return (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setSelectedRoles(prev =>
                      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                    )}
                    style={[styles.roleChip, active
                      ? { backgroundColor: C.primary, borderColor: C.primary }
                      : { borderColor: C.border }
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleChipText, { color: active ? "#fff" : C.text }]}>{role}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={handleConfirmRole}
              style={[styles.roleConfirmBtn, { backgroundColor: selectedRoles.length ? C.primary : C.border }]}
              activeOpacity={0.85}
            >
              <Text style={styles.roleConfirmText}>
                {selectedRoles.length ? `${selectedRoles.join(", ")}으로 수락` : "역할을 선택하세요"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

  // 초대 버튼
  inviteButtons: { flexDirection: "row", gap: 8, marginTop: 6 },
  inviteBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  inviteBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // 역할 선택 모달
  roleBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 28 },
  roleSheet: { width: "100%", borderRadius: 20, padding: 24, gap: 12 },
  roleTitle: { fontSize: 17, fontWeight: "700" },
  roleSub: { fontSize: 13 },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  roleChipText: { fontSize: 14, fontWeight: "600" },
  roleConfirmBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  roleConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
