/**
 * app/(screens)/drive/[folderId].tsx — 폴더 내부
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Modal, TextInput, Alert, Share, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import Svg, { Path, Rect, G, Circle } from "react-native-svg";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { useTheme, useIsDark } from "@/hooks/useTheme";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";
import { DriveAPI, DriveFileDTO, DriveFolderDTO } from "@/services/api";
import OptionSheet from "@/components/modals/OptionSheet";

import { FOLDER_PALETTE, loadAllFolderColors, saveFolderColor } from "@/utils/folderColors";

const { width: SW } = Dimensions.get("window");
const H_PAD = 21;
const GRID_ITEM_W = Math.floor((SW - H_PAD * 2) / 3);

// ── 파일 메타 헬퍼 ────────────────────────────────────────
function fileTypeFromName(name: string): "pdf" | "image" | "doc" | "zip" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
  return "doc";
}
function fmtSize(bytes: number | null): string {
  if (!bytes) return "0B";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ── 폴더 SVG 아이콘 ────────────────────────────────────────
function FolderSvg({ color, size = 44 }: { color: string; size?: number }) {
  const h = size * (77.214 / 92);
  return (
    <Svg width={size} height={h} viewBox="0 0 92 77.214" fill="none">
      <Path d="M0 12C0 5.373 5.373 0 12 0H36.686C39.338 0 41.882 1.054 43.757 2.929L48.243 7.414C50.118 9.289 52.662 10.343 55.314 10.343H80C86.627 10.343 92 15.716 92 22.343V65.214C92 71.841 86.627 77.214 80 77.214H12C5.373 77.214 0 71.841 0 65.214V12Z" fill={color} />
      <Path d="M0 28C0 24.686 2.686 22 6 22H86C89.314 22 92 24.686 92 28V65.214C92 71.841 86.627 77.214 80 77.214H12C5.373 77.214 0 71.841 0 65.214V28Z" fill={color} opacity={0.75} />
    </Svg>
  );
}

// ── 파일 타입 아이콘 ──────────────────────────────────────
type FileType = "pdf" | "image" | "doc" | "zip" | "folder";
const FILE_COLORS: Record<FileType, string> = {
  pdf: "#EF4444", image: "#10B981", doc: "#3B82F6", zip: "#8B5CF6", folder: "#00A9EC",
};
function FileIcon({ type, size = 36 }: { type: FileType; size?: number }) {
  const c = FILE_COLORS[type];
  if (type === "folder") return <FolderSvg color={c} size={size} />;
  if (type === "image") {
    return (
      <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <Rect x="3" y="3" width="30" height="30" rx="4" fill={c + "22"} stroke={c} strokeWidth="2" />
        <Path d="M3 26L10 18L16 23L22 15L33 26" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <G><Rect x="10" y="9" width="6" height="6" rx="3" fill={c} /></G>
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Path d="M6 4C6 2.895 6.895 2 8 2H22L30 10V32C30 33.105 29.105 34 28 34H8C6.895 34 6 33.105 6 32V4Z" fill={c + "22"} stroke={c} strokeWidth="2" />
      <Path d="M22 2V10H30" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11 18H25M11 23H19" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ── 아이콘 ────────────────────────────────────────────────
function SortIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M5 7H19M5 12H15M5 17H11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
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
function DownloadIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 파일 데이터 ───────────────────────────────────────────
interface FileItem { id: string; name: string; type: FileType; size: string; date: string; createdAt?: string }

// ── 새 서브폴더 바텀시트 ──────────────────────────────────
interface SubFolderSheetProps { visible: boolean; onClose: () => void; onConfirm: (name: string) => void; }
function SubFolderSheet({ visible, onClose, onConfirm }: SubFolderSheetProps) {
  const C = useTheme();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const hasError = touched && !name.trim();
  const handleConfirm = () => { setTouched(true); if (!name.trim()) return; onConfirm(name.trim()); setName(""); setTouched(false); onClose(); };
  const handleClose = () => { setName(""); setTouched(false); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={sf.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[sf.sheet, { backgroundColor: C.bgCard }]}>
          <View style={sf.handleWrap}><View style={[sf.handle, { backgroundColor: C.border }]} /></View>
          <Text style={[sf.title, { color: C.text }]}>+ 새 프로젝트 폴더</Text>
          <TextInput value={name} onChangeText={setName} onBlur={() => setTouched(true)} placeholder="폴더명을 입력하세요." placeholderTextColor={C.textMuted} style={[sf.input, { borderColor: hasError ? "#FF1B1B" : C.border, color: C.text, backgroundColor: C.bg }]} autoFocus maxLength={30} />
          {hasError && <Text style={sf.error}>폴더명을 입력해주세요.</Text>}
          <View style={sf.btnRow}>
            <TouchableOpacity style={[sf.btn, { borderColor: C.border, backgroundColor: C.bgCard }]} onPress={handleClose} activeOpacity={0.7}><Text style={[sf.btnText, { color: C.text }]}>취소</Text></TouchableOpacity>
            <TouchableOpacity style={[sf.btn, { backgroundColor: "#00A9EC", borderColor: "#00A9EC" }]} onPress={handleConfirm} activeOpacity={0.85}><Text style={[sf.btnText, { color: "#fff" }]}>추가하기</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const sf = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, marginBottom: 4 },
  error: { fontSize: 12, color: "#FF1B1B", marginBottom: 12 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "600" },
});

// ── 삭제 확인 ────────────────────────────────────────────
interface DelSheetProps { visible: boolean; name: string; onClose: () => void; onConfirm: () => void; }
function DelSheet({ visible, name, onClose, onConfirm }: DelSheetProps) {
  const C = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={dl.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[dl.sheet, { backgroundColor: C.bgCard }]}>
          <View style={dl.handleWrap}><View style={[dl.handle, { backgroundColor: C.border }]} /></View>
          <Text style={[dl.body, { color: C.text }]}>"{name}"를{"\n"}정말 삭제하시겠습니까?</Text>
          <View style={dl.btnRow}>
            <TouchableOpacity style={[dl.btn, { borderColor: C.border, backgroundColor: C.bgCard }]} onPress={onClose} activeOpacity={0.7}><Text style={[dl.btnText, { color: C.text }]}>취소</Text></TouchableOpacity>
            <TouchableOpacity style={[dl.btn, { backgroundColor: "#FF1B1B", borderColor: "#FF1B1B" }]} onPress={() => { onClose(); onConfirm(); }} activeOpacity={0.85}><Text style={[dl.btnText, { color: "#fff" }]}>삭제하기</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const dl = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { fontSize: 16, fontWeight: "600", marginBottom: 24, lineHeight: 24 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "600" },
});

// ── 이동 대상 선택 ────────────────────────────────────────
interface MoveSheetProps {
  visible: boolean;
  folders: FileItem[];
  onClose: () => void;
  onSelect: (targetId: string | null) => void;
}
function MoveSheet({ visible, folders, onClose, onSelect }: MoveSheetProps) {
  const C = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={dl.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[dl.sheet, { backgroundColor: C.bgCard, maxHeight: "70%" }]}>
          <View style={dl.handleWrap}><View style={[dl.handle, { backgroundColor: C.border }]} /></View>
          <Text style={[dl.body, { color: C.text, marginBottom: 16 }]}>어디로 이동할까요?</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <TouchableOpacity
              style={[mv.row, { borderBottomColor: C.border }]}
              activeOpacity={0.7}
              onPress={() => onSelect(null)}
            >
              <Icon name="back" size={18} color={C.textMuted} />
              <Text style={[mv.rowText, { color: C.text }]}>현재 폴더 밖으로 (루트)</Text>
            </TouchableOpacity>
            {folders.length === 0 ? (
              <Text style={[mv.empty, { color: C.textMuted }]}>이동할 하위 폴더가 없어요.</Text>
            ) : (
              folders.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[mv.row, { borderBottomColor: C.border }]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(f.id)}
                >
                  <FolderSvg color="#00A9EC" size={22} />
                  <Text style={[mv.rowText, { color: C.text }]} numberOfLines={1}>{f.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={[dl.btn, { borderColor: C.border, backgroundColor: C.bgCard, marginTop: 12 }]} onPress={onClose} activeOpacity={0.7}>
            <Text style={[dl.btnText, { color: C.text }]}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const mv = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { fontSize: 15, fontWeight: "500", flex: 1 },
  empty: { fontSize: 13, paddingVertical: 20, textAlign: "center" },
});

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

          {/* 미리보기 */}
          <View style={cs.preview}>
            <FolderSvg color={currentColor} size={72} />
          </View>

          {/* 색상 팔레트 */}
          <View style={cs.palette}>
            {FOLDER_PALETTE.map(({ color, label }) => {
              const selected = currentColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={cs.swatchWrap}
                  activeOpacity={0.8}
                  onPress={() => onSelect(color)}
                >
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

// ── 메인 ─────────────────────────────────────────────────
export default function FolderDetailScreen() {
  const C = useTheme();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { folderId, folderName, isPersonal } = useLocalSearchParams<{ folderId: string; folderName: string; isPersonal: string }>();
  // isPersonal "1" → folder_id 컨텍스트 / "0" → project_id 컨텍스트(프로젝트 폴더 루트)
  const isFolderCtx = isPersonal === "1";
  const ctx = isFolderCtx ? { folderId } : { projectId: folderId };
  const folderCreateBody = isFolderCtx
    ? { parent_id: folderId }
    : { project_id: folderId };

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [subFolders, setSubFolders] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subFolderVisible, setSubFolderVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [moveVisible, setMoveVisible] = useState(false);
  const [colorSheetVisible, setColorSheetVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});

  // 검색
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 선택 모드
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);

  // 저장된 폴더 색상 로드
  useEffect(() => {
    loadAllFolderColors().then(colors => setFolderColors(colors));
  }, []);

  const SORT_OPTIONS = ["제목 · 오름차순", "제목 · 내림차순", "생성 날짜 · 오름차순", "생성 날짜 · 내림차순"];
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[3]);

  const load = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      DriveAPI.listFiles(ctx),
      DriveAPI.listFolders(isFolderCtx ? { parentId: folderId } : { projectId: folderId }),
    ]).then(([fs, fos]) => {
      setFiles(fs.map((f) => ({
        id: f.id, name: f.name, type: fileTypeFromName(f.name),
        size: fmtSize(f.size_bytes), date: fmtDate(f.created_at), createdAt: f.created_at,
      })));
      setSubFolders(fos.map((fo) => ({
        id: fo.id, name: fo.name, type: "folder" as const,
        size: `${fo.item_count}개의 항목`, date: fmtDate(fo.created_at), createdAt: fo.created_at,
      })));
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [folderId, isFolderCtx]);

  useFocusEffect(load);

  // 정렬 적용 (폴더 먼저, 그 안에서 선택한 기준대로)
  const sortItems = (arr: FileItem[]) => {
    const sorted = [...arr];
    if (sortOption.startsWith("제목")) {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
      if (sortOption.includes("내림차순")) sorted.reverse();
    } else {
      sorted.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
      if (sortOption.includes("내림차순")) sorted.reverse();
    }
    return sorted;
  };
  const allItems = [...sortItems(subFolders), ...sortItems(files)]
    .filter(item => !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  // 선택 모드 핸들러
  const enterSelectMode = (firstId?: string) => {
    setIsSelectMode(true);
    setSelected(firstId ? new Set([firstId]) : new Set());
  };
  const exitSelectMode = () => { setIsSelectMode(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(allItems.map(i => i.id)));

  const handleBulkDelete = async () => {
    const folders = allItems.filter(i => selected.has(i.id) && i.type === "folder");
    const filesArr = allItems.filter(i => selected.has(i.id) && i.type !== "folder");
    await Promise.all([
      ...folders.map(f => DriveAPI.deleteFolder(f.id).catch(() => {})),
      ...filesArr.map(f => DriveAPI.deleteFile(f.id).catch(() => {})),
    ]);
    exitSelectMode();
    load();
  };

  const handleBulkColorChange = async (color: string) => {
    const folderIds = allItems.filter(i => selected.has(i.id) && i.type === "folder").map(i => i.id);
    await Promise.all(folderIds.map(id => saveFolderColor(id, color)));
    const updates: Record<string, string> = {};
    folderIds.forEach(id => { updates[id] = color; });
    setFolderColors(prev => ({ ...prev, ...updates }));
    setColorSheetVisible(false);
  };

  const handleExport = async () => {
    if (allItems.length === 0) { Alert.alert("내보내기", "내보낼 항목이 없어요."); return; }
    const lines = allItems.map((item, i) =>
      `${i + 1}. ${item.name}${item.type === "folder" ? " 📁" : ` (${item.size})`}`
    );
    const text = `📁 ${folderName ?? "폴더"} 목록\n\n${lines.join("\n")}`;
    try { await Share.share({ message: text, title: `${folderName ?? "폴더"} 목록` }); } catch {}
  };

  const handleCreateSubfolder = async (name: string) => {
    await DriveAPI.createFolder({ name, ...folderCreateBody }).catch(() => {});
    load();
  };

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState("");
  const handleRename = async () => {
    if (!selectedFile || !renameText.trim()) return;
    setRenameVisible(false);
    try {
      if (selectedFile.type === "folder") await DriveAPI.renameFolder(selectedFile.id, renameText.trim());
      else await DriveAPI.renameFile(selectedFile.id, renameText.trim());
      load();
    } catch (e: any) {
      Alert.alert("이름 변경 실패", e?.message ?? "변경할 수 없어요.");
    }
  };

  const [organizing, setOrganizing] = useState(false);
  const handleAutoOrganize = async () => {
    if (organizing) return;
    Alert.alert("AI 자동 정리", "비슷한 파일들을 주제별 폴더로 묶어 정리할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "정리하기",
        onPress: async () => {
          setOrganizing(true);
          try {
            const r = await DriveAPI.autoOrganize(ctx);
            load();
            Alert.alert("정리 완료", r.message);
          } catch (e: any) {
            Alert.alert("정리 실패", e?.message ?? "정리하지 못했어요.");
          } finally {
            setOrganizing(false);
          }
        },
      },
    ]);
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    if (selectedFile.type === "folder") {
      await DriveAPI.deleteFolder(selectedFile.id).catch(() => {});
    } else {
      await DriveAPI.deleteFile(selectedFile.id).catch(() => {});
    }
    load();
  };

  const handleMove = async (targetFolderId: string | null) => {
    if (!selectedFile) return;
    try {
      if (selectedFile.type === "folder") {
        await DriveAPI.moveFolder(selectedFile.id, targetFolderId);
      } else {
        await DriveAPI.moveFile(selectedFile.id, targetFolderId);
      }
      load();
    } catch (e: any) {
      Alert.alert("이동 실패", e?.message ?? "이동할 수 없어요.");
    }
  };

  const handleColorChange = async (color: string) => {
    if (!selectedFile) return;
    await saveFolderColor(selectedFile.id, color);
    setFolderColors(prev => ({ ...prev, [selectedFile.id]: color }));
    setColorSheetVisible(false);
  };

  const getFolderColor = (id: string) => folderColors[id] ?? "#00A9EC";

  const handleUpload = async () => {
    if (uploading) return;
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      await DriveAPI.uploadFile(
        asset.uri, asset.name, asset.mimeType ?? "application/octet-stream", ctx,
      );
      load();
    } catch (e: any) {
      Alert.alert("업로드 실패", e?.message ?? "파일 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (file.type === "folder") return;
    try {
      const { url } = await DriveAPI.downloadUrl(file.id);
      if (url) await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert("다운로드 실패", "다운로드 링크를 가져오지 못했어요.");
    }
  };

  const handleItemPress = (item: FileItem) => {
    if (item.type === "folder") {
      router.push({ pathname: "/(screens)/drive/[folderId]", params: { folderId: item.id, folderName: item.name, isPersonal: "1" } } as any);
    } else {
      handleDownload(item);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top"]}>
      {/* ── 헤더 ── */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        {isSelectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode} style={s.iconBtn} activeOpacity={0.7}>
              <Icon name="close" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: C.text, flex: 1, textAlign: "center" }]}>
              {selected.size > 0 ? `${selected.size}개 선택됨` : "항목을 선택하세요"}
            </Text>
            <TouchableOpacity
              onPress={selected.size === allItems.length && allItems.length > 0 ? exitSelectMode : selectAll}
              style={[s.iconBtn, { width: 60 }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: C.primary, fontSize: 13, fontWeight: "600" }}>
                {selected.size === allItems.length && allItems.length > 0 ? "전체해제" : "전체선택"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
              <Icon name="back" size={22} color={C.text} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <MoaLogo size={24} variant="primary" />
              <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{folderName ?? "폴더"}</Text>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => { setSearchVisible(v => !v); setSearchQuery(""); }}>
                <SearchIcon color={searchVisible ? C.primary : C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={handleExport}>
                <ExportIcon color={C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => enterSelectMode()}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 6L9 17L4 12" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
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
              placeholder="파일 또는 폴더 이름 검색"
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
        {/* ── 정렬 바 (플로팅) ── */}
        <View style={s.toolBar} pointerEvents="box-none">
          {/* 뷰 전환 토글 */}
          <View style={[s.togglePill, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TouchableOpacity style={[s.toggleBtn, viewMode === "grid" && s.toggleActive]} onPress={() => setViewMode("grid")} activeOpacity={0.8}>
              <GridIcon color={viewMode === "grid" ? "#fff" : C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleBtn, viewMode === "list" && s.toggleActive]} onPress={() => setViewMode("list")} activeOpacity={0.8}>
              <ListIcon color={viewMode === "list" ? "#fff" : C.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.toolBtn} activeOpacity={0.7} onPress={() => setSortMenuOpen(v => !v)}>
            <SortIcon color={sortMenuOpen ? "#00A9EC" : C.textMuted} />
          </TouchableOpacity>

          {sortMenuOpen && (
            <>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setSortMenuOpen(false)} />
              <View style={s.dropdownWrap}>
                {Platform.OS === "ios" ? (
                  <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[s.dropdownBlur, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)" }]}>
                    {SORT_OPTIONS.map((opt, i) => (
                      <TouchableOpacity key={opt} style={[s.dropItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]} onPress={() => { setSortOption(opt); setSortMenuOpen(false); }} activeOpacity={0.7}>
                        <Text style={[s.dropText, { color: sortOption === opt ? "#00A9EC" : C.textMuted, fontWeight: sortOption === opt ? "700" : "500" }]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </BlurView>
                ) : (
                  <View style={[s.dropdownBlur, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    {SORT_OPTIONS.map((opt, i) => (
                      <TouchableOpacity key={opt} style={[s.dropItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]} onPress={() => { setSortOption(opt); setSortMenuOpen(false); }} activeOpacity={0.7}>
                        <Text style={[s.dropText, { color: sortOption === opt ? "#00A9EC" : C.textMuted, fontWeight: sortOption === opt ? "700" : "500" }]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* ── 파일 목록 ── */}
        <ScrollView
          contentContainerStyle={[viewMode === "grid" ? s.gridContent : s.listContent, { paddingTop: 50 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator size="large" color="#00A9EC" />
            </View>
          ) : allItems.length === 0 ? (
            <View style={s.emptyWrap}>
              <FolderSvg color={C.textMuted} size={64} />
              <Text style={[s.emptyTitle, { color: C.text }]}>파일이 없어요</Text>
              <Text style={[s.emptyDesc, { color: C.textMuted }]}>파일을 업로드하거나 폴더를 추가해보세요</Text>
            </View>
          ) : viewMode === "grid" ? (
            /* 그리드 뷰 */
            <View style={s.grid}>
              {allItems.map(item => {
                const isSelected = selected.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.gridItem, isSelected && { backgroundColor: C.primary + "14", borderRadius: 12 }]}
                    activeOpacity={0.7}
                    onPress={() => isSelectMode ? toggleSelect(item.id) : handleItemPress(item)}
                    onLongPress={() => enterSelectMode(item.id)}
                  >
                    {isSelectMode && (
                      <View style={s.gridCheckWrap}>
                        <Icon name="checkbox" size={20} color={C.primary} active={isSelected} />
                      </View>
                    )}
                    {item.type === "folder"
                      ? <FolderSvg color={getFolderColor(item.id)} size={GRID_ITEM_W * 0.72} />
                      : <FileIcon type={item.type} size={GRID_ITEM_W * 0.55} />
                    }
                    <Text style={[s.gridName, { color: C.text }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[s.gridMeta, { color: C.textMuted }]}>{item.size}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* 리스트 뷰 */
            allItems.map(item => {
              const isSelected = selected.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.fileRow, { backgroundColor: C.bgCard, borderBottomColor: C.border }, isSelected && { backgroundColor: C.primary + "14" }]}
                  activeOpacity={0.7}
                  onPress={() => isSelectMode ? toggleSelect(item.id) : handleItemPress(item)}
                  onLongPress={() => enterSelectMode(item.id)}
                >
                  {isSelectMode && (
                    <Icon name="checkbox" size={22} color={C.primary} active={isSelected} />
                  )}
                  {item.type === "folder"
                    ? <FolderSvg color={getFolderColor(item.id)} size={36} />
                    : <FileIcon type={item.type} size={36} />
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fileName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.fileMeta, { color: C.textMuted }]}>{item.size} · {item.date}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ── 선택 모드 하단 액션바 ── */}
      {isSelectMode && (
        <View style={[s.actionBar, { backgroundColor: C.bgCard, borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={s.actionItem} activeOpacity={0.7} onPress={() => {
            if (selected.size === 0) return;
            setColorSheetVisible(true);
          }}>
            <Text style={s.actionIcon}>🎨</Text>
            <Text style={[s.actionLabel, { color: C.textSub }]}>색상</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionItem} activeOpacity={0.7} onPress={() => {
            if (selected.size === 0) return;
            setBulkDeleteVisible(true);
          }}>
            <Text style={s.actionIcon}>🗑️</Text>
            <Text style={[s.actionLabel, { color: "#EF4444" }]}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 하단: AI 정리 + 업로드/새 폴더 ── */}
      {!isSelectMode && <View style={[s.addBtnWrap, { backgroundColor: C.bgCard, borderTopColor: C.border, gap: 8, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[s.aiBtn, { borderColor: C.primary, backgroundColor: C.primary + "10" }]}
          onPress={handleAutoOrganize}
          activeOpacity={0.85}
          disabled={organizing}
        >
          {organizing
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Text style={[s.aiBtnText, { color: C.primary }]}>AI로 비슷한 파일 정리하기</Text>}
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[s.addBtn, { flex: 1, backgroundColor: uploading ? "#88C9E8" : "#00A9EC" }]}
            onPress={handleUpload}
            activeOpacity={0.85}
            disabled={uploading}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={s.addBtnText}>{uploading ? "업로드 중…" : "파일 업로드"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.addBtn, { flex: 1, backgroundColor: "#7C3AED" }]}
            onPress={() => setSubFolderVisible(true)}
            activeOpacity={0.85}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={s.addBtnText}>새 폴더</Text>
          </TouchableOpacity>
        </View>
      </View>}

      <SubFolderSheet visible={subFolderVisible} onClose={() => setSubFolderVisible(false)} onConfirm={handleCreateSubfolder} />
      <DelSheet visible={deleteVisible} name={selectedFile?.name ?? ""} onClose={() => setDeleteVisible(false)} onConfirm={handleDeleteFile} />
      {/* 일괄 삭제 확인 */}
      <DelSheet visible={bulkDeleteVisible} name={`선택한 ${selected.size}개 항목`} onClose={() => setBulkDeleteVisible(false)} onConfirm={handleBulkDelete} />

      {/* 항목 액션: 이름 변경 / 이동 / 삭제 */}
      <OptionSheet
        isOpen={actionVisible}
        onClose={() => setActionVisible(false)}
        title={selectedFile?.name}
        options={[
          { label: "이름 변경", emoji: "✏️", onPress: () => { setRenameText(selectedFile?.name ?? ""); setRenameVisible(true); } },
          ...(selectedFile?.type === "folder" ? [
            { label: "색상 변경", emoji: "🎨", onPress: () => setColorSheetVisible(true) },
          ] : []),
          { label: "이동", emoji: "📂", onPress: () => setMoveVisible(true) },
          { label: "삭제", emoji: "🗑️", onPress: () => setDeleteVisible(true), isDestructive: true },
        ]}
      />

      {/* 폴더 색상 변경 */}
      <FolderColorSheet
        visible={colorSheetVisible}
        currentColor={selectedFile && !isSelectMode ? getFolderColor(selectedFile.id) : "#00A9EC"}
        folderName={isSelectMode ? `선택한 ${selected.size}개 폴더` : (selectedFile?.name ?? "")}
        onClose={() => setColorSheetVisible(false)}
        onSelect={isSelectMode ? handleBulkColorChange : handleColorChange}
      />

      {/* 이동 대상 선택 */}
      <MoveSheet
        visible={moveVisible}
        folders={subFolders.filter(f => f.id !== selectedFile?.id)}
        onClose={() => setMoveVisible(false)}
        onSelect={(targetId) => { setMoveVisible(false); handleMove(targetId); }}
      />

      {/* 이름 변경 */}
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 28 }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setRenameVisible(false)} />
          <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 20, gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text }}>이름 변경</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text }}
              value={renameText} onChangeText={setRenameText} autoFocus selectTextOnFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" }} onPress={() => setRenameVisible(false)}>
                <Text style={{ color: C.textSub, fontWeight: "600" }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: "#00A9EC", borderRadius: 10, paddingVertical: 12, alignItems: "center" }} onPress={handleRename} disabled={!renameText.trim()}>
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
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#111111", flex: 1 },
  headerRight: { flexDirection: "row" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  toolBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  toolBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  togglePill: { flexDirection: "row", borderRadius: 24, borderWidth: 0.75, overflow: "hidden" },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  toggleActive: { backgroundColor: "#00A9EC" },
  dropdownWrap: { position: "absolute", right: 4, top: 42, zIndex: 200 },
  dropdownBlur: { borderRadius: 16, overflow: "hidden", borderWidth: 1, minWidth: 180 },
  dropItem: { paddingHorizontal: 16, paddingVertical: 14 },
  dropText: { fontSize: 12 },

  // 그리드
  gridContent: { paddingHorizontal: H_PAD, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: {
    width: GRID_ITEM_W,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    position: "relative",
  },
  gridName: { fontSize: 11, fontWeight: "500", textAlign: "center", marginTop: 6, lineHeight: 15 },
  gridMeta: { fontSize: 10, textAlign: "center", marginTop: 2 },
  gridCheckWrap: {
    position: "absolute", top: 6, right: 4,
    width: 24, height: 24, alignItems: "center", justifyContent: "center", zIndex: 10,
  },
  // 리스트
  listContent: { paddingBottom: 40 },
  fileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: H_PAD, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  fileName: { fontSize: 13, fontWeight: "600", color: "#111111", marginBottom: 3 },
  fileMeta: { fontSize: 11, color: "#999999" },
  // 선택 모드 액션바
  actionBar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingHorizontal: 8 },
  actionItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, gap: 4 },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, fontWeight: "500" },
  // 검색바
  searchBarWrap: { paddingHorizontal: H_PAD, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBarInner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  addBtnWrap: { paddingHorizontal: H_PAD, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#00A9EC" },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  aiBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  aiBtnText: { fontSize: 14, fontWeight: "700" },

  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, color: "#999999" },
});
