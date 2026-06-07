import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { ChatAPI, MessageDTO } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const URL_RE = /(https?:\/\/[^\s]+)/;

type ArchiveTab = "media" | "file" | "link";

export default function ChatArchiveScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId, initialTab } = useLocalSearchParams<{ projectId: string, initialTab: ArchiveTab }>();
  const [activeTab, setActiveTab] = useState<ArchiveTab>(initialTab || "media");

  const roomName = "보관함";

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  useEffect(() => {
    if (!projectId) return;
    ChatAPI.messages(projectId).then(setMessages).catch(() => {});
  }, [projectId]);

  const mediaItems = messages.filter((m) => m.attachment_type === "image" && m.attachment_url);
  const fileItems = messages.filter((m) => m.attachment_type === "file");
  const linkItems = messages.filter((m) => !m.attachment_type && URL_RE.test(m.content));

  const openUrl = async (url?: string | null) => { if (url) await WebBrowser.openBrowserAsync(url); };

  const renderTabHeader = () => (
    <View style={styles.tabHeader}>
      <TabItem label="사진/동영상" active={activeTab === "media"} onPress={() => setActiveTab("media")} />
      <TabItem label="파일" active={activeTab === "file"} onPress={() => setActiveTab("file")} />
      <TabItem label="링크" active={activeTab === "link"} onPress={() => setActiveTab("link")} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{roomName}</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Icon name="search" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {renderTabHeader()}

      <ScrollView style={{ flex: 1 }}>
        {/* 통계 바 */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {activeTab === "media" ? `사진 ${mediaItems.length}개`
              : activeTab === "file" ? `파일 ${fileItems.length}개`
              : `링크 ${linkItems.length}개`}
          </Text>
        </View>

        {activeTab === "media" && (
          <View style={[styles.mediaGrid, { paddingBottom: 100 }]}>
            {mediaItems.length === 0 ? (
              <Text style={[styles.placeholderText, { padding: 20 }]}>공유된 사진이 없어요.</Text>
            ) : mediaItems.map((m) => (
              <TouchableOpacity key={m.id} style={styles.mediaItem} onPress={() => openUrl(m.attachment_url)} activeOpacity={0.8}>
                <Image source={{ uri: m.attachment_url! }} style={styles.mediaImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === "file" && (
          <View style={{ paddingBottom: 100 }}>
            {fileItems.length === 0 ? (
              <Text style={[styles.placeholderText, { padding: 20 }]}>공유된 파일이 없어요.</Text>
            ) : fileItems.map((m) => (
              <TouchableOpacity key={m.id} style={styles.fileRow} onPress={() => openUrl(m.attachment_url)} activeOpacity={0.7}>
                <Icon name="file" size={22} color="#7F8C8D" />
                <Text style={styles.fileRowName} numberOfLines={1}>{m.attachment_name ?? "파일"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === "link" && (
          <View style={{ paddingBottom: 100 }}>
            {linkItems.length === 0 ? (
              <Text style={[styles.placeholderText, { padding: 20 }]}>공유된 링크가 없어요.</Text>
            ) : linkItems.map((m) => {
              const url = m.content.match(URL_RE)?.[0] ?? "";
              return (
                <TouchableOpacity key={m.id} style={styles.fileRow} onPress={() => openUrl(url)} activeOpacity={0.7}>
                  <Icon name="link" size={22} color="#007AFF" />
                  <Text style={styles.fileRowName} numberOfLines={1}>{url}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabItem({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabItem, active && styles.tabItemActive]} onPress={onPress}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  tabItem: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#333',
  },
  tabLabel: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#111',
    fontWeight: '700',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statsText: {
    fontSize: 13,
    color: '#999',
  },
  manageText: {
    fontSize: 13,
    color: '#007AFF',
  },
  mediaSection: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 10,
    fontWeight: '400',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1.5,
  },
  mediaItem: {
    width: (SCREEN_WIDTH - 3) / 3,
    height: (SCREEN_WIDTH - 3) / 3,
    backgroundColor: '#F3F4F6',
  },
  mediaImg: { width: '100%', height: '100%' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  fileRowName: { flex: 1, fontSize: 14, color: '#333' },
  videoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  cloudBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBtnText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  }
});
