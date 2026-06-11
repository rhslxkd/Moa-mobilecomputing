import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SectionList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { SvgXml } from "react-native-svg";
import { FriendsAPI, FriendDTO, ChatAPI } from "@/services/api";

const KAKAO_USER_XML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="9.5" r="4" fill="white"/>
  <path d="M4 24C4 19 7.5 15.5 12 15.5C16.5 15.5 20 19 20 24Z" fill="white"/>
</svg>`;

const COLORS = ["#A1C4DF", "#99BCCC", "#A9B3D6", "#B9B2D8", "#00A9EC", "#7C3AED"];
const colorFor = (s: string) =>
  COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function DummyAvatar({ size, color, radius }: { size: number; color: string; radius: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" }}>
      <SvgXml xml={KAKAO_USER_XML} width={size * 1.1} height={size * 1.1} style={{ marginBottom: -size * 0.1 }} />
    </View>
  );
}

export default function AddChatScreen() {
  const C = useTheme();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendDTO[]>([]);
  const [searchText, setSearchText] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    FriendsAPI.list().then(setFriends).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const startChat = async (friend: FriendDTO) => {
    if (busy) return;
    setBusy(true);
    try {
      const room = await ChatAPI.createDirect(friend.user_id);
      router.replace({ pathname: `/(screens)/chat/${room.id}`, params: { name: room.name } } as any);
    } catch {
      setBusy(false);
    }
  };

  const filtered = friends.filter(
    (f) => f.name.includes(searchText) || f.username.includes(searchText)
  );
  const sections = [{ title: "친구", data: filtered }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bgCard }} edges={["top"]}>
      {/* 헤더 */}
      <View style={[styles.modalHeader, { borderBottomColor: C.border, backgroundColor: C.bgCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.modalIconBtn}>
          <Icon name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.modalHeaderTitle, { color: C.text }]}>대화상대 선택</Text>
        <View style={styles.modalIconBtn} />
      </View>

      {/* 검색 바 */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <View style={[styles.searchBox, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={{ position: "absolute", left: 14 }}>
            <Icon name="search" size={18} color={C.textMuted} />
          </View>
          <TextInput
            placeholder="이름, 아이디 검색"
            placeholderTextColor={C.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            style={{ flex: 1, paddingVertical: 10, paddingLeft: 42, paddingRight: 16, fontSize: 15, color: C.text }}
          />
        </View>
      </View>

      {/* 친구 목록 */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.friendship_id}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ backgroundColor: C.bg, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: C.textMuted }}>{title} {filtered.length}</Text>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>불러오는 중...</Text>
            </View>
          ) : (
            <Text style={{ textAlign: "center", color: C.textMuted, marginTop: 40, fontSize: 14 }}>
              친구가 없어요. 먼저 친구를 추가해보세요.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendItem}
            activeOpacity={0.6}
            onPress={() => startChat(item)}
            disabled={busy}
          >
            <DummyAvatar size={48} color={colorFor(item.username)} radius={18} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.friendName, { color: C.text }]}>{item.name}</Text>
              <Text style={{ fontSize: 13, color: C.textMuted }}>@{item.username}</Text>
            </View>
            <Icon name="chat" size={20} color={C.primary} />
          </TouchableOpacity>
        )}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  modalIconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  modalHeaderTitle: { fontSize: 17, fontWeight: "700" },
  searchBox: { height: 44, borderRadius: 8, borderWidth: 0.5, justifyContent: "center" },
  friendItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  friendName: { fontSize: 16, fontWeight: "500" },
});
