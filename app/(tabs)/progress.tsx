import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { formatDate, isHabitScheduledForDate, LIFE_PILLARS, useApp } from "@/contexts/AppContext";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD  = 20;
const CARD_W = SCREEN_W - H_PAD * 2;

const FILTERS = [
  { key: 7   as const, label: "7 Days"   },
  { key: 21  as const, label: "21 Days"  },
  { key: 30  as const, label: "30 Days"  },
  { key: 182 as const, label: "6 Months" },
  { key: 365 as const, label: "1 Year"   },
] as const;
type RangeKey = 7 | 21 | 30 | 182 | 365;

function buildRange(days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(formatDate(d));
  }
  return out;
}

function shortFmt(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr + "T12:00").toLocaleDateString("en-US", opts);
}

function moodInfo(avg: number): { label: string; emoji: string } {
  if (avg <= 0) return { label: "—", emoji: "" };
  if (avg < 2)   return { label: "Tough", emoji: "😢" };
  if (avg < 3)   return { label: "Low",   emoji: "😕" };
  if (avg < 3.5) return { label: "Okay",  emoji: "😐" };
  if (avg < 4.5) return { label: "Good",  emoji: "😊" };
  return             { label: "Great", emoji: "😄" };
}

// ─── Score Line Chart ─────────────────────────────────────────────────────────
function ScoreLineChart({ data, width, height, color, period, startDate }: {
  data: number[]; width: number; height: number; color: string;
  period: RangeKey; startDate: string;
}) {
  const Y_LBL_W  = 26;
  const X_LBL_H  = 18;
  const chartW   = Math.max(width - Y_LBL_W, 40);
  const chartH   = Math.max(height - X_LBL_H, 40);
  const padV     = 8;
  const padR     = 16;
  const yTicks   = [100, 75, 50, 25, 0];

  const yPos = (v: number) =>
    padV + (1 - v / 100) * (chartH - padV * 2);

  if (data.length < 2 || data.every((v) => v === 0)) {
    return (
      <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 10, color: "#BBBBCC", fontFamily: "Inter_400Regular", textAlign: "center" }}>
          Complete habits{"\n"}to see trend
        </Text>
      </View>
    );
  }

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (chartW - padR),
    y: yPos(Math.min(100, Math.max(0, v))),
  }));

  let pathD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
    pathD += ` C ${cpx} ${pts[i - 1].y.toFixed(1)} ${cpx} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  const fillD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${chartH} L 0 ${chartH} Z`;
  const lastPt  = pts[pts.length - 1];
  const lastVal = data[data.length - 1];

  const xLabels = (() => {
    const start = new Date(startDate + "T12:00");
    const count = 4;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.round((i / (count - 1)) * (period - 1)));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
  })();

  return (
    <View style={{ width, height }}>
      {/* Y-axis labels */}
      <View style={{ position: "absolute", top: 0, left: 0, width: Y_LBL_W, height: chartH }}>
        {yTicks.map((v) => (
          <Text
            key={v}
            style={{
              position: "absolute",
              top: yPos(v) - 6,
              right: 2,
              fontSize: 8,
              fontFamily: "Inter_400Regular",
              color: "#BBBBCC",
              textAlign: "right",
            }}
          >
            {v}
          </Text>
        ))}
      </View>

      {/* SVG chart */}
      <View style={{ position: "absolute", top: 0, left: Y_LBL_W, width: chartW, height: chartH }}>
        <Svg width={chartW} height={chartH}>
          {yTicks.map((v) => (
            <Line
              key={v}
              x1={0} y1={yPos(v)} x2={chartW} y2={yPos(v)}
              stroke="#E8E4F4" strokeWidth={1} strokeDasharray="3,5"
            />
          ))}
          <Path d={fillD} fill={color + "1A"} />
          <Path
            d={pathD} stroke={color} strokeWidth={2}
            fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          <Circle cx={lastPt.x} cy={lastPt.y} r={4.5} fill={color} />
        </Svg>
        {/* Last value label */}
        <View style={{
          position: "absolute",
          top: Math.max(0, lastPt.y - 17),
          right: chartW - lastPt.x < 28 ? 0 : undefined,
          left: chartW - lastPt.x >= 28 ? lastPt.x + 6 : undefined,
        }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color }}>{lastVal}</Text>
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{
        position: "absolute",
        bottom: 0,
        left: Y_LBL_W,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        height: X_LBL_H,
        alignItems: "flex-end",
      }}>
        {xLabels.map((label, i) => (
          <Text key={i} style={{ fontSize: 8, fontFamily: "Inter_400Regular", color: "#BBBBCC" }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Mountain Illustration ────────────────────────────────────────────────────
function MountainIllustration() {
  return (
    <Svg width={72} height={66} viewBox="0 0 72 66">
      <Path d="M18 66 L46 18 L74 66 Z" fill="#B8AAEE" />
      <Path d="M0 66 L28 22 L56 66 Z" fill="#7C6CE7" />
      <Path d="M46 18 L46 5" stroke="#5C4FBF" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M46 5 L57 9 L46 13 Z" fill="#5C4FBF" />
      <Circle cx={63} cy={14} r={7} fill="#F0C060" />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isWeb  = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const botPad = isWeb ? 34 : insets.bottom;
  const router = useRouter();

  const {
    habits, moodHistory, biggestWins,
    getDaySnapshot, getHabitBestStreak, getBestStreak,
  } = useApp();

  const [range, setRange] = useState<RangeKey>(30);
  const [chartW, setChartW] = useState(0);
  const today = formatDate(new Date());

  // ── Date ranges ──────────────────────────────────────────────────────────
  const periodDates = useMemo(() => buildRange(range), [range]);
  const prevDates   = useMemo(() => {
    const out: string[] = [];
    for (let i = range * 2 - 1; i >= range; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(formatDate(d));
    }
    return out;
  }, [range]);

  // ── Day snapshots ────────────────────────────────────────────────────────
  const periodSnaps = useMemo(
    () => periodDates.map((d) => getDaySnapshot(d)),
    [periodDates, getDaySnapshot],
  );
  const prevSnaps = useMemo(
    () => prevDates.map((d) => getDaySnapshot(d)),
    [prevDates, getDaySnapshot],
  );

  // ── Graph data (compressed for long periods) ─────────────────────────────
  const graphData = useMemo(() => {
    const scores = periodSnaps.map((s) => s.momentumScore);
    if (range <= 30) return scores;
    const groupSize = range === 365 ? 30 : 7;
    const groups: number[] = [];
    for (let i = 0; i < scores.length; i += groupSize) {
      const slice = scores.slice(i, i + groupSize);
      groups.push(Math.round(slice.reduce((a, b) => a + b, 0) / slice.length));
    }
    return groups;
  }, [periodSnaps, range]);

  // ── Momentum score ───────────────────────────────────────────────────────
  const avgMomentum = useMemo(() => {
    const active = periodSnaps.filter((s) => s.momentumScore > 0);
    if (!active.length) return 0;
    return Math.round(active.reduce((sum, s) => sum + s.momentumScore, 0) / active.length);
  }, [periodSnaps]);

  const prevMomentum = useMemo(() => {
    const active = prevSnaps.filter((s) => s.momentumScore > 0);
    if (!active.length) return 0;
    return Math.round(active.reduce((sum, s) => sum + s.momentumScore, 0) / active.length);
  }, [prevSnaps]);

  const momentumDiff = avgMomentum - prevMomentum;

  // ── Completion rate ──────────────────────────────────────────────────────
  const { completionRate, prevCompletionRate } = useMemo(() => {
    function calcRate(dates: string[]) {
      if (!habits.length) return 0;
      let done = 0, total = 0;
      for (const d of dates) {
        const dateObj = new Date(d + "T12:00");
        const scheduled = habits.filter((h) => isHabitScheduledForDate(h, dateObj));
        total += scheduled.length;
        done  += scheduled.filter((h) => h.completedDates.includes(d)).length;
      }
      return total > 0 ? Math.round((done / total) * 100) : 0;
    }
    return {
      completionRate:     calcRate(periodDates),
      prevCompletionRate: calcRate(prevDates),
    };
  }, [habits, periodDates, prevDates]);

  const completionDiff = completionRate - prevCompletionRate;

  // ── Total habits completed ────────────────────────────────────────────────
  const totalHabitsCompleted = useMemo(
    () => periodSnaps.reduce((sum, s) => sum + s.habitsCompleted, 0),
    [periodSnaps],
  );
  const prevHabitsCompleted = useMemo(
    () => prevSnaps.reduce((sum, s) => sum + s.habitsCompleted, 0),
    [prevSnaps],
  );
  const habitsDiff = totalHabitsCompleted - prevHabitsCompleted;

  // ── Average mood ─────────────────────────────────────────────────────────
  const avgMood = useMemo(() => {
    const moods = moodHistory
      .filter((m) => m.date >= periodDates[0] && m.date <= today && m.mood > 0)
      .map((m) => m.mood);
    if (!moods.length) return 0;
    return Math.round((moods.reduce((s, m) => s + m, 0) / moods.length) * 10) / 10;
  }, [moodHistory, periodDates, today]);

  // ── Streaks ──────────────────────────────────────────────────────────────
  const currentStreak = getBestStreak();
  const bestStreak    = useMemo(
    () => Math.max(0, ...habits.map((h) => getHabitBestStreak(h.id))),
    [habits, getHabitBestStreak],
  );

  // ── Life Pillars breakdown ────────────────────────────────────────────────
  const pillarBreakdown = useMemo(() => {
    return LIFE_PILLARS
      .map((pillar) => {
        const ph = habits.filter((h) => h.category === pillar.key);
        if (!ph.length) return null;
        let done = 0, total = 0;
        for (const d of periodDates) {
          const dateObj = new Date(d + "T12:00");
          const sched = ph.filter((h) => isHabitScheduledForDate(h, dateObj));
          total += sched.length;
          done  += sched.filter((h) => h.completedDates.includes(d)).length;
        }
        return { pillar, rate: total > 0 ? done / total : 0 };
      })
      .filter(Boolean) as Array<{ pillar: (typeof LIFE_PILLARS)[number]; rate: number }>;
  }, [habits, periodDates]);

  // ── Best day ─────────────────────────────────────────────────────────────
  const bestDay = useMemo(() => {
    if (!periodSnaps.length) return null;
    let bestIdx = 0;
    for (let i = 1; i < periodSnaps.length; i++) {
      if (periodSnaps[i].habitsCompleted > periodSnaps[bestIdx].habitsCompleted) bestIdx = i;
    }
    const snap = periodSnaps[bestIdx];
    if (snap.habitsCompleted === 0) return null;
    return { date: periodDates[bestIdx], count: snap.habitsCompleted };
  }, [periodSnaps, periodDates]);

  // ── Most consistent habit ─────────────────────────────────────────────────
  const mostConsistent = useMemo(() => {
    if (!habits.length) return null;
    const scored = habits.map((h) => {
      let done = 0, total = 0;
      for (const d of periodDates) {
        const dateObj = new Date(d + "T12:00");
        if (isHabitScheduledForDate(h, dateObj)) {
          total++;
          if (h.completedDates.includes(d)) done++;
        }
      }
      return { habit: h, done, total, rate: total > 0 ? done / total : 0 };
    });
    const best = [...scored].sort((a, b) => b.rate - a.rate)[0];
    return best?.total > 0 ? best : null;
  }, [habits, periodDates]);

  // ── Latest biggest win ────────────────────────────────────────────────────
  const latestWin = useMemo(() => {
    return [...biggestWins]
      .filter((w) => w.text && w.date >= periodDates[0])
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }, [biggestWins, periodDates]);

  // ── Key insight text ──────────────────────────────────────────────────────
  const keyInsight = useMemo(() => {
    if (!habits.length) return "Add habits to start tracking your growth journey.";
    if (completionDiff > 0 && prevCompletionRate > 0) {
      return `You're showing up consistently! Your completion rate is ${completionDiff}% higher than last period.`;
    }
    if (currentStreak >= 7) {
      return `You're on a ${currentStreak}-day streak — amazing consistency!`;
    }
    if (completionRate >= 80) {
      return `Incredible! You've completed ${completionRate}% of your habits this period. Keep it up!`;
    }
    return `You've completed ${completionRate}% of your habits. Every day counts — keep building momentum!`;
  }, [habits.length, completionDiff, prevCompletionRate, currentStreak, completionRate]);

  // ── Labels ────────────────────────────────────────────────────────────────
  const periodLabel = range === 7 ? "This Week"
    : range === 21 ? "Last 21 Days"
    : range === 30 ? "This Month"
    : range === 182 ? "Last 6 Months"
    : "This Year";

  const prevPeriodLabel = range === 7 ? "last week"
    : range === 21 ? "last 21d"
    : range === 30 ? "last month"
    : range === 182 ? "last 6mo"
    : "last year";

  const dateRangeStr = (() => {
    const start = new Date(periodDates[0] + "T12:00");
    const end   = new Date(today + "T12:00");
    const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
  })();

  const { label: moodLbl, emoji: moodEmoji } = moodInfo(avgMood);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: botPad + 100,
        paddingHorizontal: H_PAD,
        gap: 14,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text style={[s.pageTitle, { color: colors.foreground }]}>Progress</Text>
          <Text style={[s.pageSub, { color: colors.mutedForeground }]}>Your journey at a glance.</Text>
        </View>
        <TouchableOpacity
          style={[s.insightsBtn, { backgroundColor: colors.primary + "14" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={13} color={colors.primary} />
          <Text style={[s.insightsBtnText, { color: colors.primary }]}>Insights</Text>
        </TouchableOpacity>
      </View>

      {/* ── Period tabs ── */}
      <View style={[s.filterRow, { backgroundColor: colors.card, borderRadius: 22 }]}>
        {FILTERS.map((f) => {
          const active = range === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setRange(f.key)}
              style={[s.filterTab, {
                backgroundColor: active ? colors.primary : "transparent",
                borderRadius: 20,
              }]}
              activeOpacity={0.75}
            >
              <Text style={[s.filterLabel, { color: active ? "#FFF" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Score + Chart card ── */}
      <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Left: score */}
          <View style={{ flex: 4, justifyContent: "space-between", gap: 6 }}>
            <View>
              <Text style={[s.cardPeriodLabel, { color: colors.foreground }]}>{periodLabel}</Text>
              <Text style={[s.dateRange, { color: colors.mutedForeground }]}>{dateRangeStr}</Text>
            </View>
            <View>
              <Text style={[s.scoreLabel, { color: colors.mutedForeground }]}>Momentum Score</Text>
              <Text style={[s.scoreBig, { color: colors.primary }]}>{avgMomentum}</Text>
              <Text style={[s.scoreUnit, { color: colors.mutedForeground }]}>out of 100</Text>
            </View>
            {prevMomentum > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons
                  name={momentumDiff >= 0 ? "arrow-up" : "arrow-down"}
                  size={11}
                  color={momentumDiff >= 0 ? "#5DBF96" : "#E87070"}
                />
                <Text style={[s.trendText, { color: momentumDiff >= 0 ? "#5DBF96" : "#E87070" }]}>
                  {Math.abs(momentumDiff)} pts vs {prevPeriodLabel}
                </Text>
              </View>
            )}
          </View>
          {/* Right: chart */}
          <View
            style={{ flex: 5 }}
            onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
          >
            {chartW > 0 && (
              <ScoreLineChart
                data={graphData}
                width={chartW}
                height={162}
                color={colors.primary}
                period={range}
                startDate={periodDates[0]}
              />
            )}
          </View>
        </View>
      </View>

      {/* ── 4-stat row ── */}
      <View style={s.statRow}>
        {/* Completion Rate */}
        <View style={[s.statCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={[s.statIconWrap, { backgroundColor: "#6DBFA0" + "1E" }]}>
            <Ionicons name="checkmark-circle" size={17} color="#6DBFA0" />
          </View>
          <Text style={[s.statValue, { color: colors.foreground }]}>{completionRate}%</Text>
          <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Completion Rate</Text>
          {prevCompletionRate > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }}>
              <Ionicons
                name={completionDiff >= 0 ? "arrow-up" : "arrow-down"}
                size={9}
                color={completionDiff >= 0 ? "#5DBF96" : "#E87070"}
              />
              <Text style={[s.statSub, { color: completionDiff >= 0 ? "#5DBF96" : "#E87070" }]}>
                {Math.abs(completionDiff)}% vs {prevPeriodLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Current Streak */}
        <View style={[s.statCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={[s.statIconWrap, { backgroundColor: "#F0A050" + "1E" }]}>
            <Text style={{ fontSize: 15, lineHeight: 18 }}>🔥</Text>
          </View>
          <Text style={[s.statValue, { color: colors.foreground }]}>{currentStreak}</Text>
          <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Current Streak</Text>
          {bestStreak > 0 && (
            <Text style={[s.statSub, { color: colors.mutedForeground, marginTop: 2 }]}>
              Best: {bestStreak}d
            </Text>
          )}
        </View>

        {/* Habits Completed */}
        <View style={[s.statCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={[s.statIconWrap, { backgroundColor: "#F0C050" + "1E" }]}>
            <Text style={{ fontSize: 15, lineHeight: 18 }}>⭐</Text>
          </View>
          <Text style={[s.statValue, { color: colors.foreground }]}>{totalHabitsCompleted}</Text>
          <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Habits Completed</Text>
          {prevHabitsCompleted > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }}>
              <Ionicons
                name={habitsDiff >= 0 ? "arrow-up" : "arrow-down"}
                size={9}
                color={habitsDiff >= 0 ? "#5DBF96" : "#E87070"}
              />
              <Text style={[s.statSub, { color: habitsDiff >= 0 ? "#5DBF96" : "#E87070" }]}>
                {Math.abs(habitsDiff)} vs {prevPeriodLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Average Mood */}
        <View style={[s.statCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={[s.statIconWrap, { backgroundColor: "#6B9EEB" + "1E" }]}>
            <Ionicons name="happy-outline" size={17} color="#6B9EEB" />
          </View>
          <Text style={[s.statValue, { color: colors.foreground }]}>
            {avgMood > 0 ? avgMood.toFixed(1) : "—"}
          </Text>
          <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Average Mood</Text>
          {avgMood > 0 && (
            <Text style={[s.statSub, { color: colors.mutedForeground, marginTop: 2 }]}>
              {moodLbl} {moodEmoji}
            </Text>
          )}
        </View>
      </View>

      {/* ── Life Pillars ── */}
      <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <View style={s.cardHeader}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Life Pillars</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/habits")} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
              View all
            </Text>
          </TouchableOpacity>
        </View>
        {pillarBreakdown.length > 0 ? (
          pillarBreakdown.map(({ pillar, rate }) => (
            <View key={pillar.key} style={s.pillarRow}>
              <View style={s.pillarLeft}>
                <Text style={{ fontSize: 15 }}>{pillar.emoji}</Text>
                <Text style={[s.pillarName, { color: colors.foreground }]} numberOfLines={1}>
                  {pillar.key}
                </Text>
              </View>
              <View style={[s.pillarBarBg, { backgroundColor: colors.muted }]}>
                <View style={{
                  width: `${Math.round(rate * 100)}%` as any,
                  height: "100%",
                  backgroundColor: pillar.color,
                  borderRadius: 4,
                }} />
              </View>
              <Text style={[s.pillarPct, { color: pillar.color }]}>
                {Math.round(rate * 100)}%
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            Add habits with Life Pillars to see breakdown.
          </Text>
        )}
      </View>

      {/* ── Key Insight ── */}
      <View style={[s.card, { backgroundColor: "#EEE9FF", borderRadius: colors.radius, overflow: "hidden" }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Ionicons name="sparkles" size={14} color="#7C6CE7" />
              <Text style={s.insightCardTitle}>Key Insight</Text>
            </View>
            <Text style={s.insightCardBody}>{keyInsight}</Text>
          </View>
          <MountainIllustration />
        </View>
      </View>

      {/* ── Bottom 3-col row ── */}
      {habits.length > 0 && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Best Day */}
          <View style={[s.bottomCard, { backgroundColor: colors.card, borderRadius: colors.radius, flex: 1 }]}>
            <Text style={[s.bottomCardLabel, { color: colors.mutedForeground }]}>Best Day</Text>
            {bestDay ? (
              <>
                <Text style={[s.bottomCardHighlight, { color: colors.primary }]}>
                  {shortFmt(bestDay.date, { month: "short", day: "numeric" })}
                </Text>
                <Text style={{ fontSize: 22, marginVertical: 4 }}>☀️</Text>
                <Text style={[s.bottomCardValue, { color: colors.foreground }]}>
                  {bestDay.count} habits
                </Text>
                <Text style={[s.bottomCardSub, { color: colors.mutedForeground }]}>completed</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 22, marginTop: 8, marginBottom: 4 }}>☀️</Text>
                <Text style={[s.bottomCardSub, { color: colors.mutedForeground }]}>No data yet</Text>
              </>
            )}
          </View>

          {/* Most Consistent Habit */}
          <View style={[s.bottomCard, { backgroundColor: colors.card, borderRadius: colors.radius, flex: 1 }]}>
            <Text style={[s.bottomCardLabel, { color: colors.mutedForeground }]}>Most Consistent Habit</Text>
            {mostConsistent ? (
              <>
                <Text style={{ fontSize: 20, marginTop: 6, marginBottom: 2 }}>
                  {LIFE_PILLARS.find((p) => p.key === mostConsistent.habit.category)?.emoji ?? "✨"}
                </Text>
                <Text style={[s.bottomCardValue, { color: colors.foreground }]} numberOfLines={2}>
                  {mostConsistent.habit.name}
                </Text>
                <Text style={[s.bottomCardSub, { color: colors.mutedForeground }]}>
                  {mostConsistent.done} / {mostConsistent.total} days
                </Text>
                <View style={{ height: 4, backgroundColor: colors.muted, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                  <View style={{
                    width: `${Math.round(mostConsistent.rate * 100)}%` as any,
                    height: "100%",
                    backgroundColor: "#6DBFA0",
                    borderRadius: 2,
                  }} />
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 20, marginTop: 6, marginBottom: 4 }}>✨</Text>
                <Text style={[s.bottomCardSub, { color: colors.mutedForeground }]}>No data yet</Text>
              </>
            )}
          </View>

          {/* Biggest Win */}
          <View style={[s.bottomCard, { backgroundColor: colors.card, borderRadius: colors.radius, flex: 1 }]}>
            <Text style={[s.bottomCardLabel, { color: colors.mutedForeground }]}>Biggest Win</Text>
            <Text style={{ fontSize: 20, marginTop: 6, marginBottom: 4 }}>🏆</Text>
            {latestWin ? (
              <Text style={[s.bottomCardValue, { color: colors.foreground }]} numberOfLines={4}>
                {latestWin.text}
              </Text>
            ) : (
              <Text style={[s.bottomCardSub, { color: colors.mutedForeground }]}>
                No wins logged yet
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ── Empty state ── */}
      {habits.length === 0 && (
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius, alignItems: "center", paddingVertical: 40 }]}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>📈</Text>
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>
            No data yet
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 20, fontFamily: "Inter_400Regular" }}>
            Add habits and start tracking to see your progress here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pageTitle:      { fontSize: 30, fontFamily: "Inter_700Bold" },
  pageSub:        { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  insightsBtn:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginTop: 4 },
  insightsBtnText:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },

  filterRow:      { flexDirection: "row", alignItems: "center", padding: 3 },
  filterTab:      { flex: 1, alignItems: "center", paddingVertical: 8 },
  filterLabel:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  card:           { padding: 18 },
  cardHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle:      { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardPeriodLabel:{ fontSize: 14, fontFamily: "Inter_700Bold" },
  dateRange:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  scoreLabel:     { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  scoreBig:       { fontSize: 52, fontFamily: "Inter_700Bold", lineHeight: 54 },
  scoreUnit:      { fontSize: 12, fontFamily: "Inter_400Regular" },
  trendText:      { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  statRow:        { flexDirection: "row", gap: 8 },
  statCard:       { flex: 1, padding: 10, gap: 2 },
  statIconWrap:   { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statValue:      { fontSize: 19, fontFamily: "Inter_700Bold", lineHeight: 22 },
  statLabel:      { fontSize: 10, fontFamily: "Inter_500Medium", lineHeight: 13 },
  statSub:        { fontSize: 10, fontFamily: "Inter_400Regular" },

  pillarRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  pillarLeft:     { flexDirection: "row", alignItems: "center", gap: 6, width: 108 },
  pillarName:     { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  pillarBarBg:    { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  pillarPct:      { fontSize: 13, fontFamily: "Inter_700Bold", width: 38, textAlign: "right" },

  insightCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#5C4FBF" },
  insightCardBody:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3D3375", lineHeight: 20 },

  bottomCard:       { padding: 12 },
  bottomCardLabel:  { fontSize: 10, fontFamily: "Inter_500Medium", lineHeight: 13 },
  bottomCardHighlight: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  bottomCardValue:  { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  bottomCardSub:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
