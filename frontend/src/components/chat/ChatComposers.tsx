/**
 * src/components/chat/ChatComposers.tsx
 * 채팅 공지 작성 / 투표 작성 모달 (chat 상세 + 메뉴 화면 공용)
 */
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export function NoticeModal({ visible, onClose, onSubmit }: {
  visible: boolean; onClose: () => void; onSubmit: (content: string) => void;
}) {
  const C = useTheme();
  const [text, setText] = useState("");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[s.box, { backgroundColor: C.bgCard }]}>
          <Text style={[s.title, { color: C.text }]}>📣 공지 작성</Text>
          <TextInput
            style={[s.input, { color: C.text, borderColor: C.border, height: 90, textAlignVertical: "top" }]}
            placeholder="공지 내용을 입력하세요"
            placeholderTextColor={C.textMuted}
            value={text} onChangeText={setText} multiline
          />
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, { borderColor: C.border }]} onPress={() => { setText(""); onClose(); }}>
              <Text style={{ color: C.textSub, fontWeight: "600" }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: "#00A9EC", borderColor: "#00A9EC" }]}
              onPress={() => { if (text.trim()) { onSubmit(text.trim()); setText(""); } }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>등록</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PollModal({ visible, onClose, onSubmit }: {
  visible: boolean; onClose: () => void; onSubmit: (question: string, options: string[]) => void;
}) {
  const C = useTheme();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const reset = () => { setQuestion(""); setOptions(["", ""]); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[s.box, { backgroundColor: C.bgCard }]}>
          <Text style={[s.title, { color: C.text }]}>☑️ 투표 만들기</Text>
          <TextInput
            style={[s.input, { color: C.text, borderColor: C.border }]}
            placeholder="질문" placeholderTextColor={C.textMuted}
            value={question} onChangeText={setQuestion}
          />
          {options.map((opt, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TextInput
                style={[s.input, { color: C.text, borderColor: C.border, flex: 1 }]}
                placeholder={`선택지 ${i + 1}`} placeholderTextColor={C.textMuted}
                value={opt}
                onChangeText={(v) => setOptions((prev) => prev.map((o, idx) => idx === i ? v : o))}
              />
              {options.length > 2 && (
                <TouchableOpacity onPress={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Text style={{ color: C.textMuted, fontSize: 20 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={() => setOptions((prev) => [...prev, ""])}>
            <Text style={{ color: "#00A9EC", fontWeight: "600", paddingVertical: 4 }}>+ 선택지 추가</Text>
          </TouchableOpacity>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, { borderColor: C.border }]} onPress={() => { reset(); onClose(); }}>
              <Text style={{ color: C.textSub, fontWeight: "600" }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: "#00A9EC", borderColor: "#00A9EC" }]}
              onPress={() => {
                const opts = options.map((o) => o.trim()).filter(Boolean);
                if (question.trim() && opts.length >= 2) { onSubmit(question.trim(), opts); reset(); }
              }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>만들기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 28 },
  box: { borderRadius: 18, padding: 20, gap: 10 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
