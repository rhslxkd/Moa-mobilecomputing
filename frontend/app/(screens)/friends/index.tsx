/**
 * app/(screens)/friends/index.tsx — 친구 관리
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/common/Icon";
import QRCode from "react-native-qrcode-svg";
import { FriendsAPI, UserSearchDTO, FriendRequestDTO, MemberAPI } from "@/services/api";

// ── 타입 ──────────────────────────────────────────────────────────
interface Friend {
  id: string;        // friendship_id
  userId: string;
  name: string;
  username: string;
  avatarColor: string;
}

const AVATAR_COLORS = ["#00A9EC", "#7C3AED", "#16A34A", "#F59E0B", "#DC2626", "#0891B2"];
const colorFor = (s: string) =>
  AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

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
  const { user } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrTab, setQrTab] = useState<"my" | "scan">("my");

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestDTO[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("normal");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuBtnY, setMenuBtnY] = useState(64);
  const [menuBtnX, setMenuBtnX] = useState(0);

  const loadFriends = useCallback(() => {
    FriendsAPI.list()
      .then((ds) => setFriends(ds.map((d) => ({
        id: d.friendship_id,
        userId: d.user_id,
        name: d.name,
        username: d.username,
        avatarColor: colorFor(d.username),
      }))))
      .catch(() => {});
    FriendsAPI.requests().then(setRequests).catch(() => {});
  }, []);

  useFocusEffect(loadFriends);

  // 초대 모달
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // 삭제 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 친구 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [foundUser, setFoundUser] = useState<UserSearchDTO | null>(null);
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

  const handleDeleteConfirm = async () => {
    await Promise.all(selectedIds.map((id) => FriendsAPI.remove(id).catch(() => {})));
    setFriends(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setShowDeleteModal(false);
    resetMode();
  };

  const handleAccept = async (friendshipId: string) => {
    await FriendsAPI.accept(friendshipId).catch(() => {});
    setRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
    loadFriends();
  };

  const handleReject = async (friendshipId: string) => {
    await FriendsAPI.remove(friendshipId).catch(() => {});
    setRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
  };

  const handleInviteConfirm = async () => {
    if (!selectedProjectId) { Alert.alert("프로젝트 선택", "초대할 프로젝트를 선택해주세요."); return; }
    const targets = friends.filter(f => selectedIds.includes(f.id));
    try {
      await Promise.all(targets.map(f =>
        MemberAPI.add(selectedProjectId, { name: f.name, roles: ["팀원"], user_id: f.userId })
      ));
      Alert.alert("초대 완료", `${targets.length}명에게 프로젝트 초대를 보냈어요.`);
    } catch (e: any) {
      Alert.alert("초대 실패", e?.message ?? "초대에 실패했어요.");
    }
    setShowInviteModal(false);
    resetMode();
    setSelectedProjectId(null);
  };

  const handleRemoveSingle = (id: string) => {
    setSelectedIds([id]);
    setShowDeleteModal(true);
  };

  const handleAddSearch = async () => {
    const q = addInput.trim();
    if (!q) return;
    try {
      const u = await FriendsAPI.search(q);
      setFoundUser(u);
      setSearchError(false);
    } catch {
      setFoundUser(null);
      setSearchError(true);
    }
  };

  const handleAddFriend = async () => {
    if (!foundUser) return;
    try {
      await FriendsAPI.request(foundUser.username);
      Alert.alert("요청 완료", `${foundUser.name}님에게 친구 요청을 보냈어요.`);
    } catch (e: any) {
      Alert.alert("요청 실패", e?.message ?? "친구 요청에 실패했어요.");
    }
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
                onPress={() => { setQrTab("my"); setShowQRModal(true); }}
                style={s.iconBtn} activeOpacity={0.7}
              >
                <Text style={{ color: C.textSub, fontSize: 12, fontWeight: "800" }}>QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMenu(v => !v)}
                style={s.iconBtn} activeOpacity={0.7}
                onLayout={e => {
                  e.target.measure((_x, _y, _w, h, _px, py) => {
                    setMenuBtnY(py + h);
                    setMenuBtnX(_px + _w);
                  });
                }}
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
          <View style={[s.dropdown, { backgroundColor: C.bgCard, borderColor: C.border, shadowColor: "#000", top: menuBtnY + 4, right: Dimensions.get("window").width - menuBtnX }]}>
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
        {/* 받은 친구 요청 */}
        {mode === "normal" && requests.length > 0 && (
          <View style={[s.requestSection, { borderBottomColor: C.border }]}>
            <Text style={[s.requestSectionTitle, { color: C.textMuted }]}>
              받은 친구 요청 {requests.length}
            </Text>
            {requests.map((r) => (
              <View key={r.friendship_id} style={s.requestRow}>
                <View style={[s.friendAvatar, { backgroundColor: colorFor(r.username) }]}>
                  <Text style={s.friendAvatarText}>{r.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.friendName, { color: C.text }]}>{r.name}</Text>
                  <Text style={[s.foundUsername, { color: C.textMuted }]}>@{r.username}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAccept(r.friendship_id)}
                  style={[s.reqAcceptBtn, { backgroundColor: C.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={s.reqAcceptText}>수락</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleReject(r.friendship_id)}
                  style={[s.reqRejectBtn, { borderColor: C.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.reqRejectText, { color: C.textMuted }]}>거절</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
                <Text style={s.modalBtnConfirmText}>{foundUser ? "요청 보내기" : "검색"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── QR 모달 (내 QR / 스캔) ── */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <TouchableOpacity
          style={s.qrModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowQRModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[s.qrModalCard, { backgroundColor: C.bgCard }]}>
            {/* 탭 */}
            <View style={[s.qrTabBar, { backgroundColor: C.bg, borderColor: C.border }]}>
              <TouchableOpacity
                style={[s.qrTab, qrTab === "my" && { backgroundColor: C.bgCard }]}
                onPress={() => setQrTab("my")}
                activeOpacity={0.8}
              >
                <Text style={[s.qrTabText, { color: qrTab === "my" ? C.primary : C.textMuted, fontWeight: qrTab === "my" ? "700" : "500" }]}>
                  내 QR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.qrTab, qrTab === "scan" && { backgroundColor: C.bgCard }]}
                onPress={() => setQrTab("scan")}
                activeOpacity={0.8}
              >
                <Text style={[s.qrTabText, { color: qrTab === "scan" ? C.primary : C.textMuted, fontWeight: qrTab === "scan" ? "700" : "500" }]}>
                  스캔하기
                </Text>
              </TouchableOpacity>
            </View>

            {qrTab === "my" ? (
              /* ── 내 QR ── */
              <>
                <Text style={[s.qrModalSub, { color: C.textMuted, marginTop: 16 }]}>
                  친구가 이 코드를 스캔하면 친구 요청이 와요
                </Text>
                <View style={s.qrBox}>
                  {user?.username ? (
                    <QRCode value={user.username} size={188} />
                  ) : (
                    <Text style={{ color: C.textMuted }}>로그인이 필요해요</Text>
                  )}
                </View>
                <Text style={[s.qrModalUsername, { color: C.text }]}>@{user?.username ?? ""}</Text>
              </>
            ) : (
              /* ── 스캔하기 ── */
              <>
                <Text style={[s.qrModalSub, { color: C.textMuted, marginTop: 16 }]}>
                  친구의 QR 코드를 스캔해서 친구 요청을 보내요
                </Text>
                <TouchableOpacity
                  style={[s.qrScanBtn, { borderColor: C.border, backgroundColor: C.bg }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowQRModal(false);
                    router.push("/(screens)/qr/scan" as any);
                  }}
                >
                  <View style={s.qrScanIconWrap}>
                    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                      <Path d="M3 7V5a2 2 0 0 1 2-2h2" stroke={C.primary} strokeWidth={1.8} strokeLinecap="round" />
                      <Path d="M17 3h2a2 2 0 0 1 2 2v2" stroke={C.primary} strokeWidth={1.8} strokeLinecap="round" />
                      <Path d="M21 17v2a2 2 0 0 1-2 2h-2" stroke={C.primary} strokeWidth={1.8} strokeLinecap="round" />
                      <Path d="M7 21H5a2 2 0 0 1-2-2v-2" stroke={C.primary} strokeWidth={1.8} strokeLinecap="round" />
                      <Path d="M3 12h18" stroke={C.primary} strokeWidth={1.8} strokeLinecap="round" />
                    </Svg>
                  </View>
                  <Text style={[s.qrScanBtnLabel, { color: C.text }]}>카메라로 QR 스캔</Text>
                  <Text style={[s.qrScanBtnSub, { color: C.textMuted }]}>친구의 QR 코드를 카메라로 인식해요</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => setShowQRModal(false)}
              style={[s.qrModalClose, { backgroundColor: C.primary }]}
              activeOpacity={0.85}
            >
              <Text style={s.qrModalCloseText}>닫기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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

  // 받은 친구 요청
  requestSection: { paddingVertical: 8, borderBottomWidth: 6, borderBottomColor: "#F1F5F9" },
  requestSectionTitle: { fontSize: 12, fontWeight: "600", paddingHorizontal: 20, paddingVertical: 8 },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  reqAcceptBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  reqAcceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  reqRejectBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  reqRejectText: { fontSize: 13, fontWeight: "600" },

  // QR 모달
  qrModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 },
  qrModalCard: { width: "100%", borderRadius: 20, paddingBottom: 24, alignItems: "center", overflow: "hidden" },
  qrModalSub: { fontSize: 13, textAlign: "center", paddingHorizontal: 24, marginBottom: 4 },
  qrBox: { padding: 16, backgroundColor: "#fff", borderRadius: 16, marginVertical: 12 },
  qrModalUsername: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  qrModalClose: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40, marginTop: 8, alignSelf: "stretch", marginHorizontal: 24, alignItems: "center" },
  qrModalCloseText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // QR 탭
  qrTabBar: { flexDirection: "row", alignSelf: "stretch", borderRadius: 10, margin: 16, marginBottom: 0, padding: 3, borderWidth: 1 },
  qrTab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  qrTabText: { fontSize: 14 },

  // 스캔 버튼
  qrScanBtn: {
    alignSelf: "stretch",
    marginHorizontal: 24,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  qrScanIconWrap: { marginBottom: 4 },
  qrScanBtnLabel: { fontSize: 16, fontWeight: "700" },
  qrScanBtnSub: { fontSize: 13 },
});
