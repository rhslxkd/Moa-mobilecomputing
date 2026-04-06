import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { SvgXml } from "react-native-svg";

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

const FRIENDS_DATA = [
  { title: "즐겨찾기", data: [{ id: 'f1', name: '박지민', color: '#A1C4DF' }] },
  {
    title: "친구", data: [
      { id: 'f2', name: '이지은', color: '#99BCCC' },
      { id: 'f3', name: '강민서', color: '#A9B3D6' },
      { id: 'f4', name: '강지우', color: '#B9B2D8' },
      { id: 'f5', name: '정민수', color: '#A1C4DF' },
      { id: 'f6', name: '김철수', color: '#99BCCC' },
      { id: 'f7', name: '강승윤', color: '#A9B3D6' },
    ]
  },
];

export default function AddChatScreen() {
  const C = useTheme();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  const goBack = () => router.back();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bgCard }} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.modalHeader, { borderBottomColor: C.border, backgroundColor: C.bgCard }]}>
        <TouchableOpacity onPress={goBack} style={styles.modalIconBtn}>
          <Icon name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.modalHeaderTitle, { color: C.text }]}>대화상대 선택</Text>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={goBack}
        >
          <Text style={{ color: selectedIds.length > 0 ? C.primary : C.textSub, fontWeight: '700' }}>
            {selectedIds.length > 0 && `${selectedIds.length} `}확인
          </Text>
        </TouchableOpacity>
      </View>

      {/* 선택된 사용자 목록 (가로 스크롤) */}
      {selectedIds.length > 0 && (
        <View style={{ height: 90, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {selectedIds.map(id => {
              const friend = FRIENDS_DATA.flatMap(s => s.data).find(f => f.id === id);
              return (
                <View key={id} style={{ alignItems: 'center', width: 60 }}>
                  <View style={{ position: 'relative' }}>
                    <DummyAvatar size={50} color={friend?.color || '#ccc'} radius={20} />
                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={() => setSelectedIds(prev => prev.filter(i => i !== id))}
                    >
                      <Icon name="close" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 11, color: C.text, marginTop: 4 }} numberOfLines={1}>{friend?.name}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 검색 바 */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <View style={[styles.searchBox, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={{ position: 'absolute', left: 14 }}>
            <Icon name="search" size={18} color={C.textMuted} />
          </View>
          <TextInput
            placeholder="이름(초성), 전화번호 검색"
            placeholderTextColor={C.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            style={{ flex: 1, paddingVertical: 10, paddingLeft: 42, paddingRight: 16, fontSize: 15, color: C.text }}
          />
        </View>
      </View>

      {/* 친구 목록 (SectionList) */}
      <SectionList
        sections={FRIENDS_DATA}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ backgroundColor: C.bg, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: C.textMuted }}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={styles.friendItem}
              activeOpacity={0.6}
              onPress={() => {
                setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
              }}
            >
              <DummyAvatar size={48} color={item.color} radius={18} />
              <Text style={[styles.friendName, { color: C.text }]}>{item.name}</Text>
              <View style={[
                styles.checkCircle,
                {
                  borderColor: isSelected ? '#FAE100' : C.border,
                  backgroundColor: isSelected ? '#FAE100' : 'transparent'
                }
              ]}>
                {isSelected && <Icon name="checkbox" size={16} active color="#000" />}
              </View>
            </TouchableOpacity>
          );
        }}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  modalIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700' },
  confirmBtn: { paddingHorizontal: 12 },
  searchBox: {
    height: 44,
    borderRadius: 8,
    borderWidth: 0.5,
    justifyContent: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  friendName: { flex: 1, marginLeft: 14, fontSize: 16, fontWeight: '500' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  }
});
