import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/common/Icon";
import ChatBox from "@/components/chat/ChatBox";
import { NoticeModal, PollModal } from "@/components/chat/ChatComposers";
import { ChatAPI, MessageDTO, NoticeDTO, PollDTO } from "@/services/api";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── 타입 ──────────────────────────────────
interface Message {
  id: string;
  variant: "mine" | "theirs";
  message: string;
  time: string;
  createdAt?: string;
  senderName?: string;
  senderInitial?: string;
  readCount?: number;
  attachmentType?: "image" | "file" | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
}

function PinnedCards({ notices, polls, onDeleteNotice, onVote, onDeletePoll }: {
  notices: NoticeDTO[];
  polls: PollDTO[];
  onDeleteNotice: (id: string) => void;
  onVote: (pollId: string, optionIndex: number) => void;
  onDeletePoll: (id: string) => void;
}) {
  const C = useTheme();
  if (notices.length === 0 && polls.length === 0) return null;
  return (
    <View style={{ backgroundColor: C.bg, paddingVertical: 8, gap: 6, paddingHorizontal: 12 }}>
      {notices.slice(0, 1).map((n) => (
        <View key={n.id} style={[pinnedStyles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={pinnedStyles.icon}>📣</Text>
          <View style={{ flex: 1 }}>
            <Text style={[pinnedStyles.title, { color: C.text }]}>공지 · {n.author_name}</Text>
            <Text style={[pinnedStyles.desc, { color: C.textMuted }]} numberOfLines={2}>{n.content}</Text>
          </View>
          <TouchableOpacity onPress={() => onDeleteNotice(n.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={pinnedStyles.close}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {polls.map((p) => {
        const max = Math.max(1, ...p.counts);
        return (
          <View key={p.id} style={[pinnedStyles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={pinnedStyles.icon}>☑️ </Text>
                <Text style={[pinnedStyles.title, { flex: 1, color: C.text }]} numberOfLines={1}>{p.question}</Text>
                <TouchableOpacity onPress={() => onDeletePoll(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={pinnedStyles.close}>×</Text>
                </TouchableOpacity>
              </View>
              {p.options.map((opt, i) => {
                const cnt = p.counts[i] ?? 0;
                const pct = p.total_votes > 0 ? Math.round((cnt / p.total_votes) * 100) : 0;
                const mine = p.my_vote === i;
                return (
                  <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => onVote(p.id, i)}
                    style={pollStyles.option}>
                    <View style={[pollStyles.optionFill, { width: `${pct}%`, backgroundColor: mine ? "#00A9EC30" : "#E5E7EB" }]} />
                    <Text style={[pollStyles.optionLabel, { color: C.text }, mine && { fontWeight: "700", color: "#00A9EC" }]}>
                      {mine ? "✓ " : ""}{opt}
                    </Text>
                    <Text style={[pollStyles.optionCount, { color: C.textMuted }]}>{cnt}표 · {pct}%</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={[pollStyles.totalText, { color: C.textMuted }]}>{p.author_name} · 총 {p.total_votes}표</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const pollStyles = StyleSheet.create({
  option: { position: "relative", justifyContent: "center", borderRadius: 8, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB", minHeight: 34, paddingHorizontal: 10 },
  optionFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  optionLabel: { fontSize: 13, paddingVertical: 7 },
  optionCount: { position: "absolute", right: 10, fontSize: 11 },
  totalText: { fontSize: 11, marginTop: 2 },
});

const pinnedStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  icon: { fontSize: 18 },
  title: { fontSize: 13, fontWeight: "600", color: "#111", marginBottom: 2 },
  desc: { fontSize: 12, color: "#6B7280" },
  close: { fontSize: 18, color: "#9CA3AF", lineHeight: 22 },
});

export default function ChatDetailScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ projectId: string; name?: string }>();
  const roomId = params.projectId;
  const roomName = params.name ?? "채팅방";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 공지 / 투표
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [polls, setPolls] = useState<PollDTO[]>([]);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);

  const handleVote = (pollId: string, optionIndex: number) => {
    ChatAPI.votePoll(pollId, optionIndex)
      .then((updated) => setPolls((prev) => prev.map((p) => p.id === pollId ? updated : p)))
      .catch(() => {});
  };
  const handleDeleteNotice = (id: string) => {
    ChatAPI.deleteNotice(id).then(() => setNotices((prev) => prev.filter((n) => n.id !== id))).catch(() => {});
  };
  const handleDeletePoll = (id: string) => {
    ChatAPI.deletePoll(id).then(() => setPolls((prev) => prev.filter((p) => p.id !== id))).catch(() => {});
  };

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const listRef = useRef<FlatList>(null);

  const memberCount = 0;

  const toMsg = useCallback((d: MessageDTO): Message => ({
    id: d.id,
    variant: d.sender_id === user?.id ? "mine" : "theirs",
    message: d.content,
    time: fmtTime(d.created_at),
    createdAt: d.created_at,
    senderName: d.sender_name,
    senderInitial: d.sender_name?.charAt(0),
    attachmentType: d.attachment_type,
    attachmentUrl: d.attachment_url,
    attachmentName: d.attachment_name,
  }), [user?.id]);

  const [othersRead, setOthersRead] = useState<{ user_id: string; last_read_at: string | null }[]>([]);

  const scrollEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const reload = useCallback(() => {
    if (!roomId) return;
    ChatAPI.messages(roomId)
      .then(ds => { setMessages(ds.map(toMsg)); scrollEnd(); })
      .catch(() => {});
  }, [roomId, toMsg]);

  const reloadReadStatus = useCallback(() => {
    if (!roomId || !user?.id) return;
    ChatAPI.getReadStatus(roomId).then(list => {
      setOthersRead(list.filter(m => m.user_id !== user.id));
    }).catch(() => {});
  }, [roomId, user?.id]);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const reloadReadRef = useRef(reloadReadStatus);
  reloadReadRef.current = reloadReadStatus;

  // 초기 로드 병렬 처리 + Realtime 구독
  useEffect(() => {
    if (!roomId) return;

    setIsLoading(true);

    // 모든 API 병렬 호출
    Promise.all([
      ChatAPI.messages(roomId),
      ChatAPI.getReadStatus(roomId),
      ChatAPI.listNotices(roomId),
      ChatAPI.listPolls(roomId),
      ChatAPI.markAsRead(roomId).catch(() => null),
    ])
      .then(([msgs, readStatus, notices, polls]) => {
        setMessages(msgs.map(toMsg));
        setOthersRead(readStatus.filter((m) => m.user_id !== user?.id));
        setNotices(notices);
        setPolls(polls);
        scrollEnd();
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    // Realtime 구독
    const msgChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        () => reloadRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_room_members", filter: `room_id=eq.${roomId}` },
        () => reloadReadRef.current(),
      )
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [roomId]);

  const unreadCountFor = (msgCreatedAt: string) => {
    if (!msgCreatedAt) return 0;
    return othersRead.filter(m => !m.last_read_at || m.last_read_at < msgCreatedAt).length;
  };

  const filteredMessages = isSearchMode && searchText.trim() !== ""
    ? messages.filter(m => m.message.toLowerCase().includes(searchText.toLowerCase()))
    : messages;

  const sendMessage = async () => {
    if (!inputText.trim() || !roomId) return;
    const text = inputText.trim();
    setInputText("");
    await ChatAPI.send(roomId, text).catch(() => {});
    reload();
  };

  const sendFile = async (uri: string, name: string, mime: string) => {
    if (!roomId) return;
    setShowPlusMenu(false);
    try {
      await ChatAPI.sendFile(roomId, uri, name, mime);
      reload();
    } catch (e: any) {
      Alert.alert("전송 실패", e?.message ?? "파일 전송에 실패했어요.");
    }
  };

  const pickCamera = async () => {
    setShowPlusMenu(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("권한 필요", "카메라 권한이 필요해요."); return; }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      sendFile(a.uri, a.fileName ?? `photo_${Date.now()}.jpg`, a.mimeType ?? "image/jpeg");
    } catch (e: any) {
      Alert.alert("카메라 사용 불가", "시뮬레이터에는 카메라가 없어요. 실제 기기에서 사용하거나 '사진'을 이용해주세요.");
    }
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    sendFile(a.uri, a.fileName ?? `photo_${Date.now()}.jpg`, a.mimeType ?? "image/jpeg");
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    sendFile(a.uri, a.name, a.mimeType ?? "application/octet-stream");
  };

  const openAttachment = async (url?: string | null) => {
    if (url) await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, borderBottomWidth: 1 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Icon name="back" size={24} color={C.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: C.text }]}>{roomName}</Text>
            {memberCount > 1 && <Text style={styles.memberCount}>{memberCount}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                setIsSearchMode(!isSearchMode);
                if (isSearchMode) setSearchText("");
              }}
            >
              <Icon name="search" size={22} color={isSearchMode ? "#00A9EC" : C.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push({
                pathname: '/(screens)/chat/ChatMenu',
                params: { projectId: roomId, name: roomName }
              })}
            >
              <Icon name="menu" size={24} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 검색 바 */}
        {isSearchMode && (
          <View style={[styles.searchBar, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: C.bgMuted }]}>
              <Icon name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text }]}
                placeholder="대화 내용 검색"
                placeholderTextColor={C.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Icon name="close" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* 공지/투표 알림 카드 */}
        <PinnedCards
          notices={notices}
          polls={polls}
          onDeleteNotice={handleDeleteNotice}
          onVote={handleVote}
          onDeletePoll={handleDeletePoll}
        />

        {/* 메시지 리스트 or 로딩 */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
            <ActivityIndicator size="large" color="#00A9EC" />
            <Text style={{ marginTop: 10, color: "#9CA3AF", fontSize: 13 }}>채팅을 불러오는 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBox
                variant={item.variant}
                message={item.message}
                time={item.time}
                senderName={item.senderName}
                senderInitial={item.senderInitial}
                readCount={item.variant === "mine" ? unreadCountFor(item.createdAt ?? "") : 0}
                attachmentType={item.attachmentType}
                attachmentUrl={item.attachmentUrl}
                attachmentName={item.attachmentName}
                onAttachmentPress={() => openAttachment(item.attachmentUrl)}
              />
            )}
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={{ paddingVertical: 20 }}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* 플러스 메뉴 */}
        {showPlusMenu && (
          <View style={[styles.plusMenuContainer, { backgroundColor: C.bgCard, bottom: 60 + (insets.bottom || 0) }]}>
            <View style={styles.plusMenuGrid}>
              <PlusMenuItem icon="camera" label="카메라" onPress={pickCamera} />
              <PlusMenuItem icon="photo" label="사진" onPress={pickPhoto} />
              <PlusMenuItem icon="file" label="파일" onPress={pickFile} />
              <PlusMenuItem icon="announcement" label="공지" onPress={() => { setShowPlusMenu(false); setNoticeModalOpen(true); }} />
              <PlusMenuItem icon="vote" label="투표" onPress={() => { setShowPlusMenu(false); setPollModalOpen(true); }} />
            </View>
          </View>
        )}

        {/* 하단 입력바 */}
        <View style={[styles.inputBar, { backgroundColor: C.bgCard, borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={() => setShowPlusMenu(!showPlusMenu)}
          >
            <Icon name="add" size={24} color={C.textMuted} />
          </TouchableOpacity>

          <View style={[styles.inputContainer, { backgroundColor: C.bgMuted }]}>
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="내용을 입력하세요..."
              placeholderTextColor={C.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <View style={[styles.sendBtn, { backgroundColor: inputText.trim() ? '#00A9EC' : '#E5E7EB' }]}>
              <Icon name="send" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <NoticeModal
        visible={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        onSubmit={(content) => {
          ChatAPI.createNotice(roomId, content)
            .then((n) => setNotices((prev) => [n, ...prev]))
            .catch(() => {});
          setNoticeModalOpen(false);
        }}
      />
      <PollModal
        visible={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        onSubmit={(question, options) => {
          ChatAPI.createPoll(roomId, question, options)
            .then((p) => setPolls((prev) => [p, ...prev]))
            .catch(() => {});
          setPollModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function PlusMenuItem({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) {
  const C = useTheme();
  return (
    <TouchableOpacity style={styles.plusMenuItem} onPress={onPress}>
      <View style={[styles.plusIconCircle, { backgroundColor: C.bgMuted }]}>
        <Icon name={icon} size={24} color={C.text} />
      </View>
      <Text style={[styles.plusMenuLabel, { color: C.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  memberCount: {
    fontWeight: '400',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  searchInputContainer: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    padding: 0,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 0.5,
    borderTopColor: '#EEE',
  },
  plusBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  inputContainer: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#333',
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusMenuContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    width: 160,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  plusMenuGrid: {
    gap: 16,
  },
  plusMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusMenuLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  }
});