import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { SvgXml } from "react-native-svg";
import Icon from "@/components/common/Icon";
import { Swipeable, RectButton } from "react-native-gesture-handler";

type FilterType = "all" | "unread" | "gemini";

interface ChatRoom {
  id: string;
  name: string;
  initial: string;
  lastMessage: string;
  time: string;
  unread: number;
  color: string;
  memberCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
}

const INITIAL_ROOMS: ChatRoom[] = [
  { id: "t1", name: "AI 챗봇 개발 프로젝트", initial: "AI", lastMessage: "박지민: 오늘 스프린트 리뷰 완료했습니다", time: "8시간 전", unread: 1, color: "#00A9EC", memberCount: 5 },
  { id: "t2", name: "모바일 앱 디자인", initial: "모", lastMessage: "이지은: 피그마 링크 공유할게요", time: "3월 20일", unread: 0, color: "#7C3AED", memberCount: 4 },
  { id: "t3", name: "데이터 분석 프로젝트", initial: "데", lastMessage: "김철수: 분석 결과 첨부했어요", time: "3월 20일", unread: 0, color: "#16A34A", memberCount: 3 },
  { id: "p1", name: "이지은", initial: "이", lastMessage: "내일 회의 시간 괜찮으세요?", time: "3월 20일", unread: 1, color: "#A78BFA", memberCount: 1 },
];

const KAKAO_USER_XML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="9.5" r="4" fill="white"/>
  <path d="M4 24C4 19 7.5 15.5 12 15.5C16.5 15.5 20 19 20 24Z" fill="white"/>
</svg>`;

function DummyAvatar({ size, color, radius }: { size: number, color: string, radius: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <SvgXml xml={KAKAO_USER_XML} width={size * 1.1} height={size * 1.1} style={{ marginBottom: -size * 0.1 }} />
    </View>
  );
}

function KakaoGroupAvatar({ memberCount, bgCard }: { memberCount: number, bgCard: string }) {
  const count = Math.max(1, Math.min(memberCount, 4));
  const size = 50;
  const BG_COLORS = ["#A1C4DF", "#99BCCC", "#A9B3D6", "#B9B2D8"]; 

  if (count <= 1) {
    return <DummyAvatar size={size} color={BG_COLORS[0]} radius={20} />;
  }
  if (count === 2) {
    const s = 30;
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <DummyAvatar size={s} color={BG_COLORS[0]} radius={12} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: 14, backgroundColor: bgCard, padding: 2 }}>
          <DummyAvatar size={s} color={BG_COLORS[1]} radius={12} />
        </View>
      </View>
    );
  }
  if (count === 3) {
    const s = 24;
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: size / 2 - s / 2 }}>
          <DummyAvatar size={s} color={BG_COLORS[0]} radius={9} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, borderRadius: 11, backgroundColor: bgCard, padding: 2 }}>
          <DummyAvatar size={s} color={BG_COLORS[1]} radius={9} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: 11, backgroundColor: bgCard, padding: 2 }}>
          <DummyAvatar size={s} color={BG_COLORS[2]} radius={9} />
        </View>
      </View>
    );
  }
  const s = 23;
  return (
    <View style={{ width: size, height: size, flexWrap: 'wrap', alignContent: 'space-between', justifyContent: 'space-between' }}>
      <DummyAvatar size={s} color={BG_COLORS[0]} radius={9} />
      <DummyAvatar size={s} color={BG_COLORS[1]} radius={9} />
      <DummyAvatar size={s} color={BG_COLORS[2]} radius={9} />
      <DummyAvatar size={s} color={BG_COLORS[3]} radius={9} />
    </View>
  );
}

function GeminiSpark({ size, color }: { size: number; color: string }) {
  return (
    <SvgXml
      xml={`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0Z" fill="${color}" />
      </svg>`}
    />
  );
}

function UnreadChatIcon({ size, strokeColor }: { size: number; strokeColor: string }) {
  return (
    <SvgXml
      xml={`<svg width="${size}" height="${size}" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M17.3333 5.33338C18.3341 5.33338 19.2012 5.33285 19.9603 5.34998C19.8771 5.77596 19.8333 6.21607 19.8333 6.66638C19.8333 10.4396 22.8915 13.4972 26.6644 13.4984C26.6656 13.8663 26.6663 14.2551 26.6663 14.6664C26.6663 18.4113 26.6665 20.2841 25.7679 21.6293C25.3788 22.2116 24.8785 22.7118 24.2962 23.101C22.951 23.9998 21.0785 24.0004 17.3333 24.0004H14.6663C13.8896 24.0004 13.1934 23.9976 12.5657 23.9896L12.4681 24.2377L10.013 26.4379C9.19475 27.1706 7.89102 26.6551 7.79523 25.5609L7.57257 23.0092C7.0464 22.6343 6.59118 22.1672 6.23175 21.6293C5.33326 20.2841 5.33331 18.4111 5.33331 14.6664C5.33331 10.9214 5.33299 9.04864 6.23175 7.70349C6.62086 7.12115 7.12108 6.62093 7.70343 6.23181C9.04858 5.33305 10.9214 5.33338 14.6663 5.33338H17.3333ZM10.6663 13.3334C9.93021 13.3336 9.33349 13.9303 9.33331 14.6664C9.33331 15.4026 9.9301 16.0002 10.6663 16.0004C11.4027 16.0004 12.0003 15.4028 12.0003 14.6664C12.0001 13.9302 11.4026 13.3334 10.6663 13.3334ZM16.0003 13.3334C15.264 13.3334 14.6665 13.9302 14.6663 14.6664C14.6663 15.4028 15.2639 16.0004 16.0003 16.0004C16.7365 16.0002 17.3333 15.4027 17.3333 14.6664C17.3331 13.9302 16.7364 13.3335 16.0003 13.3334ZM21.3333 13.3334C20.5971 13.3334 20.0005 13.9302 20.0003 14.6664C20.0003 15.4028 20.5969 16.0004 21.3333 16.0004C22.0697 16.0004 22.6663 15.4028 22.6663 14.6664C22.6661 13.9302 22.0696 13.3334 21.3333 13.3334Z" fill="#00A9EC"/>
        <circle cx="26.6667" cy="6.66667" r="3.33333" fill="#FF1B1B" stroke="${strokeColor}" stroke-width="1.33333"/>
      </svg>`}
    />
  );
}

interface ChatRoomItemProps {
  room: ChatRoom;
  onPress: () => void;
  onToggleUnread: (id: string) => void;
  onToggleMute: (id: string) => void;
  onTogglePin: (id: string) => void;
  onLeave: (id: string) => void;
}

function ChatRoomItem({ room, onPress, onToggleUnread, onToggleMute, onTogglePin, onLeave }: ChatRoomItemProps) {
  const C = useTheme();
  let swipeableRef = React.useRef<Swipeable>(null);

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    return (
      <View style={styles.leftActions}>
        <RectButton style={[styles.actionBtn, { backgroundColor: '#8DBAE8' }]} onPress={() => { onToggleUnread(room.id); swipeableRef.current?.close(); }}>
           <Icon name="chat" size={24} color="#FFF" />
        </RectButton>
        <RectButton style={[styles.actionBtn, { backgroundColor: '#7FABE0' }]} onPress={() => { onToggleMute(room.id); swipeableRef.current?.close(); }}>
           <Icon name={room.isMuted ? "bell" : "bell"} size={24} color={room.isMuted ? "#DDD" : "#FFF"} />
        </RectButton>
        <RectButton style={[styles.actionBtn, { backgroundColor: '#719CD9' }]} onPress={() => { onTogglePin(room.id); swipeableRef.current?.close(); }}>
           <Icon name="pin" size={24} color={room.isPinned ? "#FBFF00" : "#FFF"} />
        </RectButton>
      </View>
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    return (
      <View style={styles.rightActions}>
        <RectButton style={[styles.actionBtn, { backgroundColor: '#FF6341', width: 80 }]} onPress={() => { onLeave(room.id); swipeableRef.current?.close(); }}>
           <Text style={styles.actionText}>나가기</Text>
        </RectButton>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={1} style={[styles.roomItem, { backgroundColor: room.isPinned ? '#F0F7FF' : C.bgCard }]}>
        <View style={{ marginRight: 16 }}>
          <KakaoGroupAvatar memberCount={room.memberCount} bgCard={room.isPinned ? '#F0F7FF' : C.bgCard} />
        </View>
        <View style={styles.roomInfo}>
          <View style={styles.roomTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={[styles.roomName, { color: C.text }]} numberOfLines={1}>{room.name}</Text>
              {room.isPinned && <Icon name="pin" size={12} color="#999" />}
              {room.isMuted && <Icon name="bell" size={12} color="#999" />}
            </View>
            <Text style={[styles.roomTime, { color: C.textMuted }]}>{room.time}</Text>
          </View>
          <View style={styles.roomBottomRow}>
            <Text style={[styles.lastMessage, { color: C.textMuted }]} numberOfLines={1}>{room.lastMessage}</Text>
            {room.unread > 0 && (
              <View style={[styles.badge, { backgroundColor: "#FF3B30" }]}>
                <Text style={styles.badgeText}>{room.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function ChatScreen() {
  const C = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [rooms, setRooms] = useState<ChatRoom[]>(INITIAL_ROOMS);

  const handleToggleUnread = (id: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, unread: r.unread > 0 ? 0 : 1 } : r));
  };

  const handleToggleMute = (id: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, isMuted: !r.isMuted } : r));
  };

  const handleTogglePin = (id: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, isPinned: !r.isPinned } : r));
  };

  const handleLeave = (id: string) => {
    Alert.alert("채팅방 나가기", "이 채팅방에서 나가시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "나가기", style: "destructive", onPress: () => {
        setRooms(prev => prev.filter(r => r.id !== id));
      }}
    ]);
  };

  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const filtered = filter === "unread" ? sortedRooms.filter((r) => r.unread > 0) : sortedRooms;

  const FILTER_TABS: { id: FilterType, label: string }[] = [
    { id: "all", label: "전체" },
    { id: "unread", label: "안읽음" },
    { id: "gemini", label: "Gemini" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bgCard }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: C.text }]}>채팅</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Icon name="search" size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconBtn} 
            activeOpacity={0.7}
            onPress={() => router.push('/(screens)/AddChat')}
          >
            <Icon name="add" size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Icon name="settings" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 필터 칩 (스크롤) */}
      <View style={{ backgroundColor: C.bgCard, paddingVertical: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  if (tab.id === 'gemini') {
                    Linking.openURL('https://gemini.google.com');
                  } else {
                    setFilter(tab.id);
                  }
                }}
                activeOpacity={0.8}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? C.text : C.bgCard,
                    borderColor: isSelected ? C.text : C.border,
                  }
                ]}
              >
                {tab.id === 'gemini' && (
                  <View style={{ marginRight: 4 }}>
                    <GeminiSpark size={14} color={isSelected ? C.bgCard : C.textSub} />
                  </View>
                )}
                {tab.id === 'unread' && (
                  <View style={isSelected ? { marginRight: 4 } : {}}>
                    <UnreadChatIcon size={16} strokeColor={isSelected ? C.text : C.bgCard} />
                  </View>
                )}
                {(tab.id !== 'unread' || isSelected) && (
                  <Text style={[
                    styles.filterPillText,
                    { color: isSelected ? C.bgCard : C.textSub }
                  ]}>
                    {tab.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.filterPill, { backgroundColor: C.bgCard, borderColor: C.border, paddingHorizontal: 12 }]}
          >
            <Icon name="add" size={16} color={C.textSub} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 채팅방 목록 */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatRoomItem
            room={item}
            onPress={() => router.push(`/(screens)/chat/${item.id}`)}
            onToggleUnread={handleToggleUnread}
            onToggleMute={handleToggleMute}
            onTogglePin={handleTogglePin}
            onLeave={handleLeave}
          />
        )}
        style={{ flex: 1, backgroundColor: C.bgCard }}
        contentContainerStyle={[{ paddingBottom: 40 }, filtered.length === 0 ? styles.emptyContainer : undefined]}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 }}>모두 읽었어요!</Text>
            <Text style={{ fontSize: 14, color: C.textMuted }}>이 평온함을 즐겨도 좋아요.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 14, fontWeight: "600" },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  roomInfo: { flex: 1, gap: 4 },
  roomTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontSize: 16, fontWeight: "600", maxWidth: '70%' },
  roomTime: { fontSize: 12, flexShrink: 0 },
  roomBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lastMessage: { fontSize: 14, flex: 1, marginRight: 8 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyContainer: { flex: 1, alignItems: "center", paddingTop: 80 },
  leftActions: {
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    width: 60,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  }
});
