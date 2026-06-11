import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { ChatAPI, MessageDTO } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MEDIA_SIZE = (SCREEN_WIDTH - 3) / 3;
const URL_RE = /(https?:\/\/[^\s]+)/;

type ArchiveTab = "media" | "file" | "link";

const TABS: { key: ArchiveTab; label: string; icon: any; color: string }[] = [
  { key: "media", label: "사진/동영상", icon: "photo",    color: "#2ECC71" },
  { key: "file",  label: "파일",        icon: "file",     color: "#7F8C8D" },
  { key: "link",  label: "링크",        icon: "link",     color: "#007AFF" },
];

export default function ChatArchiveScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId, initialTab } = useLocalSearchParams<{ projectId: string; initialTab: ArchiveTab }>();
  const [activeTab, setActiveTab] = useState<ArchiveTab>(initialTab || "media");
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setIsLoading(true);
    ChatAPI.messages(projectId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const mediaItems = messages.filter((m) => m.attachment_type === "image" && m.attachment_url);
  const fileItems  = messages.filter((m) => m.attachment_type === "file");
  const linkItems  = messages.filter((m) => !m.attachment_type && URL_RE.test(m.content));

  const openUrl = async (url?: string | null) => {
    if (url) await WebBrowser.openBrowserAsync(url);
  };

  const currentCount = activeTab === "media" ? mediaItems.length : activeTab === "file" ? fileItems.length : linkItems.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>보관함</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert("검색", "검색은 준비 중인 기능이에요.")}>
          <Icon name="search" size={24} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* 탭 바 */}
      <View style={[styles.tabBar, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        {TABS.map((tab) => {
          const focused = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Icon name={tab.icon} size={18} color={focused ? tab.color : C.textMuted} />
              <Text style={[styles.tabLabel, { color: focused ? tab.color : C.textMuted, fontWeight: focused ? '700' : '500' }]}>
                {tab.label}
              </Text>
              {focused && <View style={[styles.tabUnderline, { backgroundColor: tab.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* 개수 표시 */}
        {!isLoading && (
          <View style={[styles.statsBar, { borderBottomColor: C.border }]}>
            <Text style={[styles.statsText, { color: C.textMuted }]}>
              총 {currentCount}개
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* 사진/동영상 */}
            {activeTab === "media" && (
              mediaItems.length === 0 ? (
                <EmptyState icon="photo" message="공유된 사진이 없어요." C={C} />
              ) : (
                <View style={styles.mediaGrid}>
                  {mediaItems.map((m) => (
                    <TouchableOpacity key={m.id} onPress={() => openUrl(m.attachment_url)} activeOpacity={0.85}>
                      <Image source={{ uri: m.attachment_url! }} style={[styles.mediaImg, { backgroundColor: C.bgMuted }]} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            )}

            {/* 파일 */}
            {activeTab === "file" && (
              fileItems.length === 0 ? (
                <EmptyState icon="file" message="공유된 파일이 없어요." C={C} />
              ) : (
                <View style={[styles.listSection, { backgroundColor: C.bgCard }]}>
                  {fileItems.map((m, idx) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.listRow, { borderBottomColor: C.border }, idx === fileItems.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => openUrl(m.attachment_url)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.listIconBox, { backgroundColor: '#7F8C8D18' }]}>
                        <Icon name="file" size={20} color="#7F8C8D" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listRowName, { color: C.text }]} numberOfLines={1}>
                          {m.attachment_name ?? "파일"}
                        </Text>
                        <Text style={[styles.listRowSub, { color: C.textMuted }]} numberOfLines={1}>
                          {m.sender_name} · {m.created_at ? new Date(m.created_at).toLocaleDateString('ko-KR') : ''}
                        </Text>
                      </View>
                      <Icon name="chevron" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            )}

            {/* 링크 */}
            {activeTab === "link" && (
              linkItems.length === 0 ? (
                <EmptyState icon="link" message="공유된 링크가 없어요." C={C} />
              ) : (
                <View style={[styles.listSection, { backgroundColor: C.bgCard }]}>
                  {linkItems.map((m, idx) => {
                    const url = m.content.match(URL_RE)?.[0] ?? "";
                    const domain = url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.listRow, { borderBottomColor: C.border }, idx === linkItems.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => openUrl(url)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.listIconBox, { backgroundColor: '#007AFF18' }]}>
                          <Icon name="link" size={20} color="#007AFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listRowName, { color: C.primary }]} numberOfLines={1}>{domain}</Text>
                          <Text style={[styles.listRowSub, { color: C.textMuted }]} numberOfLines={1}>{url}</Text>
                        </View>
                        <Icon name="chevron" size={16} color={C.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ icon, message, C }: { icon: any; message: string; C: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.emptyWrap}>
      <Icon name={icon} size={48} color={C.border} />
      <Text style={[styles.emptyText, { color: C.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    padding: 2,
  },
  mediaImg: {
    width: MEDIA_SIZE - 2,
    height: MEDIA_SIZE - 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  listSection: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listRowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  listRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
