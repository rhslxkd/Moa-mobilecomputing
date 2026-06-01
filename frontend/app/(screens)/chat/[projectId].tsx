import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import ChatBox from "@/components/chat/ChatBox";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── 타입 ──────────────────────────────────
interface Message {
  id: string;
  variant: "mine" | "theirs";
  message: string;
  time: string;
  senderName?: string;
  senderInitial?: string;
  readCount?: number;
}

// ── Mock 데이터 ───────────────────────────
const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    variant: "mine",
    message: "채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용",
    time: "오후 3:06",
    readCount: 1,
  },
  {
    id: "m2",
    variant: "theirs",
    message: "채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용채팅내용",
    time: "오후 3:06",
    readCount: 1,
    senderName: "손범관",
    senderInitial: "범관",
  },
];

const ROOM_NAMES: Record<string, string> = {
  t1: "AI 챗봇 개발 프로젝트",
  t2: "모바일 앱 디자인",
  t3: "데이터 분석 프로젝트",
  p1: "이지은",
};

const PINNED_ITEMS = [
  { type: "공지", icon: "📣", title: "공지 제목", desc: "공지내용공지내용공지내용공지내용공지내용공지내용공지내용공지내용..." },
  { type: "투표", icon: "☑️", title: "투표 제목", desc: "투표가 진행 중입니다. 참여해주세요." },
  { type: "일정", icon: "📅", title: "일정 조율 제목", desc: "일정 조율이 진행 중입니다. 참여해주세요." },
];

function PinnedCards() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = PINNED_ITEMS.filter((_, i) => !dismissed.includes(i));
  if (visible.length === 0) return null;
  return (
    <View style={{ backgroundColor: "#F9FAFB", paddingVertical: 8, gap: 6, paddingHorizontal: 12 }}>
      {visible.map((item, idx) => {
        const origIdx = PINNED_ITEMS.indexOf(item);
        return (
          <View key={origIdx} style={pinnedStyles.card}>
            <Text style={pinnedStyles.icon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={pinnedStyles.title}>{item.title}</Text>
              <Text style={pinnedStyles.desc} numberOfLines={1}>{item.desc}</Text>
            </View>
            <TouchableOpacity onPress={() => setDismissed(prev => [...prev, origIdx])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={pinnedStyles.close}>×</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

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
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const listRef = useRef<FlatList>(null);

  const roomName = ROOM_NAMES[projectId] ?? "채팅방";
  const memberCount = projectId?.startsWith('t') ? 5 : 1;

  const filteredMessages = isSearchMode && searchText.trim() !== ""
    ? messages.filter(m => m.message.toLowerCase().includes(searchText.toLowerCase()))
    : messages;

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    const newMsg: Message = {
      id: String(Date.now()),
      variant: "mine",
      message: inputText,
      time,
      readCount: 1,
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Icon name="back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{roomName}</Text>
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
              <Icon name="search" size={22} color={isSearchMode ? "#00A9EC" : "#333"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerBtn}
              onPress={() => router.push({
                pathname: '/(screens)/chat/ChatMenu',
                params: { projectId }
              })}
            >
              <Icon name="menu" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 검색 바 (Search Mode 시 활성) */}
        {isSearchMode && (
          <View style={styles.searchBar}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="대화 내용 검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Icon name="close" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* 공지/투표/일정 알림 카드 */}
        <PinnedCards />

        {/* 메시지 리스트 */}
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
              readCount={item.readCount}
            />
          )}
          style={{ flex: 1, backgroundColor: '#F9FAFB' }}
          contentContainerStyle={{ paddingVertical: 20 }}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* 플러스 메뉴 (팝업형태) */}
        {showPlusMenu && (
          <View style={[styles.plusMenuContainer, { backgroundColor: '#FFFFFF', bottom: 60 + (insets.bottom || 0) }]}>
            <View style={styles.plusMenuGrid}>
              <PlusMenuItem icon="camera" label="카메라" onPress={() => setShowPlusMenu(false)} />
              <PlusMenuItem icon="photo" label="사진" onPress={() => setShowPlusMenu(false)} />
              <PlusMenuItem icon="file" label="파일" onPress={() => setShowPlusMenu(false)} />
              <PlusMenuItem icon="mic" label="녹음" onPress={() => setShowPlusMenu(false)} />
            </View>
          </View>
        )}

        {/* 하단 입력바 */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity 
            style={styles.plusBtn}
            onPress={() => setShowPlusMenu(!showPlusMenu)}
          >
            <Icon name="add" size={24} color="#666" />
          </TouchableOpacity>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="내용을 입력하세요..."
              placeholderTextColor="#999"
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
    </SafeAreaView>
  );
}

function PlusMenuItem({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.plusMenuItem} onPress={onPress}>
      <View style={styles.plusIconCircle}>
        <Icon name={icon} size={24} color="#333" />
      </View>
      <Text style={styles.plusMenuLabel}>{label}</Text>
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
