/**
 * app/(screens)/friends/index.tsx — 친구 관리
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import Icon from "@/components/common/Icon";

// ── 타입 & 목 데이터 ──────────────────────────────────────────────
interface Friend {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
}

const INITIAL_FRIENDS: Friend[] = [
  { id: "f1", name: "김혜민", username: "hyemin_k",  avatarColor: "#00A9EC" },
  { id: "f2", name: "손병관", username: "bgkwan",     avatarColor: "#7C3AED" },
  { id: "f3", name: "송은상", username: "eungsang",   avatarColor: "#16A34A" },
  { id: "f4", name: "장현수", username: "jhs_dev",    avatarColor: "#F59E0B" },
];

const SEARCH_DB: Record<string, { name: string; username: string; projects: number; org: string }> = {
  ccome3:  { name: "박지민", username: "ccome3",  projects: 3, org: "중앙대학교 · 예술공학부 · 20271234" },
  dev001:  { name: "홍길동", username: "dev001",  projects: 1, org: "서울대학교 · 컴퓨터공학부 · 20201234" },
};

type Mode = "normal" | "invite" | "delete";

// ── 아이콘 ────────────────────────────────────────────────────────
function AddFriendIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M19 8v6M16 11h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function FriendsScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projects } = useProject();

  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("normal");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  // 초대 모달
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // 삭제 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 친구 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [foundUser, setFoundUser] = useState<typeof SEARCH_DB[string] | null>(null);
  const [searchError, setSearchError] = useState(false);

  const filtered = useMemo(
    () => friends.filter(f => f.name.includes(search) || f.username.includes(search)),
    [friends, search]
  );

  const selectedFriends = friends.filter(f => selectedIds.includes(f.id));

  const selectionTitle = () => {
    if (selectedFriends.length === 0) return "";
    if (selectedFriends.length === 1) return selectedFriends[0].name;
    return `${selectedFriends[0].name} 외 ${selectedFriends.length - 1}명`;
  };

  const resetMode = () => {
    setMode("normal");
    setSelectedIds([]);
    setShowMenu(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleMenuOption = (opt: "invite" | "delete") => {
    setShowMenu(false);
    setMode(opt);
    setSelectedIds([]);
  };

  const handleDeleteConfirm = () => {
    setFriends(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setShowDeleteModal(false);
    resetMode();
  };

  const handleInviteConfirm = () => {
    setShowInviteModal(false);
    resetMode();
    setSelectedProjectId(null);
  };

  const handleRemoveSingle = (id: string) => {
    setSelectedIds([id]);
    setShowDeleteModal(true);
  };

  const handleAddSearch = () => {
    const found = SEARCH_DB[addInput.trim()];
    if (found) { setFoundUser(found); setSearchError(false); }
    else { setFoundUser(null); setSearchError(!!addInput.trim()); }
  };

  const handleAddFriend = () => {
    if (!foundUser) return;
    const newFriend: Friend = {
      id: `f${Date.now()}`,
      name: foundUser.name,
      username: foundUser.username,
      avatarColor: "#00A9EC",
    };
    setFriends(prev => [...prev, newFriend]);
    setShowAddModal(false);
    setAddInput("");
    setFoundUser(null);
    setSearchError(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top", "bottom"]}>

      {/* ── 헤더 ── */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => { resetMode(); router.back(); }}
          style={s.iconBtn} activeOpacity={0.7}
        >
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: C.text }]}>
          친구 관리 · {friends.length}
        </Text>

        <View style={s.headerRight}>
          {mode !== "normal" ? (
            <TouchableOpacity onPress={resetMode} style={s.iconBtn} activeOpacity={0.7}>
              <Icon name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setShowMenu(v => !v)}
                style={s.iconBtn} activeOpacity={0.7}
              >
                <Icon name="option" size={22} color={C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowAddModal(true); setAddInput(""); setFoundUser(null); setSearchError(false); }}
                style={s.iconBtn} activeOpacity={0.7}
              >
                <Icon name="add" size={22} color={C.textSub} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── 드롭다운 메뉴 ── */}
      {showMenu && (
        <>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowMenu(false)} />
          <View style={[s.dropdown, { backgroundColor: C.bgCard, borderColor: C.border, shadowColor: "#000" }]}>
            <TouchableOpacity
              onPress={() => handleMenuOption("invite")}
              style={[s.dropdownItem, { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              activeOpacity={0.7}
            >
              <Text style={[s.dropdownText, { color: C.text }]}>프로젝트에 초대</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMenuOption("delete")}
              style={s.dropdownItem}
              activeOpacity={0.7}
            >
              <Text style={[s.dropdownText, { color: "#EF4444" }]}>친구 삭제</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── 검색창 ── */}
      <View style={[s.searchWrap, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <View style={[s.searchBar, { backgroundColor: C.bg, borderColor: C.border }]}>
          <Icon name="search" size={16} color={C.textMuted} />
          <TextInput
            style={[s.searchInput, { color: C.text }]}
            placeholder="이름, 아이디 검색"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* ── 친구 목록 ── */}
      <ScrollView style={{ flex: 1 }}>
        {filtered.map(friend => {
          const selected = selectedIds.includes(friend.id);
          return (
            <TouchableOpacity
              key={friend.id}
              onPress={() => mode !== "normal" && toggleSelect(friend.id)}
              activeOpacity={mode !== "normal" ? 0.7 : 1}
              style={[
                s.friendRow,
                { borderBottomColor: C.border },
                selected && { backgroundColor: C.primary + "0D" },
              ]}
            >
              {/* 아바타 */}
              <View style={[s.friendAvatar, { backgroundColor: friend.avatarColor }]}>
                <Text style={s.friendAvatarText}>{friend.name.charAt(0)}</Text>
              </View>

              {/* 이름 */}
              <Text style={[s.friendName, { color: C.text }]}>{friend.name}</Text>

              {/* 오른쪽 */}
              {mode === "normal" ? (
                <View style={s.friendActions}>
                  <TouchableOpacity
                    onPress={() => { setMode("invite"); setSelectedIds([friend.id]); }}
                    style={s.friendActionBtn}
                    activeOpacity={0.7}
                  >
                    <AddFriendIcon color={C.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveSingle(friend.id)}
                    style={s.friendActionBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="close" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[s.checkCircle, { borderColor: selected ? C.primary : C.border }, selected && { backgroundColor: C.primary }]}>
                  {selected && <CheckIcon />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 선택 모드 액션 바 ── */}
      {mode !== "normal" && selectedIds.length > 0 && (
        <View style={[s.actionBar, { backgroundColor: C.bgCard, borderTopColor: C.border }]}>
          <Text style={[s.actionBarLabel, { color: C.text }]} numberOfLines={1}>
            {selectionTitle()} · {mode === "invite" ? "초대" : "삭제"}
          </Text>
          <TouchableOpacity
            style={[s.actionBarBtn, { backgroundColor: mode === "delete" ? "#EF4444" : C.primary }]}
            activeOpacity={0.85}
            onPress={() => mode === "invite" ? setShowInviteModal(true) : setShowDeleteModal(true)}
          >
            <Text style={s.actionBarBtnText}>
              {mode === "invite" ? "초대하기" : "삭제하기"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 프로젝트 초대 모달 ── */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowInviteModal(false)} />
          <View style={[s.modalSheet, { backgroundColor: C.bgCard }]}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[s.modalTitle, { color: C.text }]}>{selectionTitle()} · 초대</Text>

            <ScrollView style={{ maxHeight: 300 }} bounces={false}>
              {projects.map(proj => (
                <TouchableOpacity
                  key={proj.id}
                  onPress={() => setSelectedProjectId(proj.id)}
                  activeOpacity={0.7}
                  style={[s.projectRow, { borderBottomColor: C.border }]}
                >
                  <Text style={s.projectEmoji}>{proj.emoji}</Text>
                  <Text style={[s.projectName, { color: C.text }]} numberOfLines={1}>{proj.name}</Text>
                  <View style={[
                    s.projectCheck,
                    { borderColor: selectedProjectId === proj.id ? C.primary : C.border },
                    selectedProjectId === proj.id && { backgroundColor: C.primary },
                  ]}>
                    {selectedProjectId === proj.id && <CheckIcon />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[s.modalBtns, { borderTopColor: C.border }]}>
              <TouchableOpacity
                onPress={() => { setShowInviteModal(false); setSelectedProjectId(null); }}
                style={[s.modalBtnCancel, { borderColor: C.border }]}
                activeOpacity={0.7}
              >
                <Text style={[s.modalBtnCancelText, { color: C.textSub }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInviteConfirm}
                style={[s.modalBtnConfirm, { backgroundColor: selectedProjectId ? C.primary : C.border }]}
                activeOpacity={0.85}
              >
                <Text style={s.modalBtnConfirmText}>초대하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 친구 삭제 확인 모달 ── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowDeleteModal(false)} />
          <View style={[s.modalSheet, { backgroundColor: C.bgCard }]}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[s.modalTitle, { color: C.text }]}>{selectionTitle()} · 삭제</Text>
            <Text style={[s.modalBody, { color: C.textSub }]}>친구를 삭제하시겠습니까?</Text>
            <View style={[s.modalBtns, { borderTopColor: C.border }]}>
              <TouchableOpacity
                onPress={() => { setShowDeleteModal(false); setSelectedIds([]); }}
                style={[s.modalBtnCancel, { borderColor: C.border }]}
                activeOpacity={0.7}
              >
                <Text style={[s.modalBtnCancelText, { color: C.textSub }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={[s.modalBtnConfirm, { backgroundColor: "#EF4444" }]}
                activeOpacity={0.85}
              >
                <Text style={s.modalBtnConfirmText}>삭제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 친구 추가 모달 ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowAddModal(false)} />
          <View style={[s.modalSheet, { backgroundColor: C.bgCard }]}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[s.modalTitle, { color: C.text }]}>+ 친구 추가</Text>

            <View style={[s.addInputWrap, { borderColor: searchError ? "#EF4444" : C.border }]}>
              <TextInput
                style={[s.addInput, { color: C.text }]}
                placeholder="아이디를 입력하세요."
                placeholderTextColor={C.textMuted}
                value={addInput}
                onChangeText={text => { setAddInput(text); setSearchError(false); setFoundUser(null); }}
                onSubmitEditing={handleAddSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {searchError && (
              <Text style={s.searchErrorText}>아이디를 찾을 수 없습니다.</Text>
            )}

            {foundUser && (
              <View style={[s.foundCard, { backgroundColor: C.bg, borderColor: C.primary }]}>
                <View style={[s.foundAvatar, { backgroundColor: C.primary }]}>
                  <Text style={s.foundAvatarText}>{foundUser.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[s.foundName, { color: C.text }]}>{foundUser.name}</Text>
                    <Text style={[s.foundUsername, { color: C.textMuted }]}>@{foundUser.username}</Text>
                  </View>
                  <View style={[s.foundBadge, { backgroundColor: C.primary + "20" }]}>
                    <Text style={[s.foundBadgeText, { color: C.primary }]}>{foundUser.projects}개 프로젝트 참여중</Text>
                  </View>
                  <Text style={[s.foundOrg, { color: C.textMuted }]}>{foundUser.org}</Text>
                </View>
              </View>
            )}

            <View style={[s.modalBtns, { borderTopColor: C.border }]}>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); setAddInput(""); setFoundUser(null); setSearchError(false); }}
                style={[s.modalBtnCancel, { borderColor: C.border }]}
                activeOpacity={0.7}
              >
                <Text style={[s.modalBtnCancelText, { color: C.textSub }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={foundUser ? handleAddFriend : handleAddSearch}
                style={[s.modalBtnConfirm, { backgroundColor: C.primary }]}
                activeOpacity={0.85}
              >
                <Text style={s.modalBtnConfirmText}>{foundUser ? "추가하기" : "검색"}</Text>
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

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  // 드롭다운
  dropdown: {
    position: "absolute",
    top: 64,
    right: 12,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 160,
  },
  dropdownItem: { paddingHorizontal: 18, paddingVertical: 14 },
  dropdownText: { fontSize: 15, fontWeight: "500" },

  // 검색창
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // 친구 행
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  friendAvatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  friendName: { flex: 1, fontSize: 15, fontWeight: "600" },
  friendActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  friendActionBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // 액션 바
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  actionBarLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  actionBarBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  actionBarBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // 모달 공통
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalBody: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 22,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnCancelText: { fontSize: 15, fontWeight: "600" },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // 프로젝트 초대 모달
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  projectEmoji: { fontSize: 22 },
  projectName: { flex: 1, fontSize: 14, fontWeight: "500" },
  projectCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // 친구 추가 모달
  addInputWrap: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  addInput: { fontSize: 15 },
  searchErrorText: {
    color: "#EF4444",
    fontSize: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  foundCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  foundAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  foundAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  foundName: { fontSize: 15, fontWeight: "700" },
  foundUsername: { fontSize: 13 },
  foundBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  foundBadgeText: { fontSize: 11, fontWeight: "600" },
  foundOrg: { fontSize: 12 },
});
