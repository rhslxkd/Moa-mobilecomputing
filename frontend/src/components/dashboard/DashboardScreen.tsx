import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { BlurView } from "expo-blur";
import { useTheme, useIsDark } from "../../hooks/useTheme";
import { useProject, type Project } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Theme } from "../../constants/theme";
import AlarmModal from "../modals/AlarmModal";

// ── assets 아이콘 SVG 문자열 ──────────────────

import MoaLogo from "../common/MoaLogo";

const SEARCH_XML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="11" cy="11" r="7" stroke="COLOR" stroke-width="2"/>
<path d="M20 20L16.25 16.25" stroke="COLOR" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const ALARM_INDICATED_XML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12.0003 2C12.8649 2.00003 13.6938 2.16786 14.4544 2.47363C13.9702 2.96043 13.5871 3.54724 13.3353 4.19922C12.9117 4.07037 12.4636 4.00003 12.0003 4C9.66335 4 7.69979 5.75743 7.44171 8.08008L7.18975 10.3457C7.18662 10.3739 7.18481 10.3908 7.18292 10.4072C7.03786 11.6713 6.62659 12.8909 5.97589 13.9844C5.9675 13.9985 5.95905 14.0131 5.94464 14.0371L5.36651 15C5.09305 15.4558 4.92791 15.7334 4.83038 15.9404C4.82559 15.9506 4.82178 15.9606 4.81768 15.9697C4.82803 15.971 4.83911 15.9744 4.85089 15.9756C5.07861 15.9985 5.40156 16 5.93292 16H18.0677C18.5991 16 18.922 15.9985 19.1497 15.9756C19.1611 15.9744 19.1719 15.9709 19.1819 15.9697C19.1779 15.9607 19.1749 15.9505 19.1702 15.9404C19.0727 15.7334 18.9076 15.4558 18.6341 15L18.056 14.0371C18.0416 14.0131 18.0331 13.9985 18.0247 13.9844C17.4543 13.0259 17.0675 11.9705 16.8831 10.873C17.2424 10.955 17.6162 11 18.0003 11C18.3171 11 18.6266 10.9685 18.9271 10.9121C19.0886 11.6324 19.3644 12.3239 19.7435 12.9609C19.7497 12.9713 19.7556 12.9825 19.7708 13.0078L20.3489 13.9707C20.6 14.3891 20.8292 14.7682 20.9798 15.0879C21.1279 15.4023 21.2854 15.8286 21.2093 16.3115C21.134 16.7889 20.8884 17.2229 20.5179 17.5332C20.1429 17.8471 19.6958 17.931 19.3499 17.9658C18.9983 18.0012 18.5555 18 18.0677 18H5.93292C5.44512 18 5.00231 18.0012 4.65069 17.9658C4.30485 17.931 3.85776 17.847 3.48272 17.5332C3.11215 17.2229 2.86666 16.7889 2.79132 16.3115C2.71514 15.8285 2.87272 15.4024 3.02081 15.0879C3.17141 14.7682 3.40065 14.3891 3.65167 13.9707L4.22979 13.0078C4.245 12.9825 4.25093 12.9714 4.25714 12.9609C4.76316 12.1106 5.08373 11.1627 5.19659 10.1797C5.19798 10.1676 5.19917 10.1545 5.20245 10.125L5.4544 7.85938C5.82503 4.52386 8.64426 2 12.0003 2Z" fill="COLOR"/>
<path d="M9.10222 17.6647C9.27315 18.6215 9.64978 19.467 10.1737 20.0701C10.6976 20.6731 11.3396 21 12 21C12.6604 21 13.3024 20.6731 13.8263 20.0701C14.3502 19.467 14.7269 18.6215 14.8978 17.6647" stroke="COLOR" stroke-width="2" stroke-linecap="round"/>
<circle cx="18" cy="6" r="2.5" fill="#FF1B1B" stroke="#FF1B1B"/>
</svg>`;

const FOLDER_XML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 9C4 7.11438 4 6.17157 4.58579 5.58579C5.17157 5 6.11438 5 8 5H8.34315C9.16065 5 9.5694 5 9.93694 5.15224C10.3045 5.30448 10.5935 5.59351 11.1716 6.17157L11.8284 6.82843C12.4065 7.40649 12.6955 7.69552 13.0631 7.84776C13.4306 8 13.8394 8 14.6569 8H16C17.8856 8 18.8284 8 19.4142 8.58579C20 9.17157 20 10.1144 20 12V15C20 16.8856 20 17.8284 19.4142 18.4142C18.8284 19 17.8856 19 16 19H8C6.11438 19 5.17157 19 4.58579 18.4142C4 17.8284 4 16.8856 4 15V9Z" fill="COLOR"/>
</svg>`;

const CHAT_ACTIVE_INDICATED_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M17.3333 5.33338C18.3341 5.33338 19.2012 5.33285 19.9603 5.34998C19.8771 5.77596 19.8333 6.21607 19.8333 6.66638C19.8333 10.4396 22.8915 13.4972 26.6644 13.4984C26.6656 13.8663 26.6663 14.2551 26.6663 14.6664C26.6663 18.4113 26.6665 20.2841 25.7679 21.6293C25.3788 22.2116 24.8785 22.7118 24.2962 23.101C22.951 23.9998 21.0785 24.0004 17.3333 24.0004H14.6663C13.8896 24.0004 13.1934 23.9976 12.5657 23.9896L12.4681 24.2377L10.013 26.4379C9.19475 27.1706 7.89102 26.6551 7.79523 25.5609L7.57257 23.0092C7.0464 22.6343 6.59118 22.1672 6.23175 21.6293C5.33326 20.2841 5.33331 18.4111 5.33331 14.6664C5.33331 10.9214 5.33299 9.04864 6.23175 7.70349C6.62086 7.12115 7.12108 6.62093 7.70343 6.23181C9.04858 5.33305 10.9214 5.33338 14.6663 5.33338H17.3333ZM10.6663 13.3334C9.93021 13.3336 9.33349 13.9303 9.33331 14.6664C9.33331 15.4026 9.9301 16.0002 10.6663 16.0004C11.4027 16.0004 12.0003 15.4028 12.0003 14.6664C12.0001 13.9302 11.4026 13.3334 10.6663 13.3334ZM16.0003 13.3334C15.264 13.3334 14.6665 13.9302 14.6663 14.6664C14.6663 15.4028 15.2639 16.0004 16.0003 16.0004C16.7365 16.0002 17.3333 15.4027 17.3333 14.6664C17.3331 13.9303 16.7364 13.3335 16.0003 13.3334ZM21.3333 13.3334C20.5971 13.3334 20.0005 13.9302 20.0003 14.6664C20.0003 15.4028 20.5969 16.0004 21.3333 16.0004C22.0697 16.0004 22.6663 15.4028 22.6663 14.6664C22.6661 13.9302 22.0696 13.3334 21.3333 13.3334Z" fill="COLOR"/>
<circle cx="26.6667" cy="6.66667" r="3.33333" fill="#FF1B1B" stroke="#FF1B1B" stroke-width="1.33333"/>
</svg>`;

const CHAT_ACTIVE_DEFAULT_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.3333 5.33337C21.0783 5.33337 22.951 5.33317 24.2962 6.23181C24.8785 6.6209 25.3788 7.12118 25.7679 7.70349C26.6667 9.04864 26.6663 10.9214 26.6663 14.6664C26.6663 18.4113 26.6665 20.2841 25.7679 21.6293C25.3788 22.2116 24.8785 22.7118 24.2962 23.101C22.951 23.9998 21.0785 24.0004 17.3333 24.0004H14.6663C13.8896 24.0004 13.1934 23.9976 12.5657 23.9896L12.4681 24.2377L10.013 26.4379C9.19475 27.1706 7.89102 26.6551 7.79523 25.5609L7.57257 23.0092C7.0464 22.6343 6.59118 22.1672 6.23175 21.6293C5.33326 20.2841 5.33331 18.4111 5.33331 14.6664C5.33331 10.9214 5.33299 9.04864 6.23175 7.70349C6.62086 7.12114 7.12108 6.62092 7.70343 6.23181C9.04858 5.33305 10.9214 5.33337 14.6663 5.33337H17.3333ZM10.6663 13.3334C9.93021 13.3336 9.33349 13.9303 9.33331 14.6664C9.33331 15.4026 9.9301 16.0002 10.6663 16.0004C11.4027 16.0004 12.0003 15.4028 12.0003 14.6664C12.0001 13.9302 11.4026 13.3334 10.6663 13.3334ZM16.0003 13.3334C15.264 13.3334 14.6665 13.9302 14.6663 14.6664C14.6663 15.4028 15.2639 16.0004 16.0003 16.0004C16.7365 16.0002 17.3333 15.4027 17.3333 14.6664C17.3331 13.9303 16.7364 13.3335 16.0003 13.3334ZM21.3333 13.3334C20.5971 13.3334 20.0005 13.9302 20.0003 14.6664C20.0003 15.4028 20.5969 16.0004 21.3333 16.0004C22.0697 16.0004 22.6663 15.4028 22.6663 14.6664C22.6661 13.9302 22.0696 13.3334 21.3333 13.3334Z" fill="COLOR"/>
</svg>`;

const TODO_ACTIVE_INDICATED_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 4C17.655 4 19.2316 4.33544 20.666 4.94141C20.0324 5.97791 19.667 7.19619 19.667 8.5C19.667 9.62252 19.9394 10.6809 20.4189 11.6152L14.4912 18.2021L10.1338 14.9336C9.54469 14.4918 8.70843 14.6111 8.2666 15.2002C7.82494 15.7893 7.94425 16.6256 8.5332 17.0674L12.8916 20.335C13.996 21.1629 15.5501 21.0122 16.4736 19.9863L22.1035 13.7295C23.2919 14.7296 24.8251 15.333 26.5 15.333C27.0051 15.333 27.4968 15.2758 27.9707 15.1719C27.9894 15.4455 28 15.7216 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4Z" fill="COLOR"/>
<path d="M26.667 5.33301C28.5078 5.33321 30 6.82616 30 8.66699C29.9998 10.5077 28.5077 11.9998 26.667 12C24.8261 12 23.3332 10.5078 23.333 8.66699C23.333 6.82604 24.826 5.33301 26.667 5.33301Z" fill="#FF1B1B" stroke="#FF1B1B" stroke-width="1.33333"/>
</svg>`;

const TODO_ACTIVE_DEFAULT_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 4C19.2133 4 22.1292 5.2656 24.2832 7.32227L14.4912 18.2021L10.1338 14.9336C9.54469 14.4918 8.70843 14.6111 8.2666 15.2002C7.82494 15.7893 7.94425 16.6256 8.5332 17.0674L12.8916 20.335C13.996 21.1629 15.5501 21.0122 16.4736 19.9863L26.0117 9.38672C27.2669 11.2831 28 13.5555 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4Z" fill="COLOR"/>
</svg>`;

// ── 아이콘 컴포넌트 ──────────────────────────
function SearchIcon({ color }: { color: string }) {
  return <SvgXml xml={SEARCH_XML.replace(/COLOR/g, color)} width={22} height={22} />;
}
function AlarmIndicatedIcon({ color }: { color: string }) {
  return <SvgXml xml={ALARM_INDICATED_XML.replace(/COLOR/g, color)} width={22} height={22} />;
}
function FolderIcon({ color }: { color: string }) {
  return <SvgXml xml={FOLDER_XML.replace(/COLOR/g, color)} width={20} height={20} />;
}
function ChatIndicatedIcon({ color }: { color: string }) {
  return <SvgXml xml={CHAT_ACTIVE_INDICATED_XML.replace(/COLOR/g, color)} width={24} height={24} />;
}
function ChatDefaultIcon({ color }: { color: string }) {
  return <SvgXml xml={CHAT_ACTIVE_DEFAULT_XML.replace(/COLOR/g, color)} width={24} height={24} />;
}
function TodoIndicatedIcon({ color }: { color: string }) {
  return <SvgXml xml={TODO_ACTIVE_INDICATED_XML.replace(/COLOR/g, color)} width={24} height={24} />;
}
function TodoDefaultIcon({ color }: { color: string }) {
  return <SvgXml xml={TODO_ACTIVE_DEFAULT_XML.replace(/COLOR/g, color)} width={24} height={24} />;
}

// ── 상태 배지 설정 ───────────────────────────
const STATUS_CONFIG = {
  active: { label: "진행중", color: "#00A9EC", bg: "#E6F7FD" },
  upcoming: { label: "예정", color: "#7C3AED", bg: "#F5F3FF" },
  completed: { label: "완료", color: "#16A34A", bg: "#F0FDF4" },
} as const;

// ── 메인 컴포넌트 ────────────────────────────
export default function DashboardScreen() {
  const C = useTheme();
  const isDark = useIsDark();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, currentProject, setCurrentProject } = useProject();
  const { user } = useAuth();
  const displayName = user?.fullName || user?.username || "";
  const s = makeStyles(C, isDark, insets);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("생성 날짜 · 내림차순");
  const [selectedFilter, setSelectedFilter] = useState("전체");

  const SORT_OPTIONS = ["제목 · 오름차순", "제목 · 내림차순", "생성 날짜 · 오름차순", "생성 날짜 · 내림차순"];
  const FILTER_OPTIONS = ["전체", "진행중", "예정", "완료"];

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    if (selectedFilter !== "전체") {
      const statusMap: Record<string, string> = { "진행중": "active", "예정": "upcoming", "완료": "completed" };
      result = result.filter(p => p.status === statusMap[selectedFilter]);
    }

    if (selectedSort === "제목 · 오름차순") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (selectedSort === "제목 · 내림차순") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (selectedSort === "생성 날짜 · 오름차순") {
      result.sort((a, b) => Number(a.id) - Number(b.id)); // 임시 데이터의 id 순서
    } else if (selectedSort === "생성 날짜 · 내림차순") {
      result.sort((a, b) => Number(b.id) - Number(a.id));
    }

    return result;
  }, [projects, selectedFilter, selectedSort]);

  return (
    <View style={s.safeArea}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── 헤더 ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoWrapper}>
            <MoaLogo size={48} />
          </View>
          <Text style={s.headerTitle}>
            <Text style={{ fontWeight: "800" }}>{displayName}</Text>님의 프로젝트
          </Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => setSearchOpen(true)}>
            <SearchIcon color={C.textSub} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => setAlarmOpen(true)}
          >
            <AlarmIndicatedIcon color={C.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        {/* ── 스크롤 바디 ── */}
        <ScrollView
          style={[s.scroll, { flex: 1 }]}
          contentContainerStyle={[s.scrollContent, { paddingTop: 50 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredAndSortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={project.id === currentProject.id}
              onSelect={() => {
                setCurrentProject(project);
                router.push(`/(screens)/project/${project.id}`);
              }}
              C={C}
              isDark={isDark}
              onMeeting={() => {
                setCurrentProject(project);
                router.push("/(screens)/meeting");
              }}
              onReport={() => {
                setCurrentProject(project);
                router.push(`/(screens)/report/${project.id}`);
              }}
              onFolder={() => {
                setCurrentProject(project);
                router.push("/(screens)/drive" as any);
              }}
              onChat={() => {
                setCurrentProject(project);
                router.push(`/(screens)/chat/${project.id}`);
              }}
              onTodo={() => {
                setCurrentProject(project);
                router.push(`/(screens)/todo/${project.id}` as any);
              }}
            />
          ))}
        </ScrollView>

        {/* ── 정렬/필터 바 (플로팅) ── */}
        <View style={[s.filterBar, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }]} pointerEvents="box-none">
          <TouchableOpacity onPress={() => { setSortMenuOpen(!sortMenuOpen); setFilterMenuOpen(false); }} activeOpacity={0.6}>
            <SvgXml
              xml={`<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 7H19" stroke="${C.textMuted}" stroke-linecap="round"/><path d="M5 12H15" stroke="${C.textMuted}" stroke-linecap="round"/><path d="M5 17H11" stroke="${C.textMuted}" stroke-linecap="round"/></svg>`}
              width={24} height={24}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setFilterMenuOpen(!filterMenuOpen); setSortMenuOpen(false); }} activeOpacity={0.6}>
            <SvgXml
              xml={`<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 17.6396L15.5 17.6397V17.6396H15ZM14.6582 18.1143L14.8163 18.5886L14.8163 18.5886L14.6582 18.1143ZM9.6582 19.7803L9.50014 19.3059L9.50009 19.3059L9.6582 19.7803ZM9 19.3066H8.5V19.307L9 19.3066ZM8.70711 11.7071L9.06066 11.3536L8.70711 11.7071ZM15.2929 11.7071L14.9393 11.3536L15.2929 11.7071ZM19.7071 7.29289L20.0607 7.64645L19.7071 7.29289ZM19.7071 7.29289L19.3536 6.93934L14.9393 11.3536L15.2929 11.7071L15.6464 12.0607L20.0607 7.64645L19.7071 7.29289ZM15 12.4142H14.5V17.6396H15H15.5V12.4142H15ZM14.6582 18.1143L14.5001 17.6399L9.50014 19.3059L9.6582 19.7803L9.81626 20.2546L14.8163 18.5886L14.6582 18.1143ZM9 19.3066H9.5V12.4142H9H8.5V19.3066H9ZM8.70711 11.7071L9.06066 11.3536L4.64645 6.93934L4.29289 7.29289L3.93934 7.64645L8.35355 12.0607L8.70711 11.7071ZM4 6.58579H4.5V5H4H3.5V6.58579H4ZM5 4V4.5H19V4V3.5H5V4ZM20 5H19.5V6.58579H20H20.5V5H20ZM4.29289 7.29289L4.64645 6.93934C4.55268 6.84557 4.5 6.71839 4.5 6.58579H4H3.5C3.5 6.98361 3.65804 7.36514 3.93934 7.64645L4.29289 7.29289ZM15.2929 11.7071L14.9393 11.3536C14.658 11.6349 14.5 12.0164 14.5 12.4142H15H15.5C15.5 12.2816 15.5527 12.1544 15.6464 12.0607L15.2929 11.7071ZM19.7071 7.29289L20.0607 7.64645C20.342 7.36514 20.5 6.98361 20.5 6.58579H20H19.5C19.5 6.71839 19.4473 6.84557 19.3536 6.93934L19.7071 7.29289Z" fill="${C.textMuted}"/></svg>`}
              width={24} height={24}
            />
          </TouchableOpacity>

          {/* 정렬 드롭다운 (배경 흐림 + 그림자 포함) */}
          {sortMenuOpen && (
            <View style={[s.dropdownWrapper, { right: 54 }]}>
              <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={s.dropdownBlur}>
                {SORT_OPTIONS.map((opt, i) => (
                  <TouchableOpacity key={i} style={s.dropdownItem} onPress={() => { setSelectedSort(opt); setSortMenuOpen(false); }}>
                    <Text style={[s.dropdownText, selectedSort === opt && { color: C.text, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </BlurView>
            </View>
          )}

          {/* 필터 드롭다운 (배경 흐림 + 그림자 포함) */}
          {filterMenuOpen && (
            <View style={[s.dropdownWrapper, { right: 14 }]}>
              <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={s.dropdownBlur}>
                {FILTER_OPTIONS.map((opt, i) => (
                  <TouchableOpacity key={i} style={s.dropdownItem} onPress={() => { setSelectedFilter(opt); setFilterMenuOpen(false); }}>
                    <Text style={[s.dropdownText, selectedFilter === opt && { color: C.text, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </BlurView>
            </View>
          )}
        </View>

        {/* 바탕 터치 시 메뉴 닫기용 투명 레이어 */}
        {(sortMenuOpen || filterMenuOpen) && (
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
            onPress={() => { setSortMenuOpen(false); setFilterMenuOpen(false); }}
            activeOpacity={1}
          />
        )}
      </View>

      {/* ── 검색 모달 (오버레이) ── */}
      {searchOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <SafeAreaView style={{ backgroundColor: C.bgCard }}>
            <View style={{ backgroundColor: C.bgCard, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 }}>
              {/* 헤더 부분 */}
              <View style={s.header}>
                <View style={[s.headerLeft, { flex: 1 }]}>
                  <View style={[s.logoWrapper, { marginRight: 8 }]}>
                    <MoaLogo size={36} />
                  </View>
                  <TextInput
                    style={{ flex: 1, fontSize: 16, color: C.text }}
                    placeholder="프로젝트 검색..."
                    placeholderTextColor={C.textMuted}
                    autoFocus
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <View style={s.headerRight}>
                  <TouchableOpacity
                    style={s.iconBtn}
                    activeOpacity={0.7}
                    onPress={() => { setSearchOpen(false); setSearchQuery(""); }}
                  >
                    <SearchIcon color={C.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconBtn}
                    activeOpacity={0.7}
                    onPress={() => setAlarmOpen(true)}
                  >
                    <AlarmIndicatedIcon color={C.textSub} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 파란색 구분선 */}
              <View style={{ height: 1, backgroundColor: "#00A9EC", opacity: 0.5 }} />

              {/* 검색 결과 리스트 */}
              <View style={{ paddingBottom: 8 }}>
                {projects
                  .filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}
                      onPress={() => {
                        setCurrentProject(p);
                        setSearchOpen(false);
                        setSearchQuery("");
                        router.push(`/(screens)/project/${p.id}`);
                      }}
                    >
                      <Text style={{ fontSize: 20, marginRight: 14 }}>{p.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: C.text, fontWeight: "600" }}>{p.name}</Text>
                        <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>팀원 {p.memberCount}명 · D-{p.daysLeft}</Text>
                      </View>
                      <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }, { backgroundColor: STATUS_CONFIG[p.status].bg }]}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: STATUS_CONFIG[p.status].color }}>{STATUS_CONFIG[p.status].label}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                {searchQuery.trim() && projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Text style={{ fontSize: 15, color: C.textMuted }}>검색 결과가 없습니다</Text>
                  </View>
                )}
              </View>
            </View>
          </SafeAreaView>
          {/* 바깥 터치 시 닫기 */}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setSearchOpen(false); setSearchQuery(""); }} />
        </View>
      )}

      {/* 알림 모달 */}
      <AlarmModal isOpen={alarmOpen} onClose={() => setAlarmOpen(false)} />
    </View>
  );
}

// ── 카카오톡 스타일 그룹 아바타 ──────────────────
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

function KakaoGroupAvatar({ memberCount, bgCard }: { memberCount: number, bgCard: string }) {
  const count = Math.max(1, Math.min(memberCount, 4));
  const size = 48;
  const BG_COLORS = ["#A1C4DF", "#99BCCC", "#A9B3D6", "#B9B2D8"]; // 카카오 프로필 파스텔 톤

  if (count <= 1) {
    return <DummyAvatar size={size} color={BG_COLORS[0]} radius={20} />;
  }

  if (count === 2) {
    const s = 30;
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <DummyAvatar size={s} color={BG_COLORS[0]} radius={12} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: 14, backgroundColor: bgCard, padding: 2 }}>
          <DummyAvatar size={s} color={BG_COLORS[1]} radius={12} />
        </View>
      </View>
    );
  }

  if (count === 3) {
    const s = 23;
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: size / 2 - s / 2 }}>
          <DummyAvatar size={s} color={BG_COLORS[0]} radius={9} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0 }}>
          <DummyAvatar size={s} color={BG_COLORS[1]} radius={9} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0 }}>
          <DummyAvatar size={s} color={BG_COLORS[2]} radius={9} />
        </View>
      </View>
    );
  }

  const s = 23;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' }}>
      <DummyAvatar size={s} color={BG_COLORS[0]} radius={8.5} />
      <DummyAvatar size={s} color={BG_COLORS[1]} radius={8.5} />
      <DummyAvatar size={s} color={BG_COLORS[2]} radius={8.5} />
      <DummyAvatar size={s} color={BG_COLORS[3]} radius={8.5} />
    </View>
  );
}

// ── 프로젝트 카드 ────────────────────────────
interface ProjectCardProps {
  project: Project;
  isSelected?: boolean;
  onSelect?: () => void;
  C: Theme;
  isDark: boolean;
  onMeeting: () => void;
  onReport: () => void;
  onFolder: () => void;
  onChat: () => void;
  onTodo: () => void;
}

function ProjectCard({ project, isSelected, onSelect, C, isDark, onMeeting, onReport, onFolder, onChat, onTodo }: ProjectCardProps) {
  const s = makeStyles(C, isDark);
  const { label, color: statusColor, bg: statusBg } = STATUS_CONFIG[project.status];

  // 프로젝트 컬러
  const dotColor = project.color;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onSelect}
      style={[
        s.card,
        isSelected && { borderColor: C.primary, borderWidth: 1.5 }
      ]}
    >
      <View style={s.cardBody}>
        {/* 왼쪽 영역 */}
        <View style={s.cardLeft}>
          <View style={s.cardHeaderRow}>
            <KakaoGroupAvatar memberCount={project.memberCount} bgCard={C.bgCard} />
            <View style={s.projectInfo}>
              <Text style={[s.projectName, { color: C.text }]} numberOfLines={1}>
                {project.name}
              </Text>
              <View style={s.metaRow}>
                <Text style={[s.projectMeta, { color: C.textMuted }]}>
                  팀원 {project.memberCount}명 · D-{project.daysLeft}
                </Text>
                <View style={[s.badge, { backgroundColor: statusBg }]}>
                  <Text style={[s.badgeText, { color: statusColor }]}>{label}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.btnMeeting, { backgroundColor: C.primary }]}
              onPress={onMeeting}
              activeOpacity={0.85}
            >
              <Text style={s.btnMeetingText}>회의 시작</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnReport} onPress={onReport} activeOpacity={0.7}>
              <Text style={s.btnReportText}>기여도 리포트</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 오른쪽 아이콘 열 */}
        <View style={s.cardRight}>
          <TouchableOpacity onPress={onFolder} activeOpacity={0.7} style={s.sideIconBtn}>
            <FolderIcon color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onChat} activeOpacity={0.7} style={s.sideIconBtn}>
            {project.hasChatAlert ? <ChatIndicatedIcon color={C.primary} /> : <ChatDefaultIcon color={C.primary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={onTodo} activeOpacity={0.7} style={s.sideIconBtn}>
            {project.hasTodoAlert ? <TodoIndicatedIcon color={C.primary} /> : <TodoDefaultIcon color={C.primary} />}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 스타일 팩토리 ────────────────────────────
function makeStyles(C: Theme, isDark: boolean, insets?: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: C.bg,
      paddingTop: insets ? Math.max(insets.top, 0) : 0,
    },

    // 헤더
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.bgCard,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    logoWrapper: {
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#00A9EC",
      letterSpacing: 1,
      marginTop: -2,
    },
    headerTitle: {
      fontSize: 16,
      color: C.text,
      marginLeft: 4,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    iconBtn: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "transparent",
      borderStyle: "dashed", // 피그마에 있는 모양을 보조
    },

    // 정렬/필터 바
    filterBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: "transparent",
      position: "relative",
    },
    dropdownWrapper: {
      position: "absolute",
      top: 40, // Below the icons
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      borderRadius: 16,
    },
    dropdownBlur: {
      backgroundColor: isDark ? "rgba(30,30,30,0.15)" : "rgba(255,255,255,0.25)", // Let BlurView's natural tint do most of the white work, just add a subtle white boost!
      borderRadius: 16,
      overflow: "hidden", // Bounds the blur properly
      paddingVertical: 12,
      paddingHorizontal: 16,
      minWidth: 130,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.4)",
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    dropdownText: {
      fontSize: 15,
      color: C.textSub,
      fontWeight: "500",
    },

    // 스크롤
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 32,
      gap: 16,
    },

    // 카드
    card: {
      backgroundColor: C.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 20,
      ...(isDark ? {} : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }),
    },
    cardBody: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardLeft: {
      flex: 1,
      flexDirection: "column",
      gap: 20,
      paddingRight: 16,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    // 아바타
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      flexShrink: 0,
    },

    // 프로젝트 정보
    projectInfo: {
      flex: 1,
      gap: 6,
      paddingTop: 2,
    },
    projectName: {
      fontSize: 16,
      fontWeight: "700",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    projectMeta: {
      fontSize: 12,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "transparent",
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
    },

    // 오른쪽 아이콘 열
    cardRight: {
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      flexShrink: 0,
      justifyContent: "space-between",
    },
    sideIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: C.border,
    },

    // 하단 액션
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    btnMeeting: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      paddingVertical: 12,
    },
    btnMeetingText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    btnReport: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      paddingVertical: 12,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: C.border,
    },
    btnReportText: {
      color: C.textSub,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
