/**
 * src/components/modals/ColorPickerSheet.tsx
 * 색상 팔레트 선택 바텀시트
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

const { width } = Dimensions.get("window");
const PADDING = 24;
const COLS = 6;
const GAP = 14;
const CIRCLE = Math.floor((width - PADDING * 2 - GAP * (COLS - 1)) / COLS);

// ── 기본 팔레트 (8행 × 6열) ──────────────────────────────────────
export const BASIC_COLORS: string[] = [
  // Row 1 — Blacks / Blues
  "#1C1C1C", "#1D2F6F", "#1A3A8F", "#3B6DC1", "#4A90E2", "#5DADE2",
  // Row 2 — Purples
  "#CE93D8", "#9B59B6", "#7B1FA2", "#B39DDB", "#5E35B1", "#7E57C2",
  // Row 3 — Greens / Teals
  "#009688", "#27AE60", "#2C7873", "#8BC34A", "#4CAF50", "#827717",
  // Row 4 — Pinks / Reds
  "#FFAB91", "#F06292", "#E91E63", "#EF9A9A", "#EF5350", "#C62828",
  // Row 5 — Yellows / Oranges / Browns
  "#FDD835", "#FB8C00", "#E64A19", "#F9A825", "#A1887F", "#6D4C41",
  // Row 6 — Teals / Cyans / Light Blues
  "#00838F", "#26A69A", "#4DB6AC", "#00BCD4", "#80DEEA", "#90CAF9",
  // Row 7 — Pinks / Lime / Forest Greens
  "#F50057", "#F48FB1", "#F8BBD0", "#D4E157", "#A5D6A7", "#388E3C",
  // Row 8 — Grays / Muted
  "#546E7A", "#78909C", "#9E9E9E", "#BCAAA4", "#BF8080", "#4A148C",
];

// ── 2024 S/S 팔레트 (8행 × 6열) ─────────────────────────────────
export const SEASONAL_COLORS: string[] = [
  "#FF6B6B", "#FF8E53", "#FFD166", "#06D6A0", "#118AB2", "#073B4C",
  "#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4CC9F0", "#2EC4B6",
  "#FFB3C1", "#FFCAD4", "#CDB4DB", "#FFC8DD", "#BDE0FE", "#A2D2FF",
  "#606C38", "#283618", "#DDA15E", "#BC6C25", "#E9C46A", "#F4A261",
  "#E76F51", "#264653", "#2A9D8F", "#457B9D", "#A8DADC", "#F1FAEE",
  "#6D6875", "#B5838D", "#E5989B", "#FFB4A2", "#FFCDB2", "#FFECD2",
  "#CDDAFD", "#DFE7FD", "#C1D3FE", "#CFBFF7", "#DAC3E8", "#EAD7F7",
  "#2D6A4F", "#40916C", "#52B788", "#74C69D", "#95D5B2", "#B7E4C7",
];

// ── Check 아이콘 ─────────────────────────────────────────────────
function CheckIcon({ dark }: { dark?: boolean }) {
  const stroke = dark ? "#333" : "#fff";
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3 8l3.5 3.5L13 4"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── 밝기 판단 (밝은 색상엔 어두운 체크 사용) ──────────────────────
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
interface Props {
  visible: boolean;
  selected: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

export default function ColorPickerSheet({ visible, selected, onSelect, onClose }: Props) {
  const C = useTheme();
  const [tab, setTab] = useState<"basic" | "seasonal">("basic");
  const colors = tab === "basic" ? BASIC_COLORS : SEASONAL_COLORS;

  // 6개씩 행으로 분리
  const rows: string[][] = [];
  for (let i = 0; i < colors.length; i += COLS) {
    rows.push(colors.slice(i, i + COLS));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: C.bgCard }]}>
          <View style={[s.handle, { backgroundColor: C.border }]} />
          <Text style={[s.title, { color: C.text }]}>색상</Text>

          {/* 탭 */}
          <View style={[s.tabWrap, { backgroundColor: C.bg }]}>
            {(["basic", "seasonal"] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                activeOpacity={0.7}
                style={[s.tabPill, t === tab && { backgroundColor: C.text }]}
              >
                <Text style={[s.tabText, { color: t === tab ? C.bgCard : C.textMuted }]}>
                  {t === "basic" ? "기본" : "2024 S/S"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 색상 그리드 */}
          <ScrollView
            contentContainerStyle={s.grid}
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row, ri) => (
              <View key={ri} style={s.row}>
                {row.map(color => {
                  const sel = color === selected;
                  const light = isLight(color);
                  return (
                    <TouchableOpacity
                      key={color}
                      onPress={() => { onSelect(color); onClose(); }}
                      activeOpacity={0.8}
                      style={[
                        s.circleWrap,
                        sel && { borderWidth: 3, borderColor: C.text, borderRadius: (CIRCLE + 6) / 2 },
                      ]}
                    >
                      <View style={[s.circle, { backgroundColor: color }]}>
                        {sel && <CheckIcon dark={light} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
  },
  tabWrap: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 50,
    padding: 4,
    marginHorizontal: PADDING,
    marginBottom: 20,
    gap: 4,
  },
  tabPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
  },
  tabText: { fontSize: 14, fontWeight: "600" },

  grid: { paddingHorizontal: PADDING, paddingBottom: 20, gap: GAP },
  row: { flexDirection: "row", justifyContent: "space-between" },
  circleWrap: { padding: 2, borderRadius: (CIRCLE + 4) / 2 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
