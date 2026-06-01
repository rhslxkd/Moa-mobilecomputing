/**
 * src/components/common/CalendarPicker.tsx
 *
 * 피그마 Calender/Date 기반
 *
 * 기능:
 *   - 월 단위 날짜 그리드 표시
 *   - 날짜 선택 (파란 원으로 표시)
 *   - 점 표시 (이벤트/할일이 있는 날)
 *   - 이전/다음 달 이동
 *
 * 사용법:
 *   const [date, setDate] = useState<Date | null>(null);
 *
 *   <CalendarPicker
 *     selected={date}
 *     onSelect={setDate}
 *   />
 *
 *   // 이벤트 점 표시
 *   <CalendarPicker
 *     selected={date}
 *     onSelect={setDate}
 *     markedDates={["2026-03-15", "2026-03-22"]}
 *   />
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface CalendarPickerProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  markedDates?: string[]; // "YYYY-MM-DD" 형식
  minDate?: Date;
  maxDate?: Date;
  containerStyle?: ViewStyle;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export default function CalendarPicker({
  selected,
  onSelect,
  markedDates = [],
  minDate,
  maxDate,
  containerStyle,
}: CalendarPickerProps) {
  const C = useTheme();

  const today = new Date();
  const [viewYear, setViewYear] = useState(
    selected ? selected.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selected ? selected.getMonth() : today.getMonth()
  );

  // 해당 월의 첫날, 마지막 날
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);

  // 그리드 앞 빈칸 (일요일 시작)
  const leadingBlanks = firstDay.getDay();
  const totalDays = lastDay.getDate();

  // 6주 그리드 (42칸)
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelect = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    onSelect(date);
  };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: C.bgCard, borderColor: C.border },
        containerStyle,
      ]}
    >
      {/* 헤더: 월 이동 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={[styles.navArrow, { color: C.textSub }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: C.text }]}>
          {viewYear}년 {viewMonth + 1}월
        </Text>

        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={[styles.navArrow, { color: C.textSub }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.weekRow}>
        {DAYS.map((d, i) => (
          <View key={d} style={styles.dayCell}>
            <Text
              style={[
                styles.dayLabel,
                { color: i === 0 ? C.danger : i === 6 ? C.primary : C.textMuted },
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 그리드 */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={styles.dayCell} />;
            }

            const date = new Date(viewYear, viewMonth, day);
            const dateKey = toDateKey(date);
            const isSelected = selected ? isSameDay(date, selected) : false;
            const isCurrentDay = isToday(date);
            const isMarked = markedDates.includes(dateKey);
            const isDisabled =
              (minDate ? date < minDate : false) ||
              (maxDate ? date > maxDate : false);
            const isSunday = di === 0;
            const isSaturday = di === 6;

            return (
              <TouchableOpacity
                key={di}
                style={styles.dayCell}
                onPress={() => !isDisabled && handleSelect(day)}
                activeOpacity={0.7}
                disabled={isDisabled}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: C.primary },
                    !isSelected && isCurrentDay && {
                      borderWidth: 1.5,
                      borderColor: C.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isDisabled
                          ? C.textMuted
                          : isSelected
                          ? "#FFFFFF"
                          : isSunday
                          ? C.danger
                          : isSaturday
                          ? C.primary
                          : C.text,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </View>

                {/* 이벤트 점 */}
                {isMarked && !isSelected && (
                  <View style={[styles.dot, { backgroundColor: C.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 3,
    gap: 3,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "500",
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
  },
  dayCircle: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "400",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
