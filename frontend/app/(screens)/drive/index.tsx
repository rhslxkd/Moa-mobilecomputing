/**
 * app/(screens)/drive/index.tsx
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Svg, { Path, G } from "react-native-svg";
import { FOLDER_PALETTE, loadAllFolderColors, saveFolderColor, getFolderColor } from "@/utils/folderColors";
import { BlurView } from "expo-blur";
import { useTheme, useIsDark } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";
import { DriveAPI } from "@/services/api";

const { width: SW } = Dimensions.get("window");
const H_PAD = 21;
const COL = 3;
const COL_GAP = 0;
const ITEM_W = Math.floor((SW - H_PAD * 2) / COL);

// ── 폴더 SVG 아이콘 ────────────────────────────────────────
function FolderSvg({ color, size = 92 }: { color: string; size?: number }) {
  const h = size * (77.214 / 92);
  return (
    <Svg width={size} height={h} viewBox="0 0 92 77.214" fill="none">
      <Path
        d="M0 12C0 5.373 5.373 0 12 0H36.686C39.338 0 41.882 1.054 43.757 2.929L48.243 7.414C50.118 9.289 52.662 10.343 55.314 10.343H80C86.627 10.343 92 15.716 92 22.343V65.214C92 71.841 86.627 77.214 80 77.214H12C5.373 77.214 0 71.841 0 65.214V12Z"
        fill={color}
      />
      <Path
        d="M0 28C0 24.686 2.686 22 6 22H86C89.314 22 92 24.686 92 28V65.214C92 71.841 86.627 77.214 80 77.214H12C5.373 77.214 0 71.841 0 65.214V28Z"
        fill={color}
        opacity={0.75}
      />
    </Svg>
  );
}

// ── 아이콘 모음 ─────────────────────────────────────────────
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21L16.514 16.506M19 11C19 15.418 15.418 19 11 19C6.582 19 3 15.418 3 11C3 6.582 6.582 3 11 3C15.418 3 19 6.582 19 11Z" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function ExportIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function GridIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M1 1h6v6H1zM11 1h6v6h-6zM1 11h6v6H1zM11 11h6v6h-6z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ListIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M6 4.5h10M6 9h10M6 13.5h10M2 4.5h.01M2 9h.01M2 13.5h.01" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function FilterIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 17.64L15.5 17.64V17.64H15ZM14.658 18.114L14.816 18.589L14.816 18.589L14.658 18.114ZM9.658 19.78L9.5 19.306L9.5 19.306L9.658 19.78ZM9 19.307H8.5V19.307L9 19.307ZM8.707 11.707L9.061 11.354L8.707 11.707ZM15.293 11.707L14.939 11.354L15.293 11.707ZM19.707 7.293L20.061 7.646L19.707 7.293ZM4.293 7.293L4.646 6.939L4.293 7.293ZM5 5.586V5H4.5V5.586H5ZM19 5H19.5V5H19ZM20 5.586H19.5V5.586H20ZM14.5 12.414V17.64H15.5V12.414H14.5ZM14.658 18.114L9.658 19.78L9.816 20.254L14.816 18.589L14.658 18.114ZM9 19.307V12.414H8.5V19.307H9ZM8.354 12.061L3.939 7.646L3.232 8.354L7.646 12.768L8.354 12.061ZM4.5 5.586V5H3.5V5.586H4.5ZM5 4.5H19V3.5H5V4.5ZM19.5 5V5.586H20.5V5H19.5ZM20.061 7.646L15.646 12.061L16.354 12.768L20.768 8.354L20.061 7.646ZM15.293 11.707L14.939 11.354C14.658 11.635 14.5 12.016 14.5 12.414H15.5C15.5 12.281 15.553 12.154 15.646 12.061L15.293 11.707ZM20.061 7.646L20.414 7.293C20.695 7.012 20.5 6.793 20.5 6.586H19.5C19.5 6.719 19.447 6.846 19.354 6.939L19.707 7.293L20.061 7.646ZM4.646 6.939L4.293 7.293C4.146 7.44 4.5 6.719 4.5 6.586H3.5C3.5 6.984 3.658 7.365 3.939 7.646L4.646 6.939ZM3.5 5.586C3.5 5.719 3.447 5.846 3.354 5.939L4.061 6.646C4.342 6.365 4.5 5.984 4.5 5.586H3.5ZM19.354 5.939C19.447 5.846 19.5 5.719 19.5 5.586H20.5C20.5 5.984 20.342 6.365 20.061 6.646L19.354 5.939Z" fill={color} />
    </Svg>
  );
}
function DownloadIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 새 폴더 바텀시트 ────────────────────────────────────────
interface NewFolderSheetProps {
  visible: boolean;
  type: "project" | "personal";
  onClose: () => void;
  onConfirm: (name: string) => void;
}
function NewFolderSheet({ visible, type, onClose, onConfirm }: NewFolderSheetProps) {
  const C = useTheme();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const hasError = touched && !name.trim();

  const handleConfirm = () => {
    setTouched(true);
    if (!name.trim()) return;
    onConfirm(name.trim());
    setName(""); setTouched(false); onClose();
  };
  const handleClose = () => { setName(""); setTouched(false); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={ns.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[ns.sheet, { backgroundColor: C.bgCard }]}>
          <View style={ns.handleWrap}>
            <View style={[ns.handle, { backgroundColor: C.border }]} />
          </View>
          <Text style={[ns.title, { color: C.text }]}>
            + 새 {type === "project" ? "프로젝트" : "개인"} 폴더
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => setTouched(true)}
            placeholder="폴더명을 입력하세요."
            placeholderTextColor={C.textMuted}
            style={[ns.input, { borderColor: hasError ? "#FF1B1B" : C.border, color: C.text, backgroundColor: C.bg }]}
            autoFocus
            maxLength={30}
          />
          {hasError && <Text style={ns.errorText}>폴더명을 입력해주세요.</Text>}
          <View style={ns.btnRow}>
            <TouchableOpacity style={[ns.btn, { borderColor: C.border, backgroundColor: C.bgCard }]} onPress={handleClose} activeOpacity={0.7}>
              <Text style={[ns.btnText, { color: C.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ns.btn, { backgroundColor: "#00A9EC", borderColor: "#00A9EC" }]} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={[ns.btnText, { color: "#fff" }]}>추가하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const ns = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 12,
  },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, marginBottom: 4 },
  errorText: { fontSize: 12, color: "#FF1B1B", marginBottom: 12 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "600" },
});

// ── 컨텍스트 메뉴 (이동/복제/삭제) ────────────────────────
interface CtxMenuProps {
  visible: boolean;
  isDark: boolean;
  count: number;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}
function ContextMenu({ visible, isDark, count, onMove, onCopy, onDelete, onClose }: CtxMenuProps) {
  const C = useTheme();
  if (!visible) return null;
  const menuItems = [
    { label: "이동", color: C.text, onPress: onMove },
    { label: "복제", color: C.text, onPress: onCopy },
    { label: "삭제", color: "#FF1B1B", onPress: onDelete },
  ];
  return (
    <>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
      <View style={[cm.wrap, { right: 16, top: 56 }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[cm.blur, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={[cm.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]} onPress={() => { onClose(); item.onPress(); }} activeOpacity={0.7}>
                <Text style={[cm.rowText, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </BlurView>
        ) : (
          <View style={[cm.blur, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={[cm.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]} onPress={() => { onClose(); item.onPress(); }} activeOpacity={0.7}>
                <Text style={[cm.rowText, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );
}
const cm = StyleSheet.create({
  wrap: { position: "absolute", zIndex: 999 },
  blur: { borderRadius: 16, overflow: "hidden", borderWidth: 1, minWidth: 120 },
  row: { paddingHorizontal: 20, paddingVertical: 14 },
  rowText: { fontSize: 15, fontWeight: "500" },
});

// ── 삭제 확인 바텀시트 ──────────────────────────────────────
interface DeleteSheetProps {
  visible: boolean;
  count: number;
  firstName: string;
  onClose: () => void;
  onConfirm: () => void;
}
function DeleteSheet({ visible, count, firstName, onClose, onConfirm }: DeleteSheetProps) {
  const C = useTheme();
  const label = count > 1 ? `"${firstName}" 외 ${count - 1}개` : `"${firstName}"`;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={ds.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[ds.sheet, { backgroundColor: C.bgCard }]}>
          <View style={ds.handleWrap}><View style={[ds.handle, { backgroundColor: C.border }]} /></View>
          <View style={ds.iconRow}>
            <FolderSvg color="#00A9EC" size={48} />
            <Text style={[ds.label, { color: C.text }]}>{label}</Text>
          </View>
          <Text style={[ds.body, { color: C.text }]}>정말 삭제하시겠습니까?</Text>
          <View style={ds.btnRow}>
            <TouchableOpacity style={[ds.btn, { borderColor: C.border, backgroundColor: C.bgCard }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[ds.btnText, { color: C.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.btn, { backgroundColor: "#FF1B1B", borderColor: "#FF1B1B" }]} onPress={() => { onClose(); onConfirm(); }} activeOpacity={0.85}>
              <Text style={[ds.btnText, { color: "#fff" }]}>삭제하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const ds = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "600", flex: 1 },
  body: { fontSize: 16, fontWeight: "600", marginBottom: 24 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "600" },
});

// ── 다운로드 확인 바텀시트 ──────────────────────────────────
interface DownloadSheetProps {
  visible: boolean;
  count: number;
  firstName: string;
  onClose: () => void;
  onConfirm: () => void;
}
function DownloadSheet({ visible, count, firstName, onClose, onConfirm }: DownloadSheetProps) {
  const C = useTheme();
  const label = count > 1 ? `"${firstName}" 외 ${count - 1}개` : `"${firstName}"`;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={ds.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[ds.sheet, { backgroundColor: C.bgCard }]}>
          <View style={ds.handleWrap}><View style={[ds.handle, { backgroundColor: C.border }]} /></View>
          <View style={ds.iconRow}>
            <FolderSvg color="#00A9EC" size={48} />
            <Text style={[ds.label, { color: C.text }]}>{label}</Text>
          </View>
          <Text style={[ds.body, { color: C.text }]}>정말 다운로드하시겠습니까?</Text>
          <View style={ds.btnRow}>
            <TouchableOpacity style={[ds.btn, { borderColor: C.border, backgroundColor: C.bgCard }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[ds.btnText, { color: C.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.btn, { backgroundColor: "#00A9EC", borderColor: "#00A9EC" }]} onPress={() => { onClose(); onConfirm(); }} activeOpacity={0.85}>
              <Text style={[ds.btnText, { color: "#fff" }]}>다운로드</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── 폴더 색상 변경 시트 ───────────────────────────────────
interface FolderColorSheetProps {
  visible: boolean;
  currentColor: string;
  folderName: string;
  onClose: () => void;
  onSelect: (color: string) => void;
}
function FolderColorSheet({ visible, currentColor, folderName, onClose, onSelect }: FolderColorSheetProps) {
  const C = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={cs.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[cs.sheet, { backgroundColor: C.bgCard }]}>
          <View style={cs.handleWrap}><View style={[cs.handle, { backgroundColor: C.border }]} /></View>
          <Text style={[cs.title, { color: C.text }]}>폴더 색상 변경</Text>
          <Text style={[cs.sub, { color: C.textMuted }]} numberOfLines={1}>{folderName}</Text>
          <View style={cs.preview}>
            <FolderSvg color={currentColor} size={72} />
          </View>
          <View style={cs.palette}>
            {FOLDER_PALETTE.map(({ color, label }) => {
              const selected = currentColor === color;
              return (
                <TouchableOpacity key={color} style={cs.swatchWrap} activeOpacity={0.8} onPress={() => onSelect(color)}>
                  <View style={[cs.swatch, { backgroundColor: color, borderWidth: selected ? 3 : 0, borderColor: "#fff" }]}>
                    {selected && (
                      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                        <Path d="M3 8l3.5 3.5 6.5-7" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </View>
                  <Text style={[cs.swatchLabel, { color: C.textMuted }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[cs.closeBtn, { borderColor: C.border }]} onPress={onClose} activeOpacity={0.7}>
            <Text style={[cs.closeBtnText, { color: C.textSub }]}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const cs = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center", paddingTop: 8 },
  sub: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 4 },
  preview: { alignItems: "center", paddingVertical: 20 },
  palette: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, paddingBottom: 24 },
  swatchWrap: { alignItems: "center", gap: 6 },
  swatch: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
  },
  swatchLabel: { fontSize: 10, fontWeight: "500" },
  closeBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  closeBtnText: { fontSize: 15, fontWeight: "600" },
});

// ── 메인 화면 ─────────────────────────────────────────────
type ViewMode = "grid" | "list";
type FilterType = "전체" | "프로젝트 폴더만" | "개인 폴더만";

interface PersonalFolder { id: string; name: string; count: number; isPersonal: true }

export default function DriveScreen() {
  const C = useTheme();
  const isDark = useIsDark();
  const router = useRouter();
  const { projects } = useProject();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>("전체");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [personalFolders, setPersonalFolders] = useState<PersonalFolder[]>([]);
  const [newFolderVisible, setNewFolderVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 검색
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 폴더 색상
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});
  const [colorSheetFolder, setColorSheetFolder] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadAllFolderColors().then(colors => setFolderColors(colors));
  }, []);

  const loadFolders = useCallback(() => {
    setIsLoading(true);
    DriveAPI.listFolders({})
      .then((fs) =>
        setPersonalFolders(fs.map((f) => ({ id: f.id, name: f.name, count: f.item_count, isPersonal: true as const })))
      )
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(loadFolders);

  // ── 선택 모드 ──
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteVisible, setDeleteVisible] = useState(false);

  const FILTER_OPTIONS: FilterType[] = ["전체", "프로젝트 폴더만", "개인 폴더만"];

  const projectFolders = projects.map(p => ({ id: p.id, name: p.name, count: 0, isPersonal: false as const }));
  const allFolders = [
    ...(filter !== "개인 폴더만" ? projectFolders : []),
    ...(filter !== "프로젝트 폴더만" ? personalFolders : []),
  ].filter(f => !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  const handleExport = async () => {
    if (allFolders.length === 0) {
      Alert.alert("내보내기", "내보낼 폴더가 없어요.");
      return;
    }
    const lines = allFolders.map((f, i) =>
      `${i + 1}. ${f.name}${f.isPersonal ? "" : " (프로젝트)"}`
    );
    const text = `📁 MOA 드라이브 폴더 목록\n\n${lines.join("\n")}`;
    try {
      await Share.share({ message: text, title: "MOA 드라이브 폴더 목록" });
    } catch {}
  };

  const selectedFolders = allFolders.filter(f => selected.has(f.id));

  const enterSelectMode = (firstId?: string) => {
    setIsSelectMode(true);
    setSelected(firstId ? new Set([firstId]) : new Set());
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allFolders.map(f => f.id)));

  const handleFolderPress = (id: string, name: string, isPersonal: boolean) => {
    if (isSelectMode) { toggleSelect(id); return; }
    router.push({ pathname: "/(screens)/drive/[folderId]", params: { folderId: id, folderName: name, isPersonal: isPersonal ? "1" : "0" } } as any);
  };

  const handleCreateFolder = async (name: string) => {
    await DriveAPI.createFolder({ name }).catch(() => {});
    loadFolders();
  };

  // 개별 색상 변경 (비선택 모드에서 ··· 버튼)
  const handleColorChange = async (color: string) => {
    if (!colorSheetFolder) return;
    await saveFolderColor(colorSheetFolder.id, color);
    setFolderColors(prev => ({ ...prev, [colorSheetFolder.id]: color }));
    setColorSheetFolder(null);
  };

  // 선택 모드에서 색상 일괄 변경
  const handleBulkColorChange = async (color: string) => {
    await Promise.all([...selected].map(id => saveFolderColor(id, color)));
    const updates: Record<string, string> = {};
    selected.forEach(id => { updates[id] = color; });
    setFolderColors(prev => ({ ...prev, ...updates }));
    setColorSheetFolder(null);
  };

  const folderColor = (id: string, isPersonal: boolean) =>
    folderColors[id] ?? (isPersonal ? "#E2B93B" : "#00A9EC");

  const handleDeleteSelected = async () => {
    const personalIds = personalFolders.filter(f => selected.has(f.id)).map(f => f.id);
    await Promise.all(personalIds.map(id => DriveAPI.deleteFolder(id).catch(() => {})));
    exitSelectMode();
    loadFolders();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top"]}>
      {/* ── 헤더 ── */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        {isSelectMode ? (
          /* 선택 모드 헤더 */
          <>
            <TouchableOpacity onPress={exitSelectMode} style={s.iconBtn} activeOpacity={0.7}>
              <Icon name="close" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: C.text, flex: 1, textAlign: "center" }]}>
              {selected.size > 0 ? `${selected.size}개 선택됨` : "항목을 선택하세요"}
            </Text>
            <TouchableOpacity
              onPress={selected.size === allFolders.length && allFolders.length > 0 ? exitSelectMode : selectAll}
              style={[s.iconBtn, { width: 60 }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: C.primary, fontSize: 13, fontWeight: "600" }}>
                {selected.size === allFolders.length && allFolders.length > 0 ? "전체해제" : "전체선택"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* 일반 모드 헤더 */
          <>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
              <Icon name="back" size={22} color={C.text} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <MoaLogo size={24} variant="primary" />
              <Text style={[s.headerTitle, { color: C.text }]}>폴더 · {filter}</Text>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => { setSearchVisible(v => !v); setSearchQuery(""); }}>
                <SearchIcon color={searchVisible ? C.primary : C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={handleExport}>
                <ExportIcon color={C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => enterSelectMode()}>
                {/* 체크 아이콘 */}
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 6L9 17L4 12" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => setNewFolderVisible(true)}>
                <Icon name="add" size={22} color={C.textSub} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── 검색 바 ── */}
      {searchVisible && !isSelectMode && (
        <View style={[s.searchBarWrap, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
          <View style={[s.searchBarInner, { backgroundColor: C.bg, borderColor: C.border }]}>
            <SearchIcon color={C.textMuted} />
            <TextInput
              style={[s.searchInput, { color: C.text }]}
              placeholder="폴더 이름 검색"
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                <Icon name="close" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={{ flex: 1, position: "relative" }}>
        {/* ── 뷰 전환 토글 + 필터 바 (플로팅) ── */}
        <View style={s.toolBar} pointerEvents="box-none">
          <View style={[s.togglePill, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TouchableOpacity style={[s.toggleBtn, viewMode === "grid" && s.toggleActive]} onPress={() => setViewMode("grid")} activeOpacity={0.8}>
              <GridIcon color={viewMode === "grid" ? "#ffffff" : C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleBtn, viewMode === "list" && s.toggleActive]} onPress={() => setViewMode("list")} activeOpacity={0.8}>
              <ListIcon color={viewMode === "list" ? "#ffffff" : C.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }} />
          {!isSelectMode && (
            <TouchableOpacity style={s.toolBtn} activeOpacity={0.7} onPress={() => setFilterMenuOpen(v => !v)}>
              <FilterIcon color={filterMenuOpen ? "#00A9EC" : C.textMuted} />
            </TouchableOpacity>
          )}
          {filterMenuOpen && !isSelectMode && (
            <>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setFilterMenuOpen(false)} />
              <View style={s.dropdownWrap}>
                {Platform.OS === "ios" ? (
                  <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[s.dropdownBlur, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)" }]}>
                    {FILTER_OPTIONS.map((opt, i) => (
                      <TouchableOpacity key={opt} style={[s.dropItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]} onPress={() => { setFilter(opt); setFilterMenuOpen(false); }} activeOpacity={0.7}>
                        <Text style={[s.dropText, { color: filter === opt ? "#00A9EC" : C.textMuted, fontWeight: filter === opt ? "700" : "500" }]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </BlurView>
                ) : (
                  <View style={[s.dropdownBlur, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    {FILTER_OPTIONS.map((opt, i) => (
                      <TouchableOpacity key={opt} style={[s.dropItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]} onPress={() => { setFilter(opt); setFilterMenuOpen(false); }} activeOpacity={0.7}>
                        <Text style={[s.dropText, { color: filter === opt ? "#00A9EC" : C.textMuted, fontWeight: filter === opt ? "700" : "500" }]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* ── 컨텐츠 ── */}
        <ScrollView
          contentContainerStyle={[viewMode === "grid" ? s.gridContent : s.listContent, { paddingTop: 50 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator size="large" color="#00A9EC" />
            </View>
          ) : allFolders.length === 0 ? (
            <View style={s.emptyWrap}>
              <FolderSvg color={C.textMuted} size={72} />
              {searchQuery.trim() ? (
                <>
                  <Text style={[s.emptyTitle, { color: C.text }]}>검색 결과가 없어요</Text>
                  <Text style={[s.emptyDesc, { color: C.textMuted }]}>"{searchQuery}" 와 일치하는 폴더가 없어요</Text>
                </>
              ) : (
                <>
                  <Text style={[s.emptyTitle, { color: C.text }]}>폴더가 없어요</Text>
                  <Text style={[s.emptyDesc, { color: C.textMuted }]}>+ 버튼을 눌러 새 폴더를 만들어보세요</Text>
                </>
              )}
            </View>
          ) : viewMode === "grid" ? (
            <View style={s.grid}>
              {allFolders.map(folder => {
                const isSelected = selected.has(folder.id);
                const fColor = folderColor(folder.id, folder.isPersonal);
                return (
                  <TouchableOpacity
                    key={folder.id}
                    style={[s.gridItem, isSelected && { backgroundColor: C.primary + "14", borderRadius: 12 }]}
                    activeOpacity={0.7}
                    onPress={() => handleFolderPress(folder.id, folder.name, folder.isPersonal)}
                    onLongPress={() => { enterSelectMode(folder.id); }}
                  >
                    {/* 선택 모드 체크박스 */}
                    {isSelectMode && (
                      <View style={s.gridCheckWrap}>
                        <Icon name="checkbox" size={22} color={C.primary} active={isSelected} />
                      </View>
                    )}
                    <FolderSvg color={fColor} size={ITEM_W * 0.75} />
                    <Text style={[s.folderName, { color: C.text }]} numberOfLines={2}>{folder.name}</Text>
                    <Text style={[s.folderCount, { color: C.textMuted }]}>{folder.count}개의 항목</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            allFolders.map(folder => {
              const isSelected = selected.has(folder.id);
              const fColor = folderColor(folder.id, folder.isPersonal);
              return (
                <TouchableOpacity
                  key={folder.id}
                  style={[s.listRow, { backgroundColor: C.bgCard, borderBottomColor: C.border }, isSelected && { backgroundColor: C.primary + "14" }]}
                  activeOpacity={0.7}
                  onPress={() => handleFolderPress(folder.id, folder.name, folder.isPersonal)}
                  onLongPress={() => { enterSelectMode(folder.id); }}
                >
                  {isSelectMode && (
                    <Icon name="checkbox" size={22} color={C.primary} active={isSelected} />
                  )}
                  <FolderSvg color={fColor} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.listName, { color: C.text }]} numberOfLines={1}>{folder.name}</Text>
                    <Text style={[s.listCount, { color: C.textMuted }]}>{folder.count}개의 항목</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ── 선택 모드 하단 액션 바 ── */}
      {isSelectMode && (
        <View style={[s.actionBar, { backgroundColor: C.bgCard, borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}>
          {[
            { icon: "🎨", label: "색상", onPress: () => {
                if (selected.size === 0) { Alert.alert("항목 선택", "색상을 변경할 폴더를 선택하세요."); return; }
                const firstId = [...selected][0];
                const first = allFolders.find(f => f.id === firstId);
                setColorSheetFolder({ id: firstId, name: selected.size > 1 ? `${selected.size}개 폴더` : (first?.name ?? "") });
            }},
            { icon: "📂", label: "이동", onPress: () => {
                if (selected.size === 0) { Alert.alert("항목 선택", "이동할 폴더를 선택하세요."); return; }
                Alert.alert("이동", "이동 기능은 준비 중이에요.");
            }},
            { icon: "📋", label: "복사", onPress: () => {
                if (selected.size === 0) { Alert.alert("항목 선택", "복사할 폴더를 선택하세요."); return; }
                Alert.alert("복사", "복사 기능은 준비 중이에요.");
            }},
            { icon: "🗑️", label: "삭제", onPress: () => {
                if (selected.size === 0) { Alert.alert("항목 선택", "삭제할 폴더를 선택하세요."); return; }
                setDeleteVisible(true);
            }, danger: true },
          ].map(item => (
            <TouchableOpacity key={item.label} style={s.actionItem} activeOpacity={0.7} onPress={item.onPress}>
              <Text style={s.actionIcon}>{item.icon}</Text>
              <Text style={[s.actionLabel, { color: (item as any).danger ? "#EF4444" : C.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 새 폴더 바텀시트 */}
      <NewFolderSheet
        visible={newFolderVisible}
        type="personal"
        onClose={() => setNewFolderVisible(false)}
        onConfirm={handleCreateFolder}
      />

      {/* 삭제 확인 */}
      <DeleteSheet
        visible={deleteVisible}
        count={selected.size}
        firstName={selectedFolders[0]?.name ?? ""}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDeleteSelected}
      />

      {/* 폴더 색상 변경 (선택 모드 일괄) */}
      <FolderColorSheet
        visible={!!colorSheetFolder}
        currentColor={colorSheetFolder ? folderColor([...selected][0] ?? "", false) : "#00A9EC"}
        folderName={colorSheetFolder?.name ?? ""}
        onClose={() => setColorSheetFolder(null)}
        onSelect={handleBulkColorChange}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#111111" },
  headerRight: { flexDirection: "row" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  // 플로팅 툴바
  toolBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  togglePill: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 0.75,
    overflow: "hidden",
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  toggleActive: { backgroundColor: "#00A9EC" },
  toolBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // 드롭다운
  dropdownWrap: { position: "absolute", right: 4, top: 42, zIndex: 200 },
  dropdownBlur: { borderRadius: 16, overflow: "hidden", borderWidth: 1, minWidth: 160 },
  dropItem: { paddingHorizontal: 16, paddingVertical: 14 },
  dropText: { fontSize: 12 },

  // 그리드
  gridContent: { paddingHorizontal: H_PAD, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: ITEM_W, alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, position: "relative" },
  gridColorBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, alignItems: "center", justifyContent: "center", zIndex: 10 },
  gridCheckWrap: { position: "absolute", top: 6, right: 6, zIndex: 10 },
  gridItemSelected: { backgroundColor: "rgba(0,169,236,0.08)", borderRadius: 12 },
  folderName: { fontSize: 12, fontWeight: "500", color: "#111111", textAlign: "center", marginTop: 8, lineHeight: 16 },
  folderCount: { fontSize: 10, fontWeight: "500", color: "#999999", textAlign: "center", marginTop: 2 },

  // 리스트
  listContent: { paddingBottom: 40 },
  listRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: H_PAD, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEEEEE",
    gap: 14,
  },
  listName: { fontSize: 12, fontWeight: "500", color: "#111111", marginBottom: 3 },
  listCount: { fontSize: 10, fontWeight: "500", color: "#999999" },
  listActionBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // 빈 화면
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, color: "#999999" },

  // 검색 바
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // 선택 모드 하단 액션 바
  actionBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  actionItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 11, fontWeight: "600" },
});
