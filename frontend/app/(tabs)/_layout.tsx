import { Tabs, useFocusEffect } from "expo-router";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { SvgXml } from "react-native-svg";
import { useTheme, useIsDark } from "../../src/hooks/useTheme";
import NewItemModal from "../../src/components/modals/NewItemModal";
import ProjectCreateSheet from "../../src/components/modals/ProjectCreateSheet";
import { useProject } from "../../src/contexts/ProjectContext";
import { ChatAPI } from "../../src/services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// ── assets/icons에서 가져온 SVG 경로 데이터 ──

// Home=Active.svg
const HOME_ACTIVE_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.9997 21.333V28H13.9997V21.333H17.9997ZM15.9997 6.60156C17.4794 6.60156 18.7223 7.66639 21.2067 9.7959L22.5397 10.9385C23.9142 12.1166 24.6015 12.7063 24.9675 13.502C25.3333 14.2975 25.3337 15.2026 25.3337 17.0127V22.667C25.3337 25.1807 25.3333 26.4377 24.5524 27.2188C23.8437 27.9275 22.7429 27.992 20.6667 27.998V21.333C20.6665 19.8604 19.4723 18.667 17.9997 18.667H13.9997C12.5272 18.6672 11.3339 19.8605 11.3337 21.333V27.998C9.25731 27.992 8.1567 27.9275 7.44794 27.2188C6.66693 26.4377 6.66669 25.1809 6.66669 22.667V17.0127C6.66669 15.2025 6.66705 14.2975 7.0329 13.502C7.39885 12.7063 8.08612 12.1166 9.46063 10.9385L10.7936 9.7959C13.2779 7.66655 14.5201 6.60172 15.9997 6.60156Z" fill="COLOR"/>
</svg>`;

// Home=Default.svg (외곽선 스타일 — 간소화 버전)
const HOME_DEFAULT_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.9997 21.333V28H13.9997V21.333H17.9997ZM15.9997 6.60156C17.4794 6.60156 18.7223 7.66639 21.2067 9.7959L22.5397 10.9385C23.9142 12.1166 24.6015 12.7063 24.9675 13.502C25.3333 14.2975 25.3337 15.2026 25.3337 17.0127V22.667C25.3337 25.1807 25.3333 26.4377 24.5524 27.2188C23.8437 27.9275 22.7429 27.992 20.6667 27.998V21.333C20.6665 19.8604 19.4723 18.667 17.9997 18.667H13.9997C12.5272 18.6672 11.3339 19.8605 11.3337 21.333V27.998C9.25731 27.992 8.1567 27.9275 7.44794 27.2188C6.66693 26.4377 6.66669 25.1809 6.66669 22.667V17.0127C6.66669 15.2025 6.66705 14.2975 7.0329 13.502C7.39885 12.7063 8.08612 12.1166 9.46063 10.9385L10.7936 9.7959C13.2779 7.66655 14.5201 6.60172 15.9997 6.60156Z" stroke="COLOR" stroke-width="1.5" fill="none"/>
</svg>`;

// Chat Value=Active, Status=Default.svg
const CHAT_ACTIVE_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.3333 5.33337C21.0783 5.33337 22.951 5.33317 24.2962 6.23181C24.8785 6.6209 25.3788 7.12118 25.7679 7.70349C26.6667 9.04864 26.6663 10.9214 26.6663 14.6664C26.6663 18.4113 26.6665 20.2841 25.7679 21.6293C25.3788 22.2116 24.8785 22.7118 24.2962 23.101C22.951 23.9998 21.0785 24.0004 17.3333 24.0004H14.6663C13.8896 24.0004 13.1934 23.9976 12.5657 23.9896L12.4681 24.2377L10.013 26.4379C9.19475 27.1706 7.89102 26.6551 7.79523 25.5609L7.57257 23.0092C7.0464 22.6343 6.59118 22.1672 6.23175 21.6293C5.33326 20.2841 5.33331 18.4111 5.33331 14.6664C5.33331 10.9214 5.33299 9.04864 6.23175 7.70349C6.62086 7.12114 7.12108 6.62092 7.70343 6.23181C9.04858 5.33305 10.9214 5.33337 14.6663 5.33337H17.3333ZM10.6663 13.3334C9.93021 13.3336 9.33349 13.9303 9.33331 14.6664C9.33331 15.4026 9.9301 16.0002 10.6663 16.0004C11.4027 16.0004 12.0003 15.4028 12.0003 14.6664C12.0001 13.9302 11.4026 13.3334 10.6663 13.3334ZM16.0003 13.3334C15.264 13.3334 14.6665 13.9302 14.6663 14.6664C14.6663 15.4028 15.2639 16.0004 16.0003 16.0004C16.7365 16.0002 17.3333 15.4027 17.3333 14.6664C17.3331 13.9303 16.7364 13.3335 16.0003 13.3334ZM21.3333 13.3334C20.5971 13.3334 20.0005 13.9302 20.0003 14.6664C20.0003 15.4028 20.5969 16.0004 21.3333 16.0004C22.0697 16.0004 22.6663 15.4028 22.6663 14.6664C22.6661 13.9302 22.0696 13.3334 21.3333 13.3334Z" fill="COLOR"/>
</svg>`;

// Chat Value=Default, Status=Default.svg (외곽선)
const CHAT_DEFAULT_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.3333 5.33337C21.0783 5.33337 22.951 5.33317 24.2962 6.23181C24.8785 6.6209 25.3788 7.12118 25.7679 7.70349C26.6667 9.04864 26.6663 10.9214 26.6663 14.6664C26.6663 18.4113 26.6665 20.2841 25.7679 21.6293C25.3788 22.2116 24.8785 22.7118 24.2962 23.101C22.951 23.9998 21.0785 24.0004 17.3333 24.0004H14.6663C13.8896 24.0004 13.1934 23.9976 12.5657 23.9896L12.4681 24.2377L10.013 26.4379C9.19475 27.1706 7.89102 26.6551 7.79523 25.5609L7.57257 23.0092C7.0464 22.6343 6.59118 22.1672 6.23175 21.6293C5.33326 20.2841 5.33331 18.4111 5.33331 14.6664C5.33331 10.9214 5.33299 9.04864 6.23175 7.70349C6.62086 7.12114 7.12108 6.62092 7.70343 6.23181C9.04858 5.33305 10.9214 5.33337 14.6663 5.33337H17.3333ZM10.6663 13.3334C9.93021 13.3336 9.33349 13.9303 9.33331 14.6664C9.33331 15.4026 9.9301 16.0002 10.6663 16.0004C11.4027 16.0004 12.0003 15.4028 12.0003 14.6664C12.0001 13.9302 11.4026 13.3334 10.6663 13.3334ZM16.0003 13.3334C15.264 13.3334 14.6665 13.9302 14.6663 14.6664C14.6663 15.4028 15.2639 16.0004 16.0003 16.0004C16.7365 16.0002 17.3333 15.4027 17.3333 14.6664C17.3331 13.9303 16.7364 13.3335 16.0003 13.3334ZM21.3333 13.3334C20.5971 13.3334 20.0005 13.9302 20.0003 14.6664C20.0003 15.4028 20.5969 16.0004 21.3333 16.0004C22.0697 16.0004 22.6663 15.4028 22.6663 14.6664C22.6661 13.9302 22.0696 13.3334 21.3333 13.3334Z" stroke="COLOR" stroke-width="1.2" fill="none"/>
</svg>`;

// ToDo=Active.svg
const TODO_ACTIVE_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 4C19.2133 4 22.1292 5.2656 24.2832 7.32227L14.4912 18.2021L10.1338 14.9336C9.54469 14.4918 8.70843 14.6111 8.2666 15.2002C7.82494 15.7893 7.94425 16.6256 8.5332 17.0674L12.8916 20.335C13.996 21.1629 15.5501 21.0122 16.4736 19.9863L26.0117 9.38672C27.2669 11.2831 28 13.5555 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4Z" fill="COLOR"/>
</svg>`;

// ToDo=Default.svg
const TODO_DEFAULT_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 4C19.2133 4 22.1292 5.2656 24.2832 7.32227L14.4912 18.2021L10.1338 14.9336C9.54469 14.4918 8.70843 14.6111 8.2666 15.2002C7.82494 15.7893 7.94425 16.6256 8.5332 17.0674L12.8916 20.335C13.996 21.1629 15.5501 21.0122 16.4736 19.9863L26.0117 9.38672C27.2669 11.2831 28 13.5555 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4Z" stroke="COLOR" stroke-width="1.5" fill="none"/>
</svg>`;

// Profile Value=Active, Status=Default.svg
const PROFILE_ACTIVE_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16Z" fill="COLOR"/>
<circle cx="16" cy="13.3333" r="5.33333" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.0003 20C19.6098 20.0001 22.7409 21.7563 24.2935 24.3263C24.3711 24.4547 24.3475 24.6193 24.2384 24.7223C22.0891 26.7533 19.1908 27.9999 16.0003 28C12.8099 28 9.91167 26.7532 7.7623 24.7224C7.6532 24.6193 7.62956 24.4547 7.70717 24.3263C9.25992 21.7564 12.3909 20 16.0003 20Z" fill="white"/>
</svg>`;

// Profile Value=Default, Status=Default.svg
const PROFILE_DEFAULT_XML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16Z" fill="#F1F1F5"/>
<circle cx="16" cy="13.3333" r="5.33333" fill="COLOR"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.0003 20C19.6098 20.0001 22.7409 21.7563 24.2935 24.3263C24.3711 24.4547 24.3475 24.6193 24.2384 24.7223C22.0891 26.7533 19.1908 27.9999 16.0003 28C12.8099 28 9.91167 26.7532 7.7623 24.7224C7.6532 24.6193 7.62956 24.4547 7.70717 24.3263C9.25992 21.7564 12.3909 20 16.0003 20Z" fill="COLOR"/>
</svg>`;

// Add.svg (흰색으로 고정)
const ADD_XML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 6L12 18" stroke="white" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="round"/>
<path d="M18 12L6 12" stroke="white" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="round"/>
</svg>`;

// ── 아이콘 컴포넌트 ────────────────────────────
function TabIcon({
  focused,
  activeXml,
  defaultXml,
  color,
  showDot = false,
}: {
  focused: boolean;
  activeXml: string;
  defaultXml: string;
  color: string;
  showDot?: boolean;
}) {
  const xml = (focused ? activeXml : defaultXml).replace(/COLOR/g, color);
  return (
    <View>
      <SvgXml xml={xml} width={26} height={26} />
      {showDot && (
        <View style={{
          position: "absolute", top: -1, right: -2,
          width: 9, height: 9, borderRadius: 5,
          backgroundColor: "#FF3B30", borderWidth: 1.5, borderColor: "#fff",
        }} />
      )}
    </View>
  );
}

// ── + 버튼 ──────────────────────────────────────
function PlusButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.plusWrapper}>
      <View style={[styles.plusCircle, { backgroundColor: color }]}>
        <SvgXml xml={ADD_XML} width={24} height={24} />
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 레이아웃 ────────────────────────────────
export default function TabsLayout() {
  const C = useTheme();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addProject } = useProject();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(false);

  // 안읽은 채팅 있으면 채팅 탭에 빨간 점
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () =>
        ChatAPI.rooms()
          .then((rooms) => { if (active) setChatUnread(rooms.some((r) => (r.unread_count ?? 0) > 0)); })
          .catch(() => {});
      load();
      const t = setInterval(load, 8000);
      return () => { active = false; clearInterval(t); };
    }, [])
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.tabBar,
            borderTopColor: C.tabBorder,
            borderTopWidth: 1,
            height: (Platform.OS === "ios" ? 60 : 56) + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === "ios" ? 24 : 8),
            paddingTop: 8,
            ...(isDark ? { elevation: 0, shadowOpacity: 0 } : {}),
          },
          tabBarActiveTintColor: C.tabActive,
          tabBarInactiveTintColor: C.tabInactive,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "홈",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeXml={HOME_ACTIVE_XML}
                defaultXml={HOME_DEFAULT_XML}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "채팅",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeXml={CHAT_ACTIVE_XML}
                defaultXml={CHAT_DEFAULT_XML}
                color={color}
                showDot={chatUnread}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="new"
          options={{
            title: "",
            tabBarButton: () => (
              <PlusButton onPress={() => setIsModalOpen(true)} color={C.primary} />
            ),
          }}
          listeners={{ tabPress: (e) => { e.preventDefault(); setIsModalOpen(true); } }}
        />
        <Tabs.Screen
          name="todos"
          options={{
            title: "To-Do",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeXml={TODO_ACTIVE_XML}
                defaultXml={TODO_DEFAULT_XML}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "프로필",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeXml={PROFILE_ACTIVE_XML}
                defaultXml={PROFILE_DEFAULT_XML}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      <NewItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOpenCreate={() => setIsCreateOpen(true)}
      />
      <ProjectCreateSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (project) => {
          try {
            const created = await addProject(project);
            setIsCreateOpen(false);
            router.push(`/(screens)/project/${created.id}` as any);
          } catch {
            Alert.alert("오류", "프로젝트 생성에 실패했습니다. 다시 시도해주세요.");
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  plusWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 0,
  },
  plusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    shadowColor: "#00A9EC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
