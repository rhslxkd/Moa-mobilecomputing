import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { ChatAPI } from "@/services/api";

const KAKAO_USER_XML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="9.5" r="4" fill="white"/>
  <path d="M4 24C4 19 7.5 15.5 12 15.5C16.5 15.5 20 19 20 24Z" fill="white"/>
</svg>`;

const BG_COLORS = ["#A1C4DF", "#99BCCC", "#A9B3D6", "#B9B2D8"];

function DummyAvatar({ size, color, radius }: { size: number; color: string; radius: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" }}>
      <SvgXml xml={KAKAO_USER_XML} width={size * 1.1} height={size * 1.1} style={{ marginBottom: -size * 0.1 }} />
    </View>
  );
}

function KakaoGroupAvatar({ memberCount, bgCard }: { memberCount: number; bgCard: string }) {
  const count = Math.max(1, Math.min(memberCount, 4));
  const size = 72;

  if (count <= 1) return <DummyAvatar size={size} color={BG_COLORS[0]} radius={28} />;

  if (count === 2) {
    const s = 46;
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: "absolute", top: 0, left: 0 }}><DummyAvatar size={s} color={BG_COLORS[0]} radius={16} /></View>
        <View style={{ position: "absolute", bottom: 0, right: 0, borderRadius: 18, backgroundColor: bgCard, padding: 2 }}><DummyAvatar size={s} color={BG_COLORS[1]} radius={16} /></View>
      </View>
    );
  }

  if (count === 3) {
    const s = 36;
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: "absolute", top: 0, left: size / 2 - s / 2 }}><DummyAvatar size={s} color={BG_COLORS[0]} radius={12} /></View>
        <View style={{ position: "absolute", bottom: 0, left: 0 }}><DummyAvatar size={s} color={BG_COLORS[1]} radius={12} /></View>
        <View style={{ position: "absolute", bottom: 0, right: 0 }}><DummyAvatar size={s} color={BG_COLORS[2]} radius={12} /></View>
      </View>
    );
  }

  const s = 34;
  return (
    <View style={{ width: size, height: size, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignContent: "space-between" }}>
      <DummyAvatar size={s} color={BG_COLORS[0]} radius={11} />
      <DummyAvatar size={s} color={BG_COLORS[1]} radius={11} />
      <DummyAvatar size={s} color={BG_COLORS[2]} radius={11} />
      <DummyAvatar size={s} color={BG_COLORS[3]} radius={11} />
    </View>
  );
}

interface RoomMember { id: string; name: string; initial: string; me: boolean }

export default function ChatMenuScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ projectId: string; name?: string }>();
  const roomId = params.projectId;
  const roomName = params.name ?? "채팅방";

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    setMembersLoading(true);
    ChatAPI.roomMembers(roomId)
      .then((ms) => setMembers(ms.map((m) => ({
        id: m.user_id, name: m.name, initial: m.name.charAt(0), me: m.is_me,
      }))))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [roomId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setMuted(v => !v); Alert.alert("알림", muted ? "채팅방 알림을 켰어요." : "채팅방 알림을 껐어요."); }}>
            <Icon name="bell" size={22} color={muted ? C.textMuted : C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setFavorite(v => !v); Alert.alert("즐겨찾기", favorite ? "즐겨찾기에서 제거했어요." : "즐겨찾기에 추가했어요."); }}>
            <Icon name="star" size={22} color={favorite ? "#F5B301" : C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push({ pathname: "/(screens)/chat/RoomSettings", params: { roomId, name: roomName } } as any)}>
            <Icon name="settings" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* 상단 프로필 */}
        <View style={styles.topProfile}>
          <KakaoGroupAvatar memberCount={members.length || 4} bgCard={C.bgCard} />
          <Text style={[styles.roomName, { color: C.text }]}>{roomName}</Text>
        </View>

        {/* 미디어 카드 */}
        <View style={[styles.card, { backgroundColor: C.bgCard, shadowColor: C.text, padding: 0, overflow: 'hidden' }]}>
          <MenuListItem icon="photo"    label="사진/동영상" color="#2ECC71" textColor={C.text} borderColor={C.border} onPress={() => router.push({ pathname: '/(screens)/chat/ChatArchive', params: { projectId: roomId, initialTab: 'media' } })} />
          <MenuListItem icon="file"     label="파일"        color="#7F8C8D" textColor={C.text} borderColor={C.border} onPress={() => router.push({ pathname: '/(screens)/chat/ChatArchive', params: { projectId: roomId, initialTab: 'file' } })} />
          <MenuListItem icon="link"     label="링크"        color="#007AFF" textColor={C.text} borderColor={C.border} onPress={() => router.push({ pathname: '/(screens)/chat/ChatArchive', params: { projectId: roomId, initialTab: 'link' } })} />
          <MenuListItem icon="calendar" label="전체 To-Do"  color="#4FC3F7" textColor={C.text} borderColor={C.border} isLast onPress={() => router.push("/(tabs)/todos")} />
        </View>

        {/* 기능 카드 (공지/투표 각각 별개) */}
        <View style={styles.gridRow}>
          <GridItem icon="announcement" label="공지" color="#007AFF" textColor={C.text} bgCard={C.bgCard} borderColor={C.border} onPress={() => router.push({ pathname: "/(screens)/chat/ChatBoard", params: { projectId: roomId, initialTab: "notice" } } as any)} />
          <GridItem icon="vote"         label="투표" color="#9B59B6" textColor={C.text} bgCard={C.bgCard} borderColor={C.border} onPress={() => router.push({ pathname: "/(screens)/chat/ChatBoard", params: { projectId: roomId, initialTab: "poll" } } as any)} />
        </View>

        {/* 멤버 카드 */}
        <View style={[styles.card, { backgroundColor: C.bgCard, shadowColor: C.text, padding: 0, overflow: 'hidden' }]}>
          <View style={[styles.memberCardHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.memberCountText, { color: C.textSub }]}>대화상대</Text>
            <Text style={[styles.memberCountBadge, { color: C.primary }]}>{members.length}</Text>
          </View>

          {membersLoading
            ? <ActivityIndicator size="small" color={C.primary} style={{ paddingVertical: 20 }} />
            : [...members].sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0)).map((m, idx) => (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  { borderBottomColor: C.border },
                  idx === members.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <DummyAvatar size={40} color={BG_COLORS[idx % BG_COLORS.length]} radius={14} />
                <Text style={[styles.memberName, { color: C.text, flex: 1 }]}>{m.name}</Text>
                {m.me && (
                  <View style={[styles.selfBadge, { backgroundColor: C.primary + '22' }]}>
                    <Text style={[styles.selfBadgeText, { color: C.primary }]}>나</Text>
                  </View>
                )}
              </View>
            ))
          }
        </View>

        {/* 채팅방 나가기 */}
        <TouchableOpacity
          style={[styles.leaveBtn, { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}
          activeOpacity={0.7}
          onPress={() => Alert.alert(
            "채팅방 나가기",
            "채팅방을 나가면 대화 내용을 볼 수 없어요. 나가시겠어요?",
            [
              { text: "취소", style: "cancel" },
              { text: "나가기", style: "destructive", onPress: () => router.back() },
            ]
          )}
        >
          <Icon name="back" size={18} color="#fff" />
          <Text style={[styles.leaveBtnText, { color: '#fff' }]}>채팅방 나가기</Text>
        </TouchableOpacity>
      </ScrollView>

    </SafeAreaView>
  );
}

function MenuListItem({ icon, label, color, textColor, borderColor, isLast, onPress }: { icon: any, label: string, color: string, textColor: string, borderColor: string, isLast?: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.listItem, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.listIconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.itemTitle, { color: textColor, flex: 1 }]}>{label}</Text>
      <Icon name="chevron" size={16} color={borderColor} />
    </TouchableOpacity>
  );
}

function GridItem({ icon, label, color, textColor, bgCard, borderColor, onPress }: { icon: any, label: string, color: string, textColor: string, bgCard: string, borderColor: string, onPress?: () => void }) {
  return (
    <TouchableOpacity style={[styles.gridItem, { backgroundColor: bgCard, borderWidth: 1, borderColor: borderColor }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.listIconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.itemTitle, { color: textColor }]}>{label}</Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingVertical: 24,
  },
  roomName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  gridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  leaveBtn: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberCountBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  selfBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  selfBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  }
});
