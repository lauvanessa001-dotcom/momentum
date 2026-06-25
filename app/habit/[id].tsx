import React, { useMemo } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import {
  formatDate,
  getPillar,
  isHabitScheduledForDate,
  useApp,
} from "@/contexts/AppContext";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 20;
const CARD_W = SCREEN_W - H_PAD * 2;

const HEAT_WEEKS = 13;
const HEAT_GAP = 3;
const GRID_W = CARD_W - 40; // card has 20 padding each side
const CELL = Math.floor((GRID_W - (HEAT_WEEKS - 1) * HEAT_GAP) / HEAT_WEEKS);

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function HabitDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const { habits, getHabitStreak, getHabitBestStreak } = useApp();

  const habit = useMemo(() => habits.find((h) => h.id === id) ?? null, [habits, id]);
  const pillar = habit ? getPillar(habit.category) : null;

  // ── Completion over last 30 scheduled days ─────────────────────────────────
  const completionRate = useMemo(() => {
    if (!habit) return 0;
    const completed = new Set(habit.completedDates);
    let scheduled = 0;
    let done = 0;
    const cur = new Date();
    for (let i = 0; i < 30; i++) {
      if (isHabitScheduledForDate(habit, cur)) {
        scheduled++;
        if (completed.has(formatDate(cur))) done++;
      }
      cur.setDate(cur.getDate() - 1);
    }
    return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
  }, [habit]);

  const totalCompletions = habit?.completedDates.length ?? 0;

  // ── Heatmap cells (13 weeks, Sun→Sat columns) ──────────────────────────────
  const weeks = useMemo(() => {
    if (!habit) return [] as { ds: string; status: "done" | "missed" | "off" | "future" }[][];
    const completed = new Set(habit.completedDates);
    const todayStr = formatDate(new Date());

    const start = new Date();
    start.setDate(start.getDate() - (HEAT_WEEKS * 7 - 1));
    start.setDate(start.getDate() - start.getDay()); // back to Sunday

    const cols: { ds: string; status: "done" | "missed" | "off" | "future" }[][] = [];
    const cur = new Date(start);
    for (let c = 0; c < HEAT_WEEKS; c++) {
      const col: { ds: string; status: "done" | "missed" | "off" | "future" }[] = [];
      for (let r = 0; r < 7; r++) {
        const ds = formatDate(cur);
        let status: "done" | "missed" | "off" | "future";
        if (ds > todayStr) status = "future";
        else if (completed.has(ds)) status = "done";
        else if (isHabitScheduledForDate(habit, cur)) status = "missed";
        else status = "off";
        col.push({ ds, status });
        cur.setDate(cur.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [habit]);

  // ── Monthly trend (last 6 months) ──────────────────────────────────────────
  const monthly = useMemo(() => {
    if (!habit) return [] as { label: string; count: number }[];
    const out: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = habit.completedDates.filter((cd) => cd.startsWith(prefix)).length;
      out.push({ label: MONTH_ABBR[d.getMonth()], count });
    }
    return out;
  }, [habit]);

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count));

  const currentStreak = habit ? getHabitStreak(habit.id) : 0;
  const bestStreak = habit ? getHabitBestStreak(habit.id) : 0;

  const cellColor = (status: "done" | "missed" | "off" | "future") => {
    if (!pillar) return colors.muted;
    if (status === "done") return pillar.color;
    if (status === "missed") return colors.muted;
    if (status === "off") return colors.muted + "55";
    return "transparent";
  };

  if (!habit || !pillar) {
    return (
      <View style={[s.empty, { backgroundColor: colors.background, paddingTop: topPad + 40 }]}>
        <Text style={{ fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
          Habit not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 40, paddingHorizontal: H_PAD, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      {/* Title block */}
      <View style={{ alignItems: "center", gap: 8, marginBottom: 4 }}>
        <View style={[s.pillarBadge, { backgroundColor: pillar.color + "1A" }]}>
          <Text style={{ fontSize: 14 }}>{pillar.emoji}</Text>
          <Text style={[s.pillarBadgeText, { color: pillar.color }]}>{pillar.key}</Text>
        </View>
        <Text style={[s.title, { color: colors.foreground }]}>{habit.name}</Text>
      </View>

      {/* Stat strip */}
      <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <View style={s.statStrip}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: pillar.color }]}>{currentStreak}</Text>
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Current Streak</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.foreground }]}>{bestStreak}</Text>
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Longest Streak</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.foreground }]}>{completionRate}%</Text>
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>30-Day Rate</Text>
          </View>
        </View>
      </View>

      {/* Calendar heatmap */}
      <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius, padding: 20 }]}>
        <Text style={[s.cardTitle, { color: colors.foreground }]}>History</Text>
        <Text style={[s.cardSub, { color: colors.mutedForeground }]}>Last 13 weeks</Text>
        <View style={{ flexDirection: "row", gap: HEAT_GAP, marginTop: 16 }}>
          {weeks.map((col, ci) => (
            <View key={ci} style={{ gap: HEAT_GAP }}>
              {col.map((cell, ri) => (
                <View
                  key={ri}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 3,
                    backgroundColor: cellColor(cell.status),
                  }}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: pillar.color }} />
            <Text style={[s.legend, { color: colors.mutedForeground }]}>Done</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.muted }} />
            <Text style={[s.legend, { color: colors.mutedForeground }]}>Missed</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={[s.legend, { color: colors.mutedForeground }]}>{totalCompletions} total completions</Text>
          </View>
        </View>
      </View>

      {/* Monthly trend */}
      <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius, padding: 20 }]}>
        <Text style={[s.cardTitle, { color: colors.foreground }]}>Monthly Trend</Text>
        <Text style={[s.cardSub, { color: colors.mutedForeground }]}>Completions per month</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120, marginTop: 18 }}>
          {monthly.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Text style={[s.barValue, { color: colors.foreground }]}>{m.count > 0 ? m.count : ""}</Text>
              <View
                style={{
                  width: 22,
                  height: Math.max(4, (m.count / maxMonthly) * 80),
                  borderRadius: 6,
                  backgroundColor: m.count > 0 ? pillar.color : colors.muted,
                }}
              />
              <Text style={[s.barLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: "center" },
  card: { padding: 18 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  pillarBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillarBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },

  statStrip: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4, textAlign: "center" },
  statDivider: { width: StyleSheet.hairlineWidth, height: 40 },

  legend: { fontSize: 11, fontFamily: "Inter_500Medium" },
  barValue: { fontSize: 12, fontFamily: "Inter_700Bold", height: 16 },
  barLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
