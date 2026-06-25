import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { formatDate, getPillar, LIFE_PILLARS, MOOD_ENCOURAGEMENTS, Task, useApp } from "@/contexts/AppContext";
import { ProgressCircle } from "@/components/ProgressCircle";
import { CATEGORY_COLORS, PushMessage } from "@/constants/pushMessages";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HABIT_COLOR_MAP: Record<string, string> = {
  habitBlue: "#6B9EEB", habitMint: "#6DBFA0", habitRose: "#E89494",
  habitLavender: "#9B8BF0", habitPeach: "#E8AE80", habitYellow: "#E8CE80",
};

const MOOD_OPTIONS = [
  { value: 5, emoji: "😄", label: "Great", color: "#6DBFA0" },
  { value: 4, emoji: "😊", label: "Good",  color: "#6B9EEB" },
  { value: 3, emoji: "😐", label: "Okay",  color: "#E8CE80" },
  { value: 2, emoji: "😔", label: "Low",   color: "#E8AE80" },
  { value: 1, emoji: "😣", label: "Rough", color: "#E87878" },
];

const MOOD_COLOR_MAP: Record<number, string> = {
  5: "#6DBFA0", 4: "#6B9EEB", 3: "#E8CE80", 2: "#E8AE80", 1: "#E87878", 0: "transparent",
};

function getGreetingData(name: string): { greeting: string; emoji: string; subtitle: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: `Good Morning${name ? `, ${name}` : ""}`, emoji: "☀️", subtitle: "Let's make today meaningful." };
  if (h >= 12 && h < 17) return { greeting: `Good Afternoon${name ? `, ${name}` : ""}`, emoji: "🌤️", subtitle: "You're halfway through — finish strong." };
  if (h >= 17 && h < 21) return { greeting: `Good Evening${name ? `, ${name}` : ""}`, emoji: "🌅", subtitle: "Wrap up today with intention." };
  return { greeting: `Good Night${name ? `, ${name}` : ""}`, emoji: "🌙", subtitle: "Rest well. Tomorrow is another chance." };
}

function formatDueLabel(dateStr: string): string {
  const todayStr = formatDate(new Date());
  const d = new Date(dateStr + "T12:00");
  const diff = Math.round((d.getTime() - new Date(todayStr + "T12:00").getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Score Info Modal ─────────────────────────────────────────────────────────

function ScoreInfoModal({ visible, onClose, colors }: {
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[s.infoCard, { backgroundColor: colors.card, borderRadius: 24 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground }}>
                How it's calculated
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 20, fontFamily: "Inter_400Regular" }}>
              Momentum measures your completed actions today, not your mood.
            </Text>
            <View style={{ gap: 10, marginTop: 14 }}>
              {[
                { label: "Habits completed today", pts: "up to 60 pts", color: "#6DBFA0" },
                { label: "Today's Priorities completed", pts: "up to 30 pts", color: "#7C6CE7" },
                { label: "Daily check-in / opened app", pts: "10 pts", color: "#6B9EEB" },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: item.color }}>{item.pts}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 14, lineHeight: 18, fontFamily: "Inter_400Regular", fontStyle: "italic" }}>
              Mood is tracked separately — how you feel matters, but it shouldn't penalize your progress.
            </Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Calendar Picker ──────────────────────────────────────────────────────────

function CalendarPicker({ selected, onSelect, colors }: {
  selected: string;
  onSelect: (dateStr: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const today = formatDate(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const d = selected ? new Date(selected + "T12:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const { year, month } = viewDate;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevMonth = () => setViewDate(v => { const d = new Date(v.year, v.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const nextMonth = () => setViewDate(v => { const d = new Date(v.year, v.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground }}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>{d}</Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: "row", marginBottom: 2 }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={{ flex: 1 }} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = dateStr === selected;
            const isToday = dateStr === today;
            return (
              <TouchableOpacity
                key={col}
                onPress={() => { onSelect(dateStr); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 5 }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 30, height: 30, borderRadius: 15,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: isSelected ? colors.primary : "transparent",
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: colors.primary,
                }}>
                  <Text style={{
                    fontSize: 13,
                    fontFamily: isSelected ? "Inter_700Bold" : "Inter_400Regular",
                    color: isSelected ? "#fff" : isToday ? colors.primary : colors.foreground,
                  }}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Task Sheet ───────────────────────────────────────────────────────────────

interface TaskSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, dueDate: string, category: string) => void;
  initialTask?: Task | null;
}

function TaskSheet({ visible, onClose, onSave, initialTask }: TaskSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb  = Platform.OS === "web";
  const bottomPad = isWeb ? 24 : insets.bottom + 8;
  const todayStr = formatDate(new Date());

  const [name, setName]         = useState(initialTask?.name ?? "");
  const [dueDate, setDueDate]   = useState(initialTask?.dueDate ?? todayStr);
  const [category, setCategory] = useState(initialTask?.category ?? "");
  const [showCalendar, setShowCalendar] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const slideAnim   = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setName(initialTask?.name ?? "");
      setDueDate(initialTask?.dueDate ?? todayStr);
      setCategory(initialTask?.category ?? "");
      setShowCalendar(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 22, tension: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start(() => setTimeout(() => nameRef.current?.focus(), 100));
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSave = () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(name.trim(), dueDate, category);
    close();
  };

  // 7-day strip for due date
  const dateOptions = useMemo(() => {
    const out: Array<{ dateStr: string; label: string; dayNum: number }> = [];
    for (let i = 0; i <= 13; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = formatDate(d);
      const label = i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-US", { weekday: "short" });
      out.push({ dateStr: ds, label, dayNum: d.getDate() });
    }
    return out;
  }, []);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropAnim }]}>
            <TouchableWithoutFeedback onPress={close}>
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
            </TouchableWithoutFeedback>
          </Animated.View>
          <Animated.View style={[
            s.sheet,
            { backgroundColor: colors.background, paddingBottom: bottomPad },
            { transform: [{ translateY: slideAnim }] },
          ]}>
            <View style={s.handleWrap}>
              <View style={[s.handle, { backgroundColor: colors.border }]} />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 20, paddingHorizontal: 24, paddingBottom: 12 }}
            >
              <Text style={[s.sheetTitle, { color: colors.foreground }]}>
                {initialTask ? "Edit Task" : "Add Task"}
              </Text>

              {/* Name */}
              <View>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>TASK</Text>
                <TextInput
                  ref={nameRef}
                  style={[s.nameInput, {
                    backgroundColor: colors.card, color: colors.foreground,
                    borderColor: name.trim() ? colors.primary : colors.border, borderRadius: 14,
                  }]}
                  placeholder="What needs to be done?"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  maxLength={80}
                  selectionColor={colors.primary}
                />
              </View>

              {/* Due date */}
              <View style={{ gap: 10 }}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>DUE DATE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {dateOptions.map(({ dateStr, label, dayNum }) => {
                    const selected = dueDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        onPress={() => { setDueDate(dateStr); setShowCalendar(false); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                        style={[s.dateChip, {
                          backgroundColor: selected ? colors.primary : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                          borderRadius: 12,
                        }]}
                        activeOpacity={0.75}
                      >
                        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: selected ? "rgba(255,255,255,0.8)" : colors.mutedForeground }}>
                          {label}
                        </Text>
                        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: selected ? "#fff" : colors.foreground, lineHeight: 20 }}>
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setShowCalendar(v => !v)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primary }}>
                    {showCalendar ? "Hide calendar" : "Pick from calendar"}
                  </Text>
                </TouchableOpacity>
                {showCalendar && (
                  <CalendarPicker
                    selected={dueDate}
                    onSelect={(ds) => { setDueDate(ds); setShowCalendar(false); }}
                    colors={colors}
                  />
                )}
              </View>

              {/* Category (optional) */}
              <View>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>LIFE PILLAR  <Text style={{ fontFamily: "Inter_400Regular" }}>optional</Text></Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {LIFE_PILLARS.map((p) => {
                    const active = category === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => { setCategory(active ? "" : p.key); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                        style={[s.catChip, {
                          backgroundColor: active ? p.color + "22" : colors.card,
                          borderColor: active ? p.color : colors.border,
                          borderRadius: 10,
                        }]}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13 }}>{p.emoji}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: active ? p.color : colors.foreground }}>
                          {p.key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Buttons */}
              <View style={s.btnRow}>
                <TouchableOpacity onPress={close} style={[s.cancelBtn, { backgroundColor: colors.muted, borderRadius: 14 }]} activeOpacity={0.7}>
                  <Text style={[s.cancelText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[s.saveBtn, { backgroundColor: name.trim() ? colors.primary : colors.muted, borderRadius: 14, flex: 1.5 }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color={name.trim() ? "#FFF" : colors.mutedForeground} />
                  <Text style={[s.saveText, { color: name.trim() ? "#FFF" : colors.mutedForeground }]}>
                    {initialTask ? "Save Changes" : "Add Task"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Inspire Me Modal ─────────────────────────────────────────────────────────

interface InspireModalProps {
  visible: boolean;
  message: PushMessage | null;
  scaleAnim: Animated.Value;
  onClose: () => void;
  onRefresh: () => void;
  onBack: () => void;
  canGoBack: boolean;
  onSave: () => void;
  onUseQuote: () => void;
  isSaved: boolean;
  colors: ReturnType<typeof useColors>;
}

function InspireModal({ visible, message, scaleAnim, onClose, onRefresh, onBack, canGoBack, onSave, onUseQuote, isSaved, colors }: InspireModalProps) {
  if (!message) return null;
  const isQuote = message.type === "quote";
  const categoryColor = CATEGORY_COLORS[message.category] ?? colors.primary;
  const cardBg: [string, string] = isQuote ? ["#FAF8FF", "#F4F0FF"]
    : message.type === "confidence" ? ["#F8F4FF", "#F0EAFF"]
    : message.type === "tough-love" ? ["#FFF8F0", "#FFF2E8"]
    : ["#F4FFF8", "#E8FFF2"];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[s.inspireCardWrapper, { transform: [{ scale: scaleAnim }], opacity: scaleAnim }]}>
          <TouchableOpacity activeOpacity={1}>
            <LinearGradient colors={cardBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.inspireCard, { borderRadius: 28, borderColor: categoryColor + "35", borderWidth: 1.5 }]}>
              <TouchableOpacity onPress={onClose} style={s.inspireClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={[s.inspireCloseBg, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                  <Ionicons name="close" size={15} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
              <View style={[s.catBadge, { backgroundColor: categoryColor + "1A" }]}>
                <View style={[s.catDot, { backgroundColor: categoryColor }]} />
                <Text style={[s.catText, { color: categoryColor }]}>{message.category}</Text>
              </View>
              {isQuote ? (
                <Text style={[s.bigQuote, { color: categoryColor + "28" }]}>"</Text>
              ) : (
                <View style={[s.iconCircle, { backgroundColor: categoryColor + "1A" }]}>
                  <Ionicons name={message.type === "confidence" ? "heart" : message.type === "tough-love" ? "flash" : "bulb"} size={30} color={categoryColor} />
                </View>
              )}
              <Text style={[s.inspireText, { color: colors.foreground, fontFamily: isQuote ? "Inter_500Medium" : "Inter_600SemiBold", fontStyle: isQuote ? "italic" : "normal" }]}>
                {message.text}
              </Text>
              {message.source && (
                <View style={s.attribution}>
                  <View style={[s.attribLine, { backgroundColor: categoryColor }]} />
                  <View>
                    <Text style={[s.attribName, { color: colors.foreground }]}>{message.source}</Text>
                    {message.sourceRole && <Text style={[s.attribRole, { color: colors.mutedForeground }]}>{message.sourceRole}</Text>}
                  </View>
                </View>
              )}

              {/* Save + Back + Next row */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={onSave}
                  style={[s.refreshBtn, { flex: 1, backgroundColor: isSaved ? "#E8728C18" : "rgba(0,0,0,0.05)", borderColor: isSaved ? "#E8728C44" : "rgba(0,0,0,0.08)" }]}
                  activeOpacity={0.75}>
                  <Ionicons name={isSaved ? "heart" : "heart-outline"} size={15} color={isSaved ? "#E8728C" : colors.mutedForeground} />
                  <Text style={[s.refreshText, { color: isSaved ? "#E8728C" : colors.mutedForeground }]}>
                    {isSaved ? "Saved" : "Save"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onBack} disabled={!canGoBack}
                  style={[s.refreshBtn, { paddingHorizontal: 14, backgroundColor: canGoBack ? categoryColor + "12" : "rgba(0,0,0,0.04)", borderColor: canGoBack ? categoryColor + "28" : "rgba(0,0,0,0.06)" }]}
                  activeOpacity={0.75}>
                  <Ionicons name="arrow-back" size={16} color={canGoBack ? categoryColor : colors.mutedForeground + "60"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onRefresh}
                  style={[s.refreshBtn, { flex: 1, backgroundColor: categoryColor + "12", borderColor: categoryColor + "28" }]}
                  activeOpacity={0.75}>
                  <Ionicons name="arrow-forward" size={15} color={categoryColor} />
                  <Text style={[s.refreshText, { color: categoryColor }]}>Next</Text>
                </TouchableOpacity>
              </View>

              {/* Set as today's quote — clear call-to-action */}
              <TouchableOpacity onPress={onUseQuote} activeOpacity={0.82}
                style={{ borderRadius: 16, borderWidth: 2, borderColor: categoryColor, borderStyle: "dashed", overflow: "hidden", marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: categoryColor + "18", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="sunny" size={18} color={categoryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: categoryColor }}>Set as Today's Inspiration</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>Tap to show this on your Today tab</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={categoryColor} />
                </View>
              </TouchableOpacity>

            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Inspiration Backdrop (mountains + sun) ───────────────────────────────────

function InspirationBackdrop() {
  return (
    <Svg width={230} height={150} viewBox="0 0 230 150" style={{ position: "absolute", right: 0, top: 0 }} pointerEvents="none">
      <SvgCircle cx={172} cy={40} r={19} fill="#F6CE94" opacity={0.75} />
      <SvgPath d="M70 150 L120 86 L168 150 Z" fill="#CFC5F3" opacity={0.55} />
      <SvgPath d="M118 150 L165 78 L210 138 L230 150 Z" fill="#B3A4EC" opacity={0.6} />
      <SvgPath d="M158 150 L205 96 L230 128 L230 150 Z" fill="#9B8BF0" opacity={0.5} />
    </Svg>
  );
}

// ─── Today Screen ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const {
    habits, userName, biggestWin,
    todayMood, todayPriorities, scoreBreakdown, momentumScore,
    tasks, addTask, editTask, removeTask, toggleTask,
    addPriority, togglePriority, removePriority,
    toggleHabit, logMood, setBiggestWin, getPushMessage,
    getDailyQuoteCard, getTodayCompletionCount, isHabitDueToday,
    getHabitStreak, savedQuotes, saveQuote, removeQuote,
    pinnedQuote, setPinnedQuote, clearPinnedQuote,
  } = useApp();

  const isWeb    = Platform.OS === "web";
  const topPad   = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  // ── State ──
  const [pushMsg, setPushMsg]               = useState<PushMessage | null>(null);
  const [pushHistory, setPushHistory]       = useState<PushMessage[]>([]);
  const [pushVisible, setPushVisible]       = useState(false);
  const [scoreInfo, setScoreInfo]     = useState(false);
  const [priorityDraft, setPriorityDraft] = useState("");
  const [winDraft, setWinDraft]       = useState(biggestWin);
  const [winEditing, setWinEditing]   = useState(!biggestWin);
  const [taskSheetOpen, setTaskSheetOpen]   = useState(false);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);

  const pushAnim = useRef(new Animated.Value(0)).current;
  const priorityInputRef = useRef<TextInput>(null);

  // ── Derived ──
  const todayStr     = formatDate(new Date());
  const canAddPriority = todayPriorities.length < 3;
  const { greeting } = getGreetingData(userName);
  const dailyQuote = getDailyQuoteCard();
  const activePinned = pinnedQuote?.date === todayStr ? pinnedQuote : null;
  const quote = activePinned ?? dailyQuote;
  const isPinned = !!activePinned;
  const todayDone = getTodayCompletionCount();
  const habitsDueToday = useMemo(
    () => habits.filter((h) => isHabitDueToday(h)),
    [habits],
  );
  const totalHabits   = habitsDueToday.length;

  const tasksDueToday = useMemo(() =>
    tasks.filter(t => t.dueDate === todayStr).sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0)),
    [tasks, todayStr]
  );
  const tasksUpcoming = useMemo(() =>
    tasks.filter(t => t.dueDate > todayStr && !t.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [tasks, todayStr]
  );

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style);
  };

  const notifCount = tasksDueToday.filter(t => !t.completed).length
    + todayPriorities.filter(p => !p.completed).length;
  const quoteSaved = savedQuotes.includes(quote.text);
  const scoreLabel = momentumScore >= 80 ? "Great job!"
    : momentumScore >= 50 ? "Keep going!"
    : momentumScore > 0 ? "Good start!" : "Let's begin!";
  const toggleSaveQuote = () => {
    haptic();
    if (quoteSaved) removeQuote(quote.text); else saveQuote(quote.text);
  };

  // ── Handlers ──
  const openInspire = () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setPushHistory([]);
    setPushMsg(getPushMessage());
    setPushVisible(true);
    pushAnim.setValue(0);
    Animated.spring(pushAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }).start();
  };
  const closeInspire = () => {
    Animated.timing(pushAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPushVisible(false);
      setPushHistory([]);
    });
  };
  const refreshInspire = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(pushAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.spring(pushAnim, { toValue: 1, useNativeDriver: true, friction: 7 }),
    ]).start();
    setPushHistory((prev) => pushMsg ? [...prev, pushMsg] : prev);
    setPushMsg(getPushMessage());
  };
  const goBackInspire = () => {
    if (pushHistory.length === 0) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(pushAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.spring(pushAnim, { toValue: 1, useNativeDriver: true, friction: 7 }),
    ]).start();
    const prev = [...pushHistory];
    const last = prev.pop()!;
    setPushHistory(prev);
    setPushMsg(last);
  };

  const handleMood = (m: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    logMood(m);
  };

  const handleAddPriority = async () => {
    const t = priorityDraft.trim();
    if (!t || !canAddPriority) return;
    haptic();
    await addPriority(t);
    setPriorityDraft("");
  };

  const handleAddTask = async (name: string, dueDate: string, category: string) => {
    haptic();
    await addTask(name, dueDate, category);
  };

  const handleEditTask = async (name: string, dueDate: string, category: string) => {
    if (!editingTask) return;
    await editTask(editingTask.id, { name, dueDate, category });
    setEditingTask(null);
  };

  const saveWin = () => { setWinEditing(false); setBiggestWin(winDraft); };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: topPad + 20, paddingBottom: bottomPad + 110, paddingHorizontal: 20, gap: 14 }}
      >
        {/* 1. Header */}
        <View style={s.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[s.greeting, { color: colors.foreground }]} numberOfLines={1}>{greeting} 👋</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>Let's make today count.</Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity
              onPress={() => { haptic(); router.push("/(tabs)/profile"); }}
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
              {notifCount > 0 && (
                <View style={[s.badge, { borderColor: colors.background }]}>
                  <Text style={s.badgeText}>{notifCount > 9 ? "9+" : notifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { haptic(); router.push("/(tabs)/profile"); }}
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Today's Inspiration — hero */}
        <View style={[s.inspirationCard, { borderRadius: colors.radius }]}>
          <LinearGradient
            colors={["#E7E0FB", "#F0EBFC", "#F7F2FF"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <InspirationBackdrop />
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={[s.inspirationLabel, { color: colors.primary }]}>Today's Inspiration</Text>
              </View>
              {isPinned && (
                <TouchableOpacity
                  onPress={() => { haptic(); clearPinnedQuote(); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)" }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="star" size={11} color={colors.primary} />
                  <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Pinned</Text>
                  <Ionicons name="close" size={11} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[s.inspirationQuote, { color: colors.foreground }]}>{quote.text}</Text>
            <Text style={[s.inspirationAuthor, { color: colors.mutedForeground }]}>— {quote.source}</Text>
            <View style={s.inspirationBtnRow}>
              <TouchableOpacity onPress={toggleSaveQuote} style={s.saveQuoteBtn} activeOpacity={0.8}>
                <Ionicons name={quoteSaved ? "heart" : "heart-outline"} size={15} color={quoteSaved ? "#E8728C" : colors.foreground} />
                <Text style={[s.saveQuoteText, { color: colors.foreground }]}>{quoteSaved ? "Saved" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openInspire} activeOpacity={0.85}>
                <LinearGradient colors={["#7C6CE7", "#9B8BF0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.inspireMeBtn}>
                  <Ionicons name="shuffle" size={15} color="#FFF" />
                  <Text style={s.inspireMeText}>Inspire Me</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Momentum Score */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Text style={[s.momentumTitle, { color: colors.foreground }]}>Momentum Score</Text>
                <TouchableOpacity onPress={() => setScoreInfo(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={[s.momentumBig, { color: colors.primary }]}>{momentumScore}</Text>
                <Text style={[s.momentumOf2, { color: colors.mutedForeground }]}>out of 100</Text>
              </View>
            </View>
            <ProgressCircle progress={momentumScore / 100} size={96} strokeWidth={9}
              color={colors.primary} trackColor={colors.primary + "1A"}>
              <Text style={[s.ringPct, { color: colors.foreground }]}>{momentumScore}%</Text>
              <Text style={[s.ringLabel, { color: colors.primary }]}>{scoreLabel}</Text>
            </ProgressCircle>
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          <View style={s.statRow}>
            {[
              { icon: "checkmark-circle" as const, label: "Habits",         value: scoreBreakdown.habits,     max: 60, color: "#6DBFA0" },
              { icon: "star" as const,             label: "Priorities",     value: scoreBreakdown.priorities, max: 30, color: "#F0A050" },
              { icon: "checkmark-done-circle" as const, label: "Daily Check-in", value: scoreBreakdown.checkIn, max: 10, color: colors.primary },
            ].map((st) => (
              <View key={st.label} style={s.statCell}>
                <Ionicons name={st.icon} size={16} color={st.color} />
                <Text style={[s.statLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{st.label}</Text>
                <Text style={[s.statValue, { color: colors.foreground }]}>{st.value} / {st.max}</Text>
                <View style={[s.statTrack, { backgroundColor: colors.muted }]}>
                  <View style={[s.statFill, { width: `${Math.min(100, (st.value / st.max) * 100)}%` as any, backgroundColor: st.color }]} />
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => setScoreInfo(true)} style={s.calcLink} activeOpacity={0.7}>
            <Text style={[s.calcLinkText, { color: colors.primary }]}>How is this calculated?</Text>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 4. Today's Priorities */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="star" size={15} color="#F0A050" />
              <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S PRIORITIES</Text>
            </View>
            <View style={[s.pill, {
              backgroundColor: todayPriorities.filter(p => p.completed).length === todayPriorities.length && todayPriorities.length > 0
                ? colors.accent + "20" : colors.muted,
            }]}>
              <Text style={[s.pillText, {
                color: todayPriorities.filter(p => p.completed).length === todayPriorities.length && todayPriorities.length > 0
                  ? colors.accent : colors.mutedForeground,
              }]}>
                {todayPriorities.filter(p => p.completed).length}/{todayPriorities.length} done
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {todayPriorities.map((p, i) => (
              <TouchableOpacity key={p.id} onPress={() => { haptic(); togglePriority(p.id); }}
                style={s.priorityRow} activeOpacity={0.7}>
                <View style={[s.priorityCheck, {
                  borderColor: p.completed ? colors.primary : colors.border,
                  backgroundColor: p.completed ? colors.primary : "transparent",
                }]}>
                  {p.completed && <Ionicons name="checkmark" size={13} color="#FFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.priorityNum, { color: p.completed ? colors.mutedForeground : colors.primary }]}>#{i + 1}</Text>
                  <Text style={[s.priorityText, {
                    color: p.completed ? colors.mutedForeground : colors.foreground,
                    textDecorationLine: p.completed ? "line-through" : "none",
                  }]}>{p.text}</Text>
                </View>
                <TouchableOpacity onPress={() => removePriority(p.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close-circle" size={18} color={colors.border} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {canAddPriority && (
              <View style={[s.addPriorityRow, {
                backgroundColor: colors.muted, borderRadius: 12,
                borderColor: priorityDraft ? colors.primary : "transparent",
              }]}>
                <Text style={[s.addPriorityNum, { color: colors.primary }]}>#{todayPriorities.length + 1}</Text>
                <TextInput
                  ref={priorityInputRef}
                  style={[s.addPriorityInput, { color: colors.foreground }]}
                  placeholder={
                    todayPriorities.length === 0 ? "Add your #1 priority for today..."
                    : todayPriorities.length === 1 ? "Add priority #2..."
                    : "One last one..."
                  }
                  placeholderTextColor={colors.mutedForeground}
                  value={priorityDraft}
                  onChangeText={setPriorityDraft}
                  returnKeyType="done"
                  onSubmitEditing={handleAddPriority}
                  selectionColor={colors.primary}
                  maxLength={80}
                />
                {priorityDraft.trim().length > 0 && (
                  <TouchableOpacity onPress={handleAddPriority}>
                    <View style={[s.addConfirm, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!canAddPriority && (
              <View style={[s.maxHint, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <Text style={[s.maxHintText, { color: colors.mutedForeground }]}>Top 3 set — now focus on these.</Text>
              </View>
            )}
          </View>
        </View>

        {/* 5. Tasks */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkbox-outline" size={15} color={colors.primary} />
              <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>TASKS</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setTaskSheetOpen(true); haptic(); }}
              style={[s.addTaskBtn, { backgroundColor: colors.primary + "14" }]}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {/* Due Today */}
          {tasksDueToday.length === 0 && tasksUpcoming.length === 0 ? (
            <TouchableOpacity
              onPress={() => { setTaskSheetOpen(true); haptic(); }}
              style={[s.emptyTasks, { backgroundColor: colors.muted, borderRadius: 12 }]}
            >
              <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                No tasks yet — tap Add Task
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 0 }}>
              {tasksDueToday.length > 0 && (
                <View style={{ gap: 6, marginBottom: tasksUpcoming.length > 0 ? 14 : 0 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, letterSpacing: 0.5 }}>
                    DUE TODAY
                  </Text>
                  {tasksDueToday.map((task) => {
                    const pillar = LIFE_PILLARS.find(p => p.key === task.category);
                    return (
                      <View key={task.id} style={s.taskRow}>
                        <TouchableOpacity
                          onPress={() => { haptic(); toggleTask(task.id); }}
                          style={[s.taskCheck, {
                            borderColor: task.completed ? colors.primary : colors.border,
                            backgroundColor: task.completed ? colors.primary : "transparent",
                          }]}
                        >
                          {task.completed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => { haptic(); toggleTask(task.id); }} activeOpacity={0.7}>
                          <Text style={[s.taskName, {
                            color: task.completed ? colors.mutedForeground : colors.foreground,
                            textDecorationLine: task.completed ? "line-through" : "none",
                          }]} numberOfLines={2}>{task.name}</Text>
                          {pillar && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <Text style={{ fontSize: 10 }}>{pillar.emoji}</Text>
                              <Text style={{ fontSize: 10, color: pillar.color, fontFamily: "Inter_500Medium" }}>{pillar.key}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity onPress={() => setEditingTask(task)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                            <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeTask(task.id)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {tasksUpcoming.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, letterSpacing: 0.5 }}>
                    UPCOMING
                  </Text>
                  {tasksUpcoming.map((task) => {
                    const pillar = LIFE_PILLARS.find(p => p.key === task.category);
                    return (
                      <View key={task.id} style={s.taskRow}>
                        <TouchableOpacity
                          onPress={() => { haptic(); toggleTask(task.id); }}
                          style={[s.taskCheck, {
                            borderColor: task.completed ? colors.primary : colors.border,
                            backgroundColor: task.completed ? colors.primary : "transparent",
                          }]}
                        >
                          {task.completed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => { haptic(); toggleTask(task.id); }} activeOpacity={0.7}>
                          <Text style={[s.taskName, { color: colors.foreground }]} numberOfLines={2}>{task.name}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                            <View style={[s.dueBadge, { backgroundColor: colors.muted }]}>
                              <Ionicons name="calendar-outline" size={9} color={colors.mutedForeground} />
                              <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
                                {formatDueLabel(task.dueDate)}
                              </Text>
                            </View>
                            {pillar && (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                <Text style={{ fontSize: 10 }}>{pillar.emoji}</Text>
                                <Text style={{ fontSize: 10, color: pillar.color, fontFamily: "Inter_500Medium" }}>{pillar.key}</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity onPress={() => setEditingTask(task)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                            <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeTask(task.id)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* 6. Today's Habits — horizontal cards */}
        <View style={[s.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🏃</Text>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Today's Habits</Text>
            </View>
            {totalHabits > 0 ? (
              <View style={[s.pill, { backgroundColor: colors.muted }]}>
                <Text style={[s.pillText, { color: colors.mutedForeground }]}>{todayDone} of {totalHabits} done</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => router.push("/(tabs)/habits")}>
                <Text style={[s.viewAll, { color: colors.primary }]}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {habits.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/habits")}
              style={[s.emptyHabitsBtn, { backgroundColor: colors.muted, borderRadius: 12 }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[s.emptyHabitsText, { color: colors.mutedForeground }]}>Add your first habit</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 4 }}
            >
              {habitsDueToday.map((habit) => {
                const hex    = HABIT_COLOR_MAP[habit.colorKey] ?? colors.primary;
                const isDone = habit.completedDates.includes(todayStr);
                const streak = getHabitStreak(habit.id);
                const pillar = getPillar(habit.category);
                return (
                  <TouchableOpacity
                    key={habit.id}
                    onPress={() => { haptic(); toggleHabit(habit.id); }}
                    activeOpacity={0.7}
                    style={[s.habitCard, {
                      backgroundColor: isDone ? hex + "14" : colors.muted,
                      borderColor: isDone ? hex + "55" : "transparent",
                    }]}
                  >
                    <View style={[s.habitCardCheck, {
                      borderColor: isDone ? hex : colors.border,
                      backgroundColor: isDone ? hex : "transparent",
                    }]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={16} color="#FFF" />
                        : <Text style={{ fontSize: 15 }}>{pillar?.emoji ?? habit.icon}</Text>
                      }
                    </View>
                    <Text style={[s.habitCardName, { color: colors.foreground }]} numberOfLines={2}>
                      {habit.name}
                    </Text>
                    <Text style={[s.habitCardStreak, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {streak > 0 ? `${streak} day streak` : "Start today"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/habits")}
                activeOpacity={0.7}
                style={[s.habitCardAdd, { borderColor: colors.border }]}
              >
                <Ionicons name="add" size={22} color={colors.primary} />
                <Text style={[s.habitCardAddText, { color: colors.primary }]}>View all</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* 7. Mood + Biggest Win — side by side */}
        <View style={s.bottomRow}>
          {/* Mood Check-in */}
          <View style={[s.card, s.bottomCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 14 }}>🙂</Text>
              <Text style={[s.cardTitleSm, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>Mood Check-in</Text>
            </View>
            {todayMood ? (
              <Text style={[s.moodCurrent, { color: colors.primary }]} numberOfLines={1}>
                {MOOD_OPTIONS.find(m => m.value === todayMood)?.label} {MOOD_OPTIONS.find(m => m.value === todayMood)?.emoji}
              </Text>
            ) : (
              <Text style={[s.moodCurrent, { color: colors.mutedForeground }]} numberOfLines={1}>How do you feel?</Text>
            )}
            <View style={s.moodRowCompact}>
              {MOOD_OPTIONS.map((m) => {
                const active = todayMood === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => handleMood(m.value)}
                    style={[s.moodDot, {
                      backgroundColor: active ? m.color + "26" : "transparent",
                      borderColor: active ? m.color : "transparent",
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 17 }}>{m.emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => { haptic(); router.push("/(tabs)/progress"); }}>
              <Text style={[s.linkSm, { color: colors.primary }]}>View mood history</Text>
            </TouchableOpacity>
          </View>

          {/* Biggest Win */}
          <View style={[s.card, s.bottomCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
                <Text style={{ fontSize: 14 }}>🏆</Text>
                <Text style={[s.cardTitleSm, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>Biggest Win</Text>
              </View>
              {biggestWin && !winEditing && (
                <TouchableOpacity onPress={() => { setWinDraft(biggestWin); setWinEditing(true); }}>
                  <Text style={[s.linkSm, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {winEditing ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={[s.winInput, {
                    backgroundColor: colors.muted, color: colors.foreground,
                    borderRadius: 12, borderColor: winDraft ? colors.primary : "transparent",
                  }]}
                  placeholder="Your biggest win today?"
                  placeholderTextColor={colors.mutedForeground}
                  value={winDraft}
                  onChangeText={setWinDraft}
                  multiline
                  autoFocus={!!biggestWin}
                  maxLength={200}
                  selectionColor={colors.primary}
                />
                <TouchableOpacity onPress={saveWin} style={[s.winSaveBtn, { backgroundColor: colors.primary, borderRadius: 12 }]}>
                  <Ionicons name="checkmark" size={15} color="#FFF" />
                  <Text style={s.winSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : biggestWin ? (
              <Text style={[s.winText, { color: colors.foreground }]} numberOfLines={5}>{biggestWin}</Text>
            ) : (
              <TouchableOpacity
                onPress={() => { setWinDraft(""); setWinEditing(true); }}
                style={[s.winEmptyBtn, { backgroundColor: colors.muted, borderRadius: 12 }]}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[s.winEmptyText, { color: colors.mutedForeground }]}>Log a win</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Modals */}
      <InspireModal visible={pushVisible} message={pushMsg} scaleAnim={pushAnim}
        onClose={closeInspire} onRefresh={refreshInspire}
        onBack={goBackInspire} canGoBack={pushHistory.length > 0}
        colors={colors}
        isSaved={savedQuotes.includes(pushMsg?.text ?? "")}
        onSave={() => {
          if (!pushMsg) return;
          if (savedQuotes.includes(pushMsg.text)) removeQuote(pushMsg.text);
          else saveQuote(pushMsg.text);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onUseQuote={() => {
          if (!pushMsg) return;
          setPinnedQuote(pushMsg.text, pushMsg.source ?? "");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          closeInspire();
        }}
      />
      <ScoreInfoModal visible={scoreInfo} onClose={() => setScoreInfo(false)} colors={colors} />
      <TaskSheet visible={taskSheetOpen} onClose={() => setTaskSheetOpen(false)} onSave={handleAddTask} />
      {editingTask && (
        <TaskSheet
          visible={!!editingTask}
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleEditTask}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },

  // Cards
  card: { padding: 18, gap: 14 },
  journalCard: { borderLeftWidth: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  viewAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardTitleSm: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  greeting: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 3 },
  headerIcons: { flexDirection: "row", gap: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", borderWidth: StyleSheet.hairlineWidth },
  badge: { position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#E8576B", justifyContent: "center", alignItems: "center", paddingHorizontal: 3, borderWidth: 1.5 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFF" },

  // Inspiration hero
  inspirationCard: { padding: 20, overflow: "hidden" },
  inspirationLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  inspirationQuote: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 28 },
  inspirationAuthor: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 8 },
  inspirationBtnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  saveQuoteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)" },
  saveQuoteText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inspireMeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  inspireMeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },

  // Momentum (white)
  momentumTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  momentumBig: { fontSize: 52, fontFamily: "Inter_700Bold", lineHeight: 58 },
  momentumOf2: { fontSize: 13, fontFamily: "Inter_400Regular" },
  ringPct: { fontSize: 22, fontFamily: "Inter_700Bold" },
  ringLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  statRow: { flexDirection: "row", gap: 10 },
  statCell: { flex: 1, gap: 4 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statTrack: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 2 },
  statFill: { height: "100%", borderRadius: 3 },
  calcLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  calcLinkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Priorities
  priorityRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  priorityCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: "center", alignItems: "center", marginTop: 2 },
  priorityNum: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 2 },
  priorityText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  addPriorityRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderWidth: 1.5 },
  addPriorityNum: { fontSize: 12, fontFamily: "Inter_700Bold" },
  addPriorityInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  addConfirm: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  maxHint: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10 },
  maxHintText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Tasks
  addTaskBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  emptyTasks: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  taskCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center", marginTop: 2 },
  taskName: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  dueBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },

  // Habits (horizontal cards)
  emptyHabitsBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  emptyHabitsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  habitCard: { width: 104, padding: 12, borderRadius: 16, borderWidth: 1.5, gap: 8 },
  habitCardCheck: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  habitCardName: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  habitCardStreak: { fontSize: 11, fontFamily: "Inter_400Regular" },
  habitCardAdd: { width: 104, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 4 },
  habitCardAddText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Bottom row (mood + win)
  bottomRow: { flexDirection: "row", gap: 12, alignItems: "stretch" },
  bottomCard: { flex: 1, gap: 9, padding: 14 },
  moodCurrent: { fontSize: 13, fontFamily: "Inter_700Bold" },
  moodRowCompact: { flexDirection: "row", justifyContent: "space-between", gap: 3 },
  moodDot: { flex: 1, aspectRatio: 1, borderRadius: 999, justifyContent: "center", alignItems: "center", borderWidth: 1.5, overflow: "hidden" },
  linkSm: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Biggest Win
  winInput: { fontSize: 13, fontFamily: "Inter_400Regular", padding: 10, minHeight: 70, textAlignVertical: "top", borderWidth: 1.5 },
  winSaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  winSaveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  winText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, fontStyle: "italic" },
  winEmptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12 },
  winEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Score info modal
  infoCard: { padding: 24, width: "100%", maxWidth: 360 },

  // Task / Habit Sheet
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%" },
  handleWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 6 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 10 },
  nameInput: { fontSize: 16, fontFamily: "Inter_400Regular", padding: 14, borderWidth: 1.5 },
  dateChip: { width: 52, alignItems: "center", paddingVertical: 9, gap: 2, borderWidth: 1 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flexDirection: "row", padding: 15, alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Inspire modal
  inspireCardWrapper: { width: "100%", maxWidth: 380 },
  inspireCard: { padding: 28 },
  inspireClose: { alignSelf: "flex-end", marginBottom: 8 },
  inspireCloseBg: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 16 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bigQuote: { fontSize: 72, fontFamily: "Inter_700Bold", lineHeight: 64, marginBottom: 8 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  inspireText: { fontSize: 17, lineHeight: 26, marginBottom: 20 },
  attribution: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 20 },
  attribLine: { width: 3, borderRadius: 2, height: "100%" as any, minHeight: 30 },
  attribName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  attribRole: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  refreshText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
