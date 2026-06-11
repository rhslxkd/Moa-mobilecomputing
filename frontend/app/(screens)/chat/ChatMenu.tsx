import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { ChatAPI } from "@/services/api";
import { NoticeModal, PollModal } from "@/components/chat/ChatComposers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RoomMember { id: string; name: string; initial: string; me: boolean }

export default function ChatMenuScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ projectId: string; name?: string }>();
  const roomId = params.projectId;
  const roomName = params.name ?? "채팅방";

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    ChatAPI.roomMembers(roomId).then((ms) =>
      setMembers(ms.map((m) => ({
        id: m.user_id, name: m.name, initial: m.name.charAt(0), me: m.is_me,
      })))
    ).catch(() => {});
  }, [roomId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9F9' }} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setMuted(v => !v); Alert.alert("알림", muted ? "채팅방 알림을 켰어요." : "채팅방 알림을 껐어요."); }}>
            <Icon name="bell" size={22} color={muted ? "#BBB" : "#333"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setFavorite(v => !v); Alert.alert("즐겨찾기", favorite ? "즐겨찾기에서 제거했어요." : "즐겨찾기에 추가했어요."); }}>
            <Icon name="star" size={22} color={favorite ? "#F5B301" : "#333"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push({ pathname: "/(screens)/chat/RoomSettings", params: { roomId, name: roomName } } as any)}>
            <Icon name="settings" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* 상단 프로필 */}
        <View style={styles.topProfile}>
          <View style={styles.groupAvatarGrid}>
            <View style={[styles.avatarBox, { backgroundColor: '#E0E7FF' }]}><Icon name="profile" size={20} color="#818CF8" /></View>
            <View style={[styles.avatarBox, { backgroundColor: '#FECACA' }]}><Icon name="profile" size={20} color="#F87171" /></View>
            <View style={[styles.avatarBox, { backgroundColor: '#D1FAE5' }]}><Icon name="profile" size={20} color="#34D399" /></View>
            <View style={[styles.avatarBox, { backgroundColor: '#Fef3c7' }]}><Icon name="profile" size={20} color="#fbbf24" /></View>
          </View>
          <Text style={styles.roomName}>{roomName}</Text>
        </View>

        {/* 미디어 카드 */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => router.push({
              pathname: '/(screens)/chat/ChatArchive',
              params: { projectId: roomId, initialTab: 'media' }
            })}
          >
            <View style={styles.itemTitleRow}>
              <Icon name="photo" size={18} color="#2ECC71" />
              <Text style={styles.itemTitle}>사진/동영상</Text>
            </View>
          </TouchableOpacity>

          <MenuListItem icon="file" label="파일" color="#7F8C8D" onPress={() => router.push({
            pathname: '/(screens)/chat/ChatArchive',
            params: { projectId: roomId, initialTab: 'file' }
          })} />
          <MenuListItem icon="link" label="링크" color="#007AFF" onPress={() => router.push({
            pathname: '/(screens)/chat/ChatArchive',
            params: { projectId: roomId, initialTab: 'link' }
          })} />
          <MenuListItem icon="calendar" label="전체 To-Do" color="#4FC3F7" onPress={() => router.push("/(tabs)/todos")} />
        </View>

        {/* 기능 카드 (그리드) */}
        <View style={styles.card}>
          <View style={styles.gridRow}>
            <GridItem icon="announcement" label="공지" color="#007AFF" onPress={() => setNoticeOpen(true)} />
            <GridItem icon="vote" label="투표" color="#9B59B6" onPress={() => setPollOpen(true)} />
          </View>
        </View>

        {/* 멤버 카드 */}
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, 40) }]}>
          <Text style={styles.memberCountText}>대화상대 {members.length}</Text>

          {members.map(m => (
            <View key={m.id} style={styles.memberRow}>
              <View style={[styles.smallAvatar, { backgroundColor: m.me ? '#E5E7EB' : '#A5F3FC' }]}>
                <Text style={styles.avatarInitial}>{m.initial}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {m.me && (
                  <View style={styles.selfBadge}>
                    <Text style={styles.selfBadgeText}>나</Text>
                  </View>
                )}
                <Text style={styles.memberName}>{m.name}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <NoticeModal
        visible={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        onSubmit={(content) => {
          ChatAPI.createNotice(roomId, content).catch(() => {});
          setNoticeOpen(false);
        }}
      />
      <PollModal
        visible={pollOpen}
        onClose={() => setPollOpen(false)}
        onSubmit={(question, options) => {
          ChatAPI.createPoll(roomId, question, options).catch(() => {});
          setPollOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function MenuListItem({ icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.cardItem, styles.listItem]} onPress={onPress}>
      <Icon name={icon} size={18} color={color} />
      <Text style={styles.itemTitle}>{label}</Text>
    </TouchableOpacity>
  );
}

function GridItem({ icon, label, color, onPress }: { icon: any, label: string, color: string, onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.gridItem} onPress={onPress}>
      <Icon name={icon} size={20} color={color} />
      <Text style={styles.itemTitle}>{label}</Text>
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
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  topProfile: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  groupAvatarGrid: {
    width: 80,
    height: 80,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    color: '#111',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardItem: {
    marginBottom: 16,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  thumbRow: {
    gap: 8,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  dividerLight: {
    height: 0.5,
    backgroundColor: '#EEE',
  },
  betaText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  plusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  smallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  selfBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#535965',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  }
});
