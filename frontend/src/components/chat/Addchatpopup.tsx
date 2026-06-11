/**
 * src/components/chat/AddChatPopup.tsx
 *
 * 새로운 채팅 생성 모달
 * - 개인 채팅 / 팀 채팅 탭 전환
 * - 배경: rgba(17, 17, 17, 0.40) 딤
 *
 * 사용법:
 *   <AddChatPopup isOpen={isOpen} onClose={() => setIsOpen(false)} />
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

const { width, height } = Dimensions.get("window");

// ── 타입 ──────────────────────────────────
interface AddChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "personal" | "team";

// ── 메인 컴포넌트 ──────────────────────────
export default function AddChatPopup({ isOpen, onClose }: AddChatPopupProps) {
  const C = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("team");

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 배경 딤 — rgba(17, 17, 17, 0.40) */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 팝업 카드 */}
        <Pressable style={[styles.card, { backgroundColor: C.bgCard }]}>

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={[styles.plus, { color: C.primary }]}>+</Text>
            <Text style={[styles.title, { color: C.text }]}>새로운 채팅</Text>
          </View>

          {/* 탭 */}
          <View style={[styles.tabRow, { backgroundColor: C.bgMuted, borderColor: C.border }]}>
            {/* 개인 채팅 탭 */}
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "personal" && { backgroundColor: C.primary },
              ]}
              onPress={() => setActiveTab("personal")}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === "personal" ? "#FFFFFF" : C.textMuted },
              ]}>
                개인 채팅
              </Text>
            </TouchableOpacity>

            {/* 팀 채팅 탭 */}
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "team" && { backgroundColor: C.primary },
              ]}
              onPress={() => setActiveTab("team")}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === "team" ? "#FFFFFF" : C.textMuted },
              ]}>
                팀 채팅
              </Text>
            </TouchableOpacity>
          </View>

          {/* 콘텐츠 영역 — 추후 채팅 목록 추가 */}
          <View style={styles.content}>
            {/* TODO: 개인/팀 채팅 상대 목록 */}
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── 스타일 ────────────────────────────────
const CARD_H = height - 207 - 208; // 피그마 패딩 기준

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 17, 17, 0.40)",
    paddingHorizontal: 33,
    paddingTop: 207,
    paddingBottom: 208,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    minHeight: CARD_H,
  },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  plus: {
    fontSize: 22,
    fontWeight: "400",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },

  // 탭
  tabRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
  },

  // 콘텐츠
  content: {
    flex: 1,
    minHeight: 200,
  },
});