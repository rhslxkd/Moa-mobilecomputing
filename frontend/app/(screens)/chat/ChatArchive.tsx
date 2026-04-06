import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ArchiveTab = "media" | "file" | "link";

export default function ChatArchiveScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId, initialTab } = useLocalSearchParams<{ projectId: string, initialTab: ArchiveTab }>();
  const [activeTab, setActiveTab] = useState<ArchiveTab>(initialTab || "media");

  const roomName = "5대5";

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
          <Text style={styles.statsText}>589개 / 1.05 GB</Text>
          <TouchableOpacity><Text style={styles.manageText}>관리</Text></TouchableOpacity>
        </View>

        {activeTab === "media" && (
          <View style={{ paddingBottom: 100 }}>
            <MediaSection date="2026. 4. 4" items={[1, 2]} />
            <MediaSection date="2026. 4. 1" items={[3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} />
          </View>
        )}
        
        {activeTab === "file" && (
          <View style={{ padding: 20 }}>
             <Text style={styles.placeholderText}>파일 리스트가 여기에 나타납니다.</Text>
          </View>
        )}

        {activeTab === "link" && (
          <View style={{ padding: 20 }}>
             <Text style={styles.placeholderText}>링크 리스트가 여기에 나타납니다.</Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.cloudBtn}>
          <Text style={styles.cloudBtnText}>톡클라우드 바로가기</Text>
        </TouchableOpacity>
      </View>
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

function MediaSection({ date, items }: { date: string, items: number[] }) {
  return (
    <View style={styles.mediaSection}>
      <Text style={styles.dateHeader}>{date}</Text>
      <View style={styles.mediaGrid}>
        {items.map(item => (
          <View key={item} style={styles.mediaItem}>
            {item % 4 === 0 && (
              <View style={styles.videoBadge}>
                <Text style={styles.videoBadgeText}>0:04</Text>
              </View>
            )}
          </View>
        ))}
      </View>
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
