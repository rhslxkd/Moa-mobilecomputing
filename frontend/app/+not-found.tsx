/**
 * app/+not-found.tsx
 * 존재하지 않는 경로 진입 시 표시되는 화면
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

export default function NotFoundScreen() {
  const C = useTheme();
  const router = useRouter();
  return (
    <View style={[s.wrap, { backgroundColor: C.bg }]}>
      <Text style={[s.title, { color: C.text }]}>페이지를 찾을 수 없어요</Text>
      <Text style={[s.desc, { color: C.textMuted }]}>요청하신 화면이 존재하지 않습니다.</Text>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: C.primary }]}
        activeOpacity={0.85}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={s.btnText}>홈으로 가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 18, fontWeight: "700" },
  desc: { fontSize: 14, textAlign: "center" },
  btn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
