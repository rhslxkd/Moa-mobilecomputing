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
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

interface ChatBoxProps {
  variant: "mine" | "theirs";
  message: string;
  time: string;
  senderName?: string;
  senderInitial?: string;
  readCount?: number;
  attachmentType?: "image" | "file" | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  onAttachmentPress?: () => void;
}

export default function ChatBox({
  variant,
  message,
  time,
  senderName,
  senderInitial,
  readCount,
  attachmentType,
  attachmentUrl,
  attachmentName,
  onAttachmentPress,
}: ChatBoxProps) {
  const C = useTheme();
  const isMine = variant === "mine";
  const hasAttachment = !!attachmentType;

  // 첨부 렌더 (이미지 / 파일)
  const renderAttachment = () => {
    if (attachmentType === "image" && attachmentUrl) {
      return (
        <TouchableOpacity activeOpacity={0.85} onPress={onAttachmentPress}>
          <Image source={{ uri: attachmentUrl }} style={styles.attachImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    // 파일 카드
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onAttachmentPress}
        style={[styles.fileCard, { backgroundColor: isMine ? "rgba(255,255,255,0.2)" : "#FFFFFF", borderColor: isMine ? "rgba(255,255,255,0.3)" : C.border }]}
      >
        <View style={styles.fileIconBox}>
          <Text style={{ fontSize: 20 }}>📄</Text>
        </View>
        <Text style={[styles.fileName, { color: isMine ? "#FFFFFF" : C.text }]} numberOfLines={1}>
          {attachmentName ?? "파일"}
        </Text>
      </TouchableOpacity>
    );
  };

  // 버블 내용 (첨부 or 텍스트)
  const bubbleContent = (mine: boolean) => {
    if (hasAttachment) {
      // 이미지는 패딩 없이, 파일은 카드
      if (attachmentType === "image") return renderAttachment();
      return renderAttachment();
    }
    return (
      <Text style={mine ? styles.messageMine : [styles.messageTheirs, { color: C.text }]}>
        {message}
      </Text>
    );
  };

  const imageNoBubble = hasAttachment && attachmentType === "image";

  if (isMine) {
    return (
      <View style={[styles.row, styles.rowRight]}>
        <View style={styles.metaRight}>
          {readCount !== undefined && readCount > 0 && (
            <Text style={[styles.readStatus, { color: C.primary }]}>{readCount}</Text>
          )}
          <Text style={[styles.time, { color: C.textMuted }]}>{time}</Text>
        </View>
        {imageNoBubble ? (
          renderAttachment()
        ) : (
          <View style={[styles.bubble, styles.bubbleMine, { backgroundColor: '#00A9EC' }]}>
            {bubbleContent(true)}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowLeft]}>
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
          {imageNoBubble ? (
            renderAttachment()
          ) : (
            <View style={[styles.bubble, styles.bubbleTheirs, { backgroundColor: '#F2F2F2' }]}>
              {bubbleContent(false)}
            </View>
          )}
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

  // 첨부 파일/이미지
  attachImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
    backgroundColor: "#E5E5E5",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 220,
  },
  fileIconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { flex: 1, fontSize: 14, fontWeight: "500" },
});
