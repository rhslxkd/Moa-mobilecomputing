/**
 * app/(screens)/drive/[folderId].tsx — 폴더 내부
 */

import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import Svg, { Path, Rect, G } from "react-native-svg";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { useTheme, useIsDark } from "@/hooks/useTheme";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";
import { DriveAPI, DriveFileDTO, DriveFolderDTO } from "@/services/api";

const { width: SW } = Dimensions.get("window");
const H_PAD = 21;

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
function DownloadIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 파일 데이터 ───────────────────────────────────────────
interface FileItem { id: string; name: string; type: FileType; size: string; date: string }

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

// ── 메인 ─────────────────────────────────────────────────
export default function FolderDetailScreen() {
  const C = useTheme();
  const isDark = useIsDark();
  const router = useRouter();
  const { folderId, folderName, isPersonal } = useLocalSearchParams<{ folderId: string; folderName: string; isPersonal: string }>();
  // isPersonal "1" → folder_id 컨텍스트 / "0" → project_id 컨텍스트(프로젝트 폴더 루트)
  const isFolderCtx = isPersonal === "1";
  const ctx = isFolderCtx ? { folderId } : { projectId: folderId };
  const folderCreateBody = isFolderCtx
    ? { parent_id: folderId }
    : { project_id: folderId };

  const [files, setFiles] = useState<FileItem[]>([]);
  const [subFolders, setSubFolders] = useState<FileItem[]>([]);
  const [subFolderVisible, setSubFolderVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const SORT_OPTIONS = ["제목 · 오름차순", "제목 · 내림차순", "생성 날짜 · 오름차순", "생성 날짜 · 내림차순"];
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[3]);

  const load = useCallback(() => {
    DriveAPI.listFiles(ctx).then((fs) =>
      setFiles(fs.map((f) => ({
        id: f.id, name: f.name, type: fileTypeFromName(f.name),
        size: fmtSize(f.size_bytes), date: fmtDate(f.created_at),
      })))
    ).catch(() => {});
    DriveAPI.listFolders(isFolderCtx ? { parentId: folderId } : { projectId: folderId }).then((fos) =>
      setSubFolders(fos.map((fo) => ({
        id: fo.id, name: fo.name, type: "folder" as const,
        size: `${fo.item_count}개의 항목`, date: fmtDate(fo.created_at),
      })))
    ).catch(() => {});
  }, [folderId, isFolderCtx]);

  useFocusEffect(load);

  const allItems = [...subFolders, ...files];

  const handleCreateSubfolder = async (name: string) => {
    await DriveAPI.createFolder({ name, ...folderCreateBody }).catch(() => {});
    load();
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
    <SafeAreaView style={[s.safe, { backgroundColor: "#F1F1F5" }]} edges={["top"]}>
      {/* ── 헤더 ── */}
      <View style={[s.header, { backgroundColor: "#FFFFFF", borderBottomColor: "#EEEEEE" }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="back" size={22} color="#111111" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <MoaLogo size={24} variant="primary" />
          <Text style={s.headerTitle} numberOfLines={1}>폴더 · {folderName ?? "폴더"}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => Alert.alert("다운로드", "준비 중입니다.")}>
            <DownloadIcon color="#333333" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <Icon name="option" size={22} color="#333333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, position: "relative" }}>
        {/* ── 정렬 바 (플로팅) ── */}
        <View style={s.toolBar} pointerEvents="box-none">
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.toolBtn} activeOpacity={0.7} onPress={() => setSortMenuOpen(v => !v)}>
            <SortIcon color={sortMenuOpen ? "#00A9EC" : "#777777"} />
          </TouchableOpacity>

          {sortMenuOpen && (
            <>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setSortMenuOpen(false)} />
              <View style={s.dropdownWrap}>
                <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[s.dropdownBlur, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)" }]}>
                  {SORT_OPTIONS.map((opt, i) => (
                    <TouchableOpacity key={opt} style={[s.dropItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]} onPress={() => { setSortOption(opt); setSortMenuOpen(false); }} activeOpacity={0.7}>
                      <Text style={[s.dropText, { color: sortOption === opt ? "#00A9EC" : "#777777", fontWeight: sortOption === opt ? "700" : "500" }]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </BlurView>
              </View>
            </>
          )}
        </View>

        {/* ── 파일 목록 ── */}
        <ScrollView contentContainerStyle={[s.listContent, { paddingTop: 50 }]} showsVerticalScrollIndicator={false}>
          {allItems.length === 0 ? (
            <View style={s.emptyWrap}>
              <FolderSvg color="#CCCCCC" size={64} />
              <Text style={[s.emptyTitle, { color: "#111111" }]}>파일이 없어요</Text>
              <Text style={s.emptyDesc}>파일을 업로드하거나 폴더를 추가해보세요</Text>
            </View>
          ) : (
            allItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[s.fileRow, { backgroundColor: "#FFFFFF", borderBottomColor: "#EEEEEE" }]}
                activeOpacity={0.7}
                onPress={() => handleItemPress(item)}
              >
                <FileIcon type={item.type} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={s.fileName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.fileMeta}>{item.size} · {item.date}</Text>
                </View>
                <TouchableOpacity
                  style={s.fileOptionBtn}
                  activeOpacity={0.7}
                  onPress={() => { setSelectedFile(item); setDeleteVisible(true); }}
                >
                  <Icon name="option" size={20} color="#999999" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* ── 하단: 파일 업로드 + 새 폴더 추가 ── */}
      <View style={[s.addBtnWrap, { backgroundColor: "#FFFFFF", borderTopColor: "#EEEEEE", flexDirection: "row", gap: 10 }]}>
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

      <SubFolderSheet visible={subFolderVisible} onClose={() => setSubFolderVisible(false)} onConfirm={handleCreateSubfolder} />
      <DelSheet visible={deleteVisible} name={selectedFile?.name ?? ""} onClose={() => setDeleteVisible(false)} onConfirm={handleDeleteFile} />
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
  dropdownWrap: { position: "absolute", right: 4, top: 42, zIndex: 200 },
  dropdownBlur: { borderRadius: 16, overflow: "hidden", borderWidth: 1, minWidth: 180 },
  dropItem: { paddingHorizontal: 16, paddingVertical: 14 },
  dropText: { fontSize: 12 },

  listContent: { paddingBottom: 40 },
  fileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: H_PAD, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  fileName: { fontSize: 13, fontWeight: "600", color: "#111111", marginBottom: 3 },
  fileMeta: { fontSize: 11, color: "#999999" },
  fileOptionBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  addBtnWrap: { paddingHorizontal: H_PAD, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#00A9EC" },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, color: "#999999" },
});
