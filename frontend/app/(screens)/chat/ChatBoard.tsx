/**
 * app/(screens)/chat/ChatBoard.tsx
 * 공지 / 투표 목록 화면
 */

import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { ChatAPI, NoticeDTO, PollDTO } from "@/services/api";
import { NoticeModal, PollModal } from "@/components/chat/ChatComposers";

type BoardTab = "notice" | "poll";

export default function ChatBoardScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projectId, initialTab } = useLocalSearchParams<{ projectId: string; initialTab: BoardTab }>();
  const [activeTab, setActiveTab] = useState<BoardTab>(initialTab ?? "notice");

  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [polls, setPolls] = useState<PollDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);

  const load = useCallback(() => {
    if (!projectId) return;
    setIsLoading(true);
    Promise.all([
      ChatAPI.listNotices(projectId).catch(() => [] as NoticeDTO[]),
      ChatAPI.listPolls(projectId).catch(() => [] as PollDTO[]),
    ]).then(([n, p]) => {
      setNotices(n);
      setPolls(p);
    }).finally(() => setIsLoading(false));
  }, [projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleVote = async (pollId: string, optionIdx: number) => {
    await ChatAPI.votePoll(pollId, optionIdx).catch(() => {});
    load();
  };

  const handleDeleteNotice = (id: string) => {
    Alert.alert("공지 삭제", "이 공지를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        await ChatAPI.deleteNotice(id).catch(() => {});
        load();
      }},
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "bottom"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          {activeTab === "notice" ? "공지" : "투표"}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => activeTab === "notice" ? setNoticeOpen(true) : setPollOpen(true)}
        >
          <Icon name="add" size={24} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* 탭 바 */}
      <View style={[styles.tabBar, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        {(["notice", "poll"] as BoardTab[]).map((tab) => {
          const focused = activeTab === tab;
          const label = tab === "notice" ? "공지" : "투표";
          const color = tab === "notice" ? "#007AFF" : "#9B59B6";
          return (
            <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
              <Text style={[styles.tabLabel, { color: focused ? color : C.textMuted, fontWeight: focused ? "700" : "500" }]}>
                {label}
              </Text>
              {focused && <View style={[styles.tabUnderline, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {/* 공지 탭 */}
          {activeTab === "notice" && (
            notices.length === 0 ? (
              <EmptyState icon="announcement" message="등록된 공지가 없어요." C={C} />
            ) : notices.map((n) => (
              <View key={n.id} style={[styles.noticeCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.noticeHeader}>
                  <View style={[styles.iconBox, { backgroundColor: '#007AFF18' }]}>
                    <Icon name="announcement" size={16} color="#007AFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.noticeAuthor, { color: C.textMuted }]}>{n.author_name}</Text>
                    <Text style={[styles.noticeDate, { color: C.textMuted }]}>
                      {new Date(n.created_at).toLocaleDateString("ko-KR")}
                    </Text>
                  </View>
                  {n.can_delete && (
                    <TouchableOpacity onPress={() => handleDeleteNotice(n.id)} activeOpacity={0.7}>
                      <Icon name="option" size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.noticeContent, { color: C.text }]}>{n.content}</Text>
              </View>
            ))
          )}

          {/* 투표 탭 */}
          {activeTab === "poll" && (
            polls.length === 0 ? (
              <EmptyState icon="vote" message="등록된 투표가 없어요." C={C} />
            ) : polls.map((p) => (
              <View key={p.id} style={[styles.pollCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={styles.pollHeader}>
                  <View style={[styles.iconBox, { backgroundColor: '#9B59B618' }]}>
                    <Icon name="vote" size={16} color="#9B59B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pollQuestion, { color: C.text }]}>{p.question}</Text>
                    <Text style={[styles.pollMeta, { color: C.textMuted }]}>
                      {p.author_name} · {p.total_votes}명 참여
                      {p.closed ? " · 종료됨" : ""}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 8, marginTop: 12 }}>
                  {p.options.map((opt, idx) => {
                    const voted = p.my_vote === idx;
                    const pct = p.total_votes > 0 ? Math.round((p.counts[idx] / p.total_votes) * 100) : 0;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => !p.closed && handleVote(p.id, idx)}
                        activeOpacity={p.closed ? 1 : 0.7}
                        style={[styles.pollOption, {
                          borderColor: voted ? "#9B59B6" : C.border,
                          backgroundColor: voted ? "#9B59B618" : C.bg,
                        }]}
                      >
                        <View style={[styles.pollBar, { width: `${pct}%` as any, backgroundColor: "#9B59B614" }]} />
                        <Text style={[styles.pollOptionText, { color: voted ? "#9B59B6" : C.text }]} numberOfLines={1}>
                          {opt}
                        </Text>
                        <Text style={[styles.pollPct, { color: voted ? "#9B59B6" : C.textMuted }]}>{pct}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <NoticeModal
        visible={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        onSubmit={async (content) => {
          setNoticeOpen(false);
          try { await ChatAPI.createNotice(projectId, content); } catch {}
          load();
        }}
      />
      <PollModal
        visible={pollOpen}
        onClose={() => setPollOpen(false)}
        onSubmit={async (question, options) => {
          setPollOpen(false);
          try { await ChatAPI.createPoll(projectId, question, options); } catch {}
          load();
        }}
      />
    </SafeAreaView>
  );
}

function EmptyState({ icon, message, C }: { icon: any; message: string; C: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.emptyWrap}>
      <Icon name={icon} size={48} color={C.border} />
      <Text style={[styles.emptyText, { color: C.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    position: "relative",
  },
  tabLabel: { fontSize: 15 },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 2,
  },

  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  noticeHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  noticeAuthor: { fontSize: 13, fontWeight: "600" },
  noticeDate: { fontSize: 12, marginTop: 1 },
  noticeContent: { fontSize: 15, lineHeight: 22 },

  pollCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  pollHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  pollQuestion: { fontSize: 15, fontWeight: "700", flex: 1 },
  pollMeta: { fontSize: 12, marginTop: 3 },
  pollOption: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  pollBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  pollOptionText: { flex: 1, fontSize: 14, fontWeight: "500" },
  pollPct: { fontSize: 13, fontWeight: "700" },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
