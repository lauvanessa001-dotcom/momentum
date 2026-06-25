import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Keyboard, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  MoodEntry, formatDate, useApp,
} from "@/contexts/AppContext";
import {
  cancelReminder, DEFAULT_SETTINGS, formatTime,
  loadNotificationSettings, NotificationSettings,
  requestPermissions, saveNotificationSettings, scheduleReminder,
} from "@/utils/notifications";

const ACHIEVEMENT_EMOJIS = ["🔥","⭐","🏆","💪","✅","🎯","🚀","🌟","💎","🎉","📚","🧘","🏃","💡","🌊","🦋","🎸","🌱","🍎","💖"];

const OPEN_IN_LABELS: Record<string, string> = { "30d": "30 Days", "6m": "6 Months", "1y": "1 Year" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr + "T12:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

function daysElapsed(startDate: string): number {
  const start = new Date(startDate + "T12:00");
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function daysAgo(dateStr: string): string {
  const d = daysElapsed(dateStr);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function fmtDateShort(dateStr: string): string {
  return new Date(dateStr + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateMedium(dateStr: string): string {
  return new Date(dateStr + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function parseQuote(text: string): { quote: string; author: string } {
  const idx = text.lastIndexOf(" — ");
  if (idx > 0) return { quote: text.substring(0, idx).trim(), author: text.substring(idx + 3).trim() };
  const idx2 = text.lastIndexOf(" - ");
  if (idx2 > 0) return { quote: text.substring(0, idx2).trim(), author: text.substring(idx2 + 3).trim() };
  return { quote: text, author: "" };
}

// ─── Mountain SVG ─────────────────────────────────────────────────────────────

function MountainSvg({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Path d="M0 70 L30 30 L50 48 L70 20 L90 40 L110 10 L120 30 L120 70 Z" fill="#C8B8F8" opacity={0.25} />
      <Path d="M0 70 L30 30 L50 48 L70 20 L90 40 L110 10 L120 30 L120 70 Z" fill="none" stroke="#A094E8" strokeWidth={1.5} />
      <Path d="M65 20 L68 26 L72 22" fill="none" stroke="#A094E8" strokeWidth={1} />
      <Path d="M20 70 Q35 55 50 62 Q62 55 70 20" fill="none" stroke="#A094E8" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.6} />
    </Svg>
  );
}

// ─── Section Card Header ──────────────────────────────────────────────────────

function CardHeader({ emoji, label, onAdd, count }: { emoji: string; label: string; onAdd: () => void; count?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8 }}>{label}</Text>
        {count !== undefined && count > 0 && (
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.muted }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>{count}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={onAdd} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="add" size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Quick Add Sheet ──────────────────────────────────────────────────────────

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  title: string;
  placeholder: string;
  multiline?: boolean;
  hint?: string;
}

function QuickAddSheet({ visible, onClose, onSave, title, placeholder, multiline = false, hint }: QuickAddSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [text, setText] = useState("");

  useEffect(() => { if (visible) setText(""); }, [visible]);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave(text.trim());
    setText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.background, paddingBottom: isWeb ? 32 : insets.bottom + 24 }]}>
          <View style={s.sheetHandle}><View style={[s.handle, { backgroundColor: colors.border }]} /></View>
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>{title}</Text>
            {hint && <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 19 }}>{hint}</Text>}
            <TextInput
              style={[s.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: text.trim() ? colors.primary : colors.border, borderRadius: 14, minHeight: multiline ? 100 : 52 }]}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline={multiline}
              autoFocus
              selectionColor={colors.primary}
            />
            <TouchableOpacity
              onPress={handleSave}
              style={[s.primaryBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted, borderRadius: 16 }]}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: text.trim() ? "#fff" : colors.mutedForeground }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Achievement Add Sheet ────────────────────────────────────────────────────

function AchievementSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (text: string, emoji: string) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("🏆");

  useEffect(() => { if (visible) { setText(""); setEmoji("🏆"); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.background, paddingBottom: isWeb ? 32 : insets.bottom + 24 }]}>
          <View style={s.sheetHandle}><View style={[s.handle, { backgroundColor: colors.border }]} /></View>
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>Add Achievement</Text>
            <TextInput
              style={[s.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: text.trim() ? colors.primary : colors.border, borderRadius: 14, height: 52 }]}
              placeholder="e.g. Completed 21-day challenge"
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              autoFocus
              selectionColor={colors.primary}
            />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>CHOOSE EMOJI</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ACHIEVEMENT_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: emoji === e ? colors.primary + "20" : colors.card, borderWidth: emoji === e ? 1.5 : 0, borderColor: colors.primary }}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => { if (text.trim()) { onSave(text.trim(), emoji); onClose(); } }}
              style={[s.primaryBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted, borderRadius: 16 }]}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: text.trim() ? "#fff" : colors.mutedForeground }}>Add Achievement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Mood Calendar ────────────────────────────────────────────────────────────

const MOOD_COLORS = ["#E87878", "#E8AE80", "#E8CE80", "#6B9EEB", "#6DBFA0"];
const MOOD_LABELS = ["Rough", "Low", "Okay", "Good", "Great"];
const MOOD_COLOR_MAP: Record<number, string> = { 1: "#E87878", 2: "#E8AE80", 3: "#E8CE80", 4: "#6B9EEB", 5: "#6DBFA0" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_HEADERS = ["S","M","T","W","T","F","S"];
const PRESET_TIMES = [
  { label: "7 AM", hour: 7, minute: 0 }, { label: "8 AM", hour: 8, minute: 0 },
  { label: "9 AM", hour: 9, minute: 0 }, { label: "10 AM", hour: 10, minute: 0 },
  { label: "12 PM", hour: 12, minute: 0 }, { label: "2 PM", hour: 14, minute: 0 },
  { label: "4 PM", hour: 16, minute: 0 }, { label: "6 PM", hour: 18, minute: 0 },
  { label: "8 PM", hour: 20, minute: 0 }, { label: "9 PM", hour: 21, minute: 0 },
];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getTodayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function getCalendarCells(year: number, month: number): ({ day: number; dateStr: string } | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: toDateStr(year, month, d) });
  return cells;
}

function MoodCalendar({ moodHistory }: { moodHistory: MoodEntry[] }) {
  const colors = useColors();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const todayStr = getTodayStr();
  const cellSize = 38;
  const cells = getCalendarCells(viewYear, viewMonth);
  const moodMap: Record<string, number> = {};
  moodHistory.forEach((e) => { moodMap[e.date] = e.mood; });
  const goBack = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const goForward = () => {
    const now = new Date();
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1);
  };
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const monthEntries = moodHistory.filter((e) => {
    const [y, m] = e.date.split("-").map(Number);
    return y === viewYear && m - 1 === viewMonth && e.mood > 0;
  });
  const avgMood = monthEntries.length > 0 ? monthEntries.reduce((s, e) => s + e.mood, 0) / monthEntries.length : 0;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={goForward} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} disabled={isCurrentMonth}>
          <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.border : colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row" }}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={`e-${i}`} style={{ width: `${100 / 7}%` as any, aspectRatio: 1 }} />;
          const mood = moodMap[cell.dateStr] ?? 0;
          const isFuture = cell.dateStr > todayStr;
          const isToday = cell.dateStr === todayStr;
          const hasMood = mood > 0 && !isFuture;
          return (
            <View key={cell.dateStr} style={{ width: `${100 / 7}%` as any, aspectRatio: 1, padding: 2 }}>
              <View style={{ flex: 1, borderRadius: 8, backgroundColor: hasMood ? MOOD_COLOR_MAP[mood] + "40" : isFuture ? "transparent" : colors.muted + "60", borderWidth: isToday ? 2 : 0, borderColor: isToday ? colors.primary : "transparent", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: hasMood ? MOOD_COLOR_MAP[mood] : isFuture ? colors.border : colors.mutedForeground, fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular", fontSize: 11 }}>{cell.day}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MOOD_LABELS.map((label, i) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MOOD_COLORS[i] }} />
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
          </View>
        ))}
      </View>
      {monthEntries.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: colors.muted, borderRadius: 10 }}>
          <Ionicons name="stats-chart" size={13} color={colors.mutedForeground} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            {monthEntries.length} entries · avg:{" "}
            <Text style={{ color: MOOD_COLORS[Math.round(avgMood) - 1] ?? colors.primary, fontFamily: "Inter_600SemiBold" }}>
              {MOOD_LABELS[Math.min(4, Math.round(avgMood) - 1)] ?? "—"}
            </Text>
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" }}>No mood entries this month</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function YouScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const botPad = isWeb ? 34 : insets.bottom;

  const {
    habits, moodHistory, biggestWins, savedQuotes, myWhy,
    userName, momentumScore, totalCompletions, getBestStreak, getHabitStreak,
    achievements, lessons, gratitudeList, victoryWall, startedDate,
    setUserName, setMyWhy, removeQuote, saveQuote,
    addLesson, removeLesson,
    addGratitude, removeGratitude, addVictory, removeVictory,
  } = useApp();

  // ── Modal / navigation states ──
  const [whyEdit, setWhyEdit]       = useState(false);
  const [whyDraft, setWhyDraft]     = useState(myWhy);
  const [nameEdit, setNameEdit]     = useState(false);
  const [nameDraft, setNameDraft]   = useState(userName);
  const [showQuoteSheet, setShowQuoteSheet]         = useState(false);
  const [showLessonSheet, setShowLessonSheet]       = useState(false);
  const [showGratitudeSheet, setShowGratitudeSheet] = useState(false);
  const [showVictorySheet, setShowVictorySheet]     = useState(false);
  const [quotesExpanded, setQuotesExpanded]         = useState(false);
  const [showTimePicker, setShowTimePicker]         = useState(false);
  const [notifSettings, setNotifSettings]           = useState<NotificationSettings>(DEFAULT_SETTINGS);
  // Sub-nav
  type YouTab = "profile" | "achievements" | "vault";
  const [youTab, setYouTab] = useState<YouTab>("profile");
  const bellScale = useSharedValue(1);
  const bellStyle = useAnimatedStyle(() => ({ transform: [{ scale: bellScale.value }] }));

  useEffect(() => { loadNotificationSettings().then(setNotifSettings); }, []);

  const saveMyWhy = useCallback(async () => { setWhyEdit(false); await setMyWhy(whyDraft); }, [whyDraft]);
  const saveUserName = useCallback(async () => { setNameEdit(false); await setUserName(nameDraft.trim()); }, [nameDraft]);

  const toggleReminder = useCallback(async (val: boolean) => {
    if (Platform.OS === "web") { Alert.alert("Not supported", "Use Expo Go on your iPhone for notifications."); return; }
    if (val) {
      const granted = await requestPermissions();
      if (!granted) { Alert.alert("Permission needed", "Allow notifications in your device settings."); return; }
      bellScale.value = withSpring(1.3, { damping: 6, stiffness: 200 }, () => { bellScale.value = withSpring(1, { damping: 10 }); });
      const next = { ...notifSettings, enabled: true };
      setNotifSettings(next); await saveNotificationSettings(next); await scheduleReminder(next.hour, next.minute);
    } else {
      const next = { ...notifSettings, enabled: false };
      setNotifSettings(next); await saveNotificationSettings(next); await cancelReminder();
    }
  }, [notifSettings, bellScale]);

  const handleSaveTime = useCallback(async (s: NotificationSettings) => {
    setShowTimePicker(false);
    const next = { ...s, enabled: notifSettings.enabled };
    setNotifSettings(next); await saveNotificationSettings(next);
    if (next.enabled) await scheduleReminder(next.hour, next.minute);
  }, [notifSettings.enabled]);

  // ── Computed ──
  const bestStreak    = getBestStreak();
  const currentStreak = habits.length > 0 ? Math.max(...habits.map((h) => getHabitStreak(h.id))) : 0;
  const daysOnJourney = startedDate ? daysElapsed(startedDate) : 0;
  const initial       = userName ? userName.trim()[0].toUpperCase() : "Y";

  // Life highlights (auto-derived)
  const lifeHighlights = [
    { icon: "🚀", label: "Started Momentum", date: startedDate },
    ...(achievements.length > 0 ? [{ icon: achievements[achievements.length - 1].emoji, label: "First Achievement", date: achievements[achievements.length - 1].date }] : []),
    ...(moodHistory.length > 0 ? (() => {
      const best = moodHistory.reduce((a, b) => a.mood > b.mood ? a : b);
      return [{ icon: "😊", label: "Happiest Day", date: best.date }];
    })() : []),
    ...(bestStreak > 0 ? [{ icon: "🔥", label: `${bestStreak}-Day Streak`, date: "" }] : []),
    ...(biggestWins.length > 0 ? [{ icon: "🏆", label: "Biggest Win", date: biggestWins[0].date }] : []),
  ].filter((h) => h.date || h.icon === "🔥").slice(0, 6);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100, paddingHorizontal: 20, gap: 14 }}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: colors.foreground }}>You</Text>
              <Text style={{ fontSize: 20 }}>✦</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
              Your journey. Your growth. Your story.
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setNameDraft(userName); setNameEdit(true); }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.primary + "30" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary }}>{initial}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Sub-nav ── */}
        <View style={{ flexDirection: "row", borderRadius: 14, backgroundColor: colors.muted, padding: 4 }}>
          {([
            { key: "profile" as const, icon: "person-outline" as const, label: "Profile" },
            { key: "achievements" as const, icon: "star-outline" as const, label: "Achievements" },
            { key: "vault" as const, icon: "archive-outline" as const, label: "Memory Vault" },
          ]).map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setYouTab(key)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: youTab === key ? colors.card : "transparent" }}
              activeOpacity={0.7}
            >
              <Ionicons name={icon} size={16} color={youTab === key ? colors.primary : colors.mutedForeground} />
              <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: youTab === key ? colors.primary : colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {youTab === "profile" && <>
        {/* ── My Why ── */}
        <View style={[s.card, { backgroundColor: colors.primary + "08", borderRadius: colors.radius, borderWidth: 1, borderColor: colors.primary + "18" }]}>
          <CardHeader emoji="💡" label="MY WHY" onAdd={() => { setWhyDraft(myWhy); setWhyEdit(true); }} />
          {whyEdit ? (
            <TextInput
              style={[s.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.primary, borderRadius: 12, marginTop: 4, minHeight: 80 }]}
              value={whyDraft}
              onChangeText={setWhyDraft}
              onBlur={saveMyWhy}
              placeholder="What is your deeper reason for building these habits?"
              placeholderTextColor={colors.mutedForeground}
              multiline autoFocus
              selectionColor={colors.primary}
            />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <TouchableOpacity onPress={() => { setWhyDraft(myWhy); setWhyEdit(true); }} style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", fontStyle: myWhy ? "italic" : "normal", color: myWhy ? colors.foreground : colors.mutedForeground, lineHeight: 23 }}>
                  {myWhy || "Tap to write your purpose statement…"}
                </Text>
              </TouchableOpacity>
              <MountainSvg width={90} height={56} />
            </View>
          )}
          {startedDate ? (
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 10 }}>
              Started {fmtDateMedium(startedDate)} · {daysAgo(startedDate)}
            </Text>
          ) : null}
        </View>

        {/* ── Saved Quotes ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <CardHeader emoji="💬" label="SAVED QUOTES" onAdd={() => setShowQuoteSheet(true)} count={savedQuotes.length} />
          {savedQuotes.length === 0 ? (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
              Words that remind you who you're becoming.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {(quotesExpanded ? savedQuotes : savedQuotes.slice(0, 4)).map((q, idx) => {
                const { quote, author } = parseQuote(q);
                const visibleList = quotesExpanded ? savedQuotes : savedQuotes.slice(0, 4);
                const isLast = idx === visibleList.length - 1;
                return (
                  <View key={idx} style={{
                    flexDirection: "row", alignItems: "flex-start", gap: 8,
                    paddingBottom: isLast ? 0 : 12,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                  }}>
                    <Text style={{ fontSize: 24, color: colors.primary + "30", fontFamily: "Inter_700Bold", lineHeight: 26, marginTop: -2 }}>"</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20, fontStyle: "italic" }}>{quote}</Text>
                      {author ? <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginTop: 3 }}>— {author}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => removeQuote(q)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="heart" size={16} color={colors.primary + "60"} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {savedQuotes.length > 4 && (
                <TouchableOpacity
                  onPress={() => setQuotesExpanded((v) => !v)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingTop: 4 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                    {quotesExpanded ? "Show less" : `Show all ${savedQuotes.length} quotes`}
                  </Text>
                  <Ionicons name={quotesExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Gratitude List ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <CardHeader emoji="❤️" label="GRATITUDE LIST" onAdd={() => setShowGratitudeSheet(true)} count={gratitudeList.length} />
          {gratitudeList.length === 0 ? (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
              Focus on the good. Add things you're grateful for.
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {gratitudeList.map((g, idx) => (
                <TouchableOpacity
                  key={idx}
                  onLongPress={() => Alert.alert("Remove?", g, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => removeGratitude(idx) },
                  ])}
                  style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E87878" + "15" }}
                >
                  <Ionicons name="heart" size={10} color="#E87878" />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 10 }}>
            Focusing on the good.
          </Text>
        </View>

        {/* ── Victory Wall ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <CardHeader emoji="🎉" label="VICTORY WALL" onAdd={() => setShowVictorySheet(true)} count={victoryWall.length} />
          {victoryWall.length === 0 ? (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
              Small wins. Big impact. Add your everyday victories here.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {victoryWall.slice(0, 5).map((v) => (
                <TouchableOpacity
                  key={v.id}
                  onLongPress={() => Alert.alert("Remove win?", v.text, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => removeVictory(v.id) },
                  ])}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#6DBFA0" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{v.text}</Text>
                </TouchableOpacity>
              ))}
              {victoryWall.length > 5 && (
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>+{victoryWall.length - 5} more victories</Text>
              )}
            </View>
          )}
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 10 }}>
            Small wins. Big impact.
          </Text>
        </View>

        {/* ── Lessons I've Learned ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <CardHeader emoji="🧠" label="LESSONS I'VE LEARNED" onAdd={() => setShowLessonSheet(true)} count={lessons.length} />
          {lessons.length === 0 ? (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
              What has life taught you recently?
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {lessons.slice(0, 4).map((l, idx) => (
                <TouchableOpacity
                  key={idx}
                  onLongPress={() => Alert.alert("Remove lesson?", l, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => removeLesson(idx) },
                  ])}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }} />
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{l}</Text>
                </TouchableOpacity>
              ))}
              {lessons.length > 4 && (
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>+{lessons.length - 4} more</Text>
              )}
            </View>
          )}
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 10 }}>
            Reflect. Learn. Grow.
          </Text>
        </View>

        {/* ── Mood History ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 16, marginRight: 7 }}>😊</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8 }}>MOOD HISTORY</Text>
          </View>
          <MoodCalendar moodHistory={moodHistory} />
        </View>

        {/* ── Settings ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8, marginBottom: 16 }}>SETTINGS</Text>

          <View style={[s.settingRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingBottom: 16, marginBottom: 16 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              {nameEdit ? (
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 10, backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.primary }}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onBlur={saveUserName}
                  onSubmitEditing={saveUserName}
                  placeholder="Your name"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus maxLength={30}
                  selectionColor={colors.primary}
                />
              ) : (
                <TouchableOpacity onPress={() => { setNameDraft(userName); setNameEdit(true); }} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_400Regular", color: userName ? colors.foreground : colors.mutedForeground }}>
                    {userName || "Set your name"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => { setNameDraft(userName); setNameEdit(!nameEdit); }}>
              <Ionicons name={nameEdit ? "checkmark" : "pencil"} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={s.settingRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Animated.View style={bellStyle}>
                <Ionicons name="notifications-outline" size={18} color={colors.mutedForeground} />
              </Animated.View>
              <View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_400Regular", color: colors.foreground }}>Daily Reminder</Text>
                {notifSettings.enabled && (
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Inter_400Regular" }}>
                      {formatTime(notifSettings.hour, notifSettings.minute)} — tap to change
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Switch
              value={notifSettings.enabled}
              onValueChange={toggleReminder}
              trackColor={{ false: colors.muted, true: colors.primary + "88" }}
              thumbColor={notifSettings.enabled ? colors.primary : "#CCC"}
            />
          </View>
        </View>
        </>}

        {/* ── Achievements Tab ── */}
        {youTab === "achievements" && (
          <View style={{ alignItems: "center", paddingTop: 48, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>🏆</Text>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground }}>Achievements</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 16, lineHeight: 21 }}>Your milestones and badges will appear here as you build momentum.</Text>
          </View>
        )}

        {/* ── Memory Vault Tab ── */}
        {youTab === "vault" && (
          <View style={{ alignItems: "center", paddingTop: 48, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground }}>Memory Vault</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 16, lineHeight: 21 }}>Your memories and reflections will be stored here for you to revisit.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <QuickAddSheet
        visible={showQuoteSheet}
        onClose={() => setShowQuoteSheet(false)}
        onSave={saveQuote}
        title="Add Quote"
        placeholder={`"The obstacle is the way." — Ryan Holiday`}
        hint="Format: quote text — Author Name (the author part is optional)"
        multiline
      />
      <QuickAddSheet
        visible={showLessonSheet}
        onClose={() => setShowLessonSheet(false)}
        onSave={addLesson}
        title="Add a Lesson"
        placeholder="e.g. Walking always improves my mood."
        multiline
      />
      <QuickAddSheet
        visible={showGratitudeSheet}
        onClose={() => setShowGratitudeSheet(false)}
        onSave={addGratitude}
        title="Add to Gratitude List"
        placeholder="e.g. My family, Good health, Sunny mornings…"
      />
      <QuickAddSheet
        visible={showVictorySheet}
        onClose={() => setShowVictorySheet(false)}
        onSave={addVictory}
        title="Add to Victory Wall"
        placeholder="e.g. I said no to junk food today."
      />

      {/* Reminder time picker */}
      <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={{ padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.card }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 14 }}>Choose Reminder Time</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PRESET_TIMES.map((t) => {
                  const selected = notifSettings.hour === t.hour && notifSettings.minute === t.minute;
                  return (
                    <TouchableOpacity
                      key={t.label}
                      onPress={() => handleSaveTime({ ...notifSettings, hour: t.hour, minute: t.minute })}
                      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: colors.radius / 2, backgroundColor: selected ? colors.primary : colors.muted }}
                    >
                      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: selected ? "#fff" : colors.foreground }}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:       { flex: 1 },
  card: {
    padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  textArea:   { fontSize: 14, fontFamily: "Inter_400Regular", padding: 14, borderWidth: 1.5, lineHeight: 21 },
  sheet:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 6, maxHeight: "85%" },
  sheetHandle: { alignItems: "center", paddingVertical: 12 },
  handle:     { width: 40, height: 4, borderRadius: 2 },
  primaryBtn: { padding: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
});
