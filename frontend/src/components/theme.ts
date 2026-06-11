/**
 * src/constants/theme.ts
 *
 * MOA 앱 전체 색상 팔레트
 * - 라이트: 흰 배경 + 블루 포인트
 * - 다크: 딥 네이비 배경 + 블루 포인트
 *
 * 사용법:
 *   import { LIGHT, DARK } from "@/constants/theme";
 *   // 직접 쓰기보단 useTheme() 훅을 통해 사용 권장
 */

export const LIGHT = {
  // ── 배경 ──────────────────────────────
  bg:          "#F8FAFC",   // 전체 페이지 배경
  bgCard:      "#FFFFFF",   // 카드 · 헤더 · 바텀시트
  bgMuted:     "#F1F5F9",   // 입력창 · 비활성 영역
  bgOverlay:   "rgba(0,0,0,0.4)", // 모달 오버레이

  // ── 텍스트 ────────────────────────────
  text:        "#0F172A",   // 주요 텍스트
  textSub:     "#334155",   // 서브 텍스트
  textMuted:   "#94A3B8",   // 플레이스홀더 · 비활성

  // ── 테두리 ────────────────────────────
  border:      "#E2E8F0",
  borderStrong:"#CBD5E1",

  // ── 브랜드 (Blue) ─────────────────────
  primary:     "#2563EB",
  primaryHover:"#1D4ED8",
  primaryFg:   "#FFFFFF",
  primaryBg:   "#EFF6FF",   // 연한 파랑 배경
  primaryMuted:"#BFDBFE",   // 더 연한 파랑

  // ── 성공 (Green) ──────────────────────
  success:     "#16A34A",
  successFg:   "#FFFFFF",
  successBg:   "#F0FDF4",

  // ── 경고 (Amber) ──────────────────────
  warning:     "#D97706",
  warningBg:   "#FFFBEB",

  // ── 위험 (Red) ────────────────────────
  danger:      "#DC2626",
  dangerFg:    "#FFFFFF",
  dangerBg:    "#FEF2F2",

  // ── 보조 컬러 (프로젝트 카드용) ────────
  purple:      "#7C3AED",
  purpleBg:    "#F5F3FF",
  teal:        "#0D9488",
  tealBg:      "#F0FDFA",

  // ── 탭바 ──────────────────────────────
  tabBar:      "#FFFFFF",
  tabBorder:   "#E2E8F0",
  tabActive:   "#2563EB",
  tabInactive: "#94A3B8",
} as const;

export const DARK = {
  // ── 배경 ──────────────────────────────
  bg:          "#07080E",   // 전체 페이지 최심부
  bgCard:      "#0F1018",   // 카드 · 헤더
  bgMuted:     "#171A28",   // 입력창 · 중간 레이어
  bgOverlay:   "rgba(0,0,0,0.6)",

  // ── 텍스트 ────────────────────────────
  text:        "#EDEAF8",
  textSub:     "#9896B8",
  textMuted:   "#5C5A7A",

  // ── 테두리 ────────────────────────────
  border:      "#222538",
  borderStrong:"#2A2E48",

  // ── 브랜드 (Blue) ─────────────────────
  primary:     "#4B6CF5",
  primaryHover:"#6080FF",
  primaryFg:   "#FFFFFF",
  primaryBg:   "rgba(75,108,245,0.12)",
  primaryMuted:"rgba(75,108,245,0.25)",

  // ── 성공 (Green) ──────────────────────
  success:     "#22C55E",
  successFg:   "#FFFFFF",
  successBg:   "rgba(34,197,94,0.12)",

  // ── 경고 (Amber) ──────────────────────
  warning:     "#F59E0B",
  warningBg:   "rgba(245,158,11,0.12)",

  // ── 위험 (Red) ────────────────────────
  danger:      "#EF4444",
  dangerFg:    "#FFFFFF",
  dangerBg:    "rgba(239,68,68,0.10)",

  // ── 보조 컬러 ─────────────────────────
  purple:      "#A78BFA",
  purpleBg:    "rgba(167,139,250,0.12)",
  teal:        "#2DD4BF",
  tealBg:      "rgba(45,212,191,0.12)",

  // ── 탭바 ──────────────────────────────
  tabBar:      "#0F1018",
  tabBorder:   "#222538",
  tabActive:   "#4B6CF5",
  tabInactive: "#5C5A7A",
} as const;

// 타입 추출 — 컴포넌트에서 C: Theme 으로 타입 지정 가능
export type Theme = typeof LIGHT;