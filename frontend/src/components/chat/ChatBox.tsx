/**
 * src/components/chat/ChatBox.tsx
 *
 * 피그마 ChatBox 기반 말풍선 컴포넌트
 *
 * variant:
 *   - "mine"   : 오른쪽 정렬, 파란 그라데이션 배경
 *   - "theirs" : 왼쪽 정렬, 회색 배경, 발신자 이름 + 아바타
 *
 * 사용법:
 *   <ChatBox
 *     variant="mine"
 *     message="안녕하세요!"
 *     time="오후 3:06"
 *   />
 *   <ChatBox
 *     variant="theirs"
 *     message="안녕하세요!"
 *     time="오후 3:06"
 *     senderName="이지은"
 *     senderInitial="이"
 *   />
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

interface ChatBoxProps {
  variant: "mine" | "theirs";
  message: string;
  time: string;
  senderName?: string;    // theirs일 때 발신자 이름
  senderInitial?: string; // theirs일 때 아바타 이니셜
  readCount?: number;     // 안읽은 인원수 (카톡 스타일 '1')
}

export default function ChatBox({
  variant,
  message,
  time,
  senderName,
  senderInitial,
  readCount,
}: ChatBoxProps) {
  const C = useTheme();
  const isMine = variant === "mine";

  if (isMine) {
    return (
      <View style={[styles.row, styles.rowRight]}>
        <View style={styles.metaRight}>
          {readCount !== undefined && readCount > 0 && (
            <Text style={[styles.readStatus, { color: C.primary }]}>{readCount}</Text>
          )}
          <Text style={[styles.time, { color: C.textMuted }]}>{time}</Text>
        </View>
        <View style={[styles.bubble, styles.bubbleMine, { backgroundColor: '#00A9EC' }]}>
          <Text style={styles.messageMine}>{message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowLeft]}>
      {/* 아바타 */}
      <View style={[styles.avatar, { backgroundColor: '#00A9EC' }]}>
        <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
          {senderInitial ?? "?"}
        </Text>
      </View>

      <View style={styles.colLeft}>
        {senderName && (
          <Text style={[styles.senderName, { color: C.textSub }]}>
            {senderName}
          </Text>
        )}
        <View style={styles.rowWrapper}>
          <View style={[styles.bubble, styles.bubbleTheirs, { backgroundColor: '#F2F2F2' }]}>
            <Text style={[styles.messageTheirs, { color: C.text }]}>
              {message}
            </Text>
          </View>
          <View style={styles.metaLeft}>
            {readCount !== undefined && readCount > 0 && (
              <Text style={[styles.readStatus, { color: C.primary }]}>{readCount}</Text>
            )}
            <Text style={[styles.time, { color: C.textMuted }]}>{time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  rowLeft: {
    justifyContent: "flex-start",
    gap: 8,
  },
  rowWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  colLeft: {
    flex: 1,
    gap: 4,
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    borderTopRightRadius: 2,
  },
  bubbleTheirs: {
    borderTopLeftRadius: 2,
  },
  messageMine: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
  messageTheirs: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
  },
  metaRight: {
    alignItems: "flex-end",
    marginRight: 6,
    marginBottom: 0,
  },
  metaLeft: {
    alignItems: "flex-start",
    marginLeft: 6,
    marginBottom: 0,
  },
  readStatus: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 1,
  },
  time: {
    fontSize: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 0,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
