/**
 * app/(screens)/chat/RoomSettings.tsx
 * 채팅방 설정 — 이름 수정 / 채팅창 꾸미기(배경) / 방 떠나기
 */
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { ChatAPI } from "@/services/api";
import { WALLPAPER_PRESETS, getWallpaper, setWallpaper } from "@/lib/chatWallpaper";

export default function RoomSettingsScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId: string; name?: string }>();
  const roomId = params.roomId;

  const [name, setName] = useState(params.name ?? "채팅방");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(params.name ?? "");
  const [wallpaper, setWall] = useState<string | null>(null);

  useEffect(() => {
    if (roomId) getWallpaper(roomId).then(setWall);
  }, [roomId]);

  const handleRename = async () => {
    if (!roomId) return;
    const newName = editName.trim();
    setEditOpen(false);
    try {
      const room = await ChatAPI.renameRoom(roomId, newName);
      setName(room.name);
    } catch (e: any) {
      Alert.alert("이름 변경 실패", e?.message ?? "변경할 수 없어요.");
    }
  };

  const pickWallpaper = async (color: string | null) => {
    if (!roomId) return;
    setWall(color);
    await setWallpaper(roomId, color);
  };

  const handleLeave = () => {
    Alert.alert("채팅방 나가기", "이 채팅방을 나갈까요? 대화 내용이 사라질 수 있어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기", style: "destructive",
        onPress: async () => {
          try {
            await ChatAPI.leaveRoom(roomId);
            router.replace("/(tabs)/chat");
          } catch (e: any) {
            Alert.alert("실패", e?.message ?? "나갈 수 없어요.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Icon name="back" size={22} color={C.text} /></TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]}>채팅방 설정</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* 톡방 이름 */}
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textMuted }]}>채팅방 이름</Text>
          <View style={s.rowBetween}>
            <Text style={[s.value, { color: C.text }]} numberOfLines={1}>{name}</Text>
            <TouchableOpacity onPress={() => { setEditName(name); setEditOpen(true); }} style={[s.editBtn, { borderColor: C.border }]}>
              <Text style={[s.editText, { color: C.text }]}>수정</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 채팅창 꾸미기 */}
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textMuted }]}>채팅창 꾸미기 (배경)</Text>
          <View style={s.swatchRow}>
            {WALLPAPER_PRESETS.map((w) => {
              const selected = wallpaper === w.color;
              return (
                <TouchableOpacity
                  key={w.label}
                  activeOpacity={0.8}
                  onPress={() => pickWallpaper(w.color)}
                  style={[
                    s.swatch,
                    { backgroundColor: w.color ?? C.bgMuted, borderColor: selected ? C.primary : C.border, borderWidth: selected ? 3 : 1 },
                  ]}
                >
                  {!w.color && <Text style={{ fontSize: 10, color: C.textMuted }}>기본</Text>}
                  {selected && w.color && <Text style={{ color: "#00A9EC", fontWeight: "900" }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.hint, { color: C.textMuted }]}>채팅방에 들어가면 선택한 배경이 적용돼요.</Text>
        </View>

        {/* 방 떠나기 */}
        <TouchableOpacity style={[s.leaveBtn, { backgroundColor: "#EF4444" }]} onPress={handleLeave} activeOpacity={0.85}>
          <Text style={s.leaveText}>채팅방 나가기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 이름 수정 모달 */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={s.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setEditOpen(false)} />
          <View style={[s.modalBox, { backgroundColor: C.bgCard }]}>
            <Text style={[s.modalTitle, { color: C.text }]}>채팅방 이름</Text>
            <TextInput
              style={[s.input, { color: C.text, borderColor: C.border }]}
              value={editName} onChangeText={setEditName}
              placeholder="이름 (비우면 기본 이름)" placeholderTextColor={C.textMuted}
              autoFocus
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, { borderColor: C.border }]} onPress={() => setEditOpen(false)}>
                <Text style={{ color: C.textSub, fontWeight: "600" }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={handleRename}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  label: { fontSize: 12, fontWeight: "600" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  value: { fontSize: 16, fontWeight: "700", flex: 1 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  editText: { fontSize: 13, fontWeight: "600" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 12 },
  leaveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  leaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 28 },
  modalBox: { borderRadius: 18, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  modalBtnRow: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
