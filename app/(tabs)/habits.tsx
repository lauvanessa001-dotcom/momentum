import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Alert,
  Keyboard,
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
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  Habit, HabitFrequency, LifePillar, LIFE_PILLARS,
  isHabitScheduledForDate, getPillar, useApp,
} from "@/contexts/AppContext";
import { ProgressCircle } from "@/components/ProgressCircle";

// ─── Constants ────────────────────────────────────────────────────────────────

const HABIT_COLORS = [
  { key: "habitBlue",     hex: "#6B9EEB" },
  { key: "habitMint",     hex: "#6DBFA0" },
  { key: "habitRose",     hex: "#E89494" },
  { key: "habitLavender", hex: "#A094E8" },
  { key: "habitPeach",    hex: "#E8AE80" },
  { key: "habitYellow",   hex: "#E8CE80" },
];

const FREQUENCIES: { key: HabitFrequency; label: string; sub: string }[] = [
  { key: "daily",    label: "Daily",    sub: "Every day" },
  { key: "weekdays", label: "Weekdays", sub: "Mon – Fri" },
  { key: "weekly",   label: "Weekly",   sub: "One day/wk" },
  { key: "monthly",  label: "Monthly",  sub: "One day/mo" },
];

const DOW_SHORT  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_FULL   = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getFreqLabel(habit: Habit): string {
  if (habit.frequency === "daily")    return "Daily";
  if (habit.frequency === "weekdays") return "Weekdays";
  if (habit.frequency === "weekly")   return `Weekly`;
  if (habit.frequency === "monthly")  return `Monthly`;
  return habit.frequency;
}

function getHabitHex(colorKey: string): string {
  return HABIT_COLORS.find((c) => c.key === colorKey)?.hex ?? "#6B9EEB";
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Add / Edit Sheet ─────────────────────────────────────────────────────────

interface HabitSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, colorKey: string, icon: string, frequency: HabitFrequency, category: string, frequencyDay?: number) => void;
  initialHabit?: Habit;
}

function HabitSheet({ visible, onClose, onSave, initialHabit }: HabitSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb  = Platform.OS === "web";
  const isEdit = !!initialHabit;
  const bottomPad = isWeb ? 24 : insets.bottom + 8;

  const [name, setName]               = useState(initialHabit?.name ?? "");
  const [selectedColor, setColor]     = useState(initialHabit?.colorKey ?? HABIT_COLORS[0].key);
  const [selectedFreq, setFreq]       = useState<HabitFrequency>(initialHabit?.frequency ?? "daily");
  const [selectedCat, setCat]         = useState(initialHabit?.category ?? "");
  const [selectedFreqDay, setFreqDay] = useState<number>(
    initialHabit?.frequencyDay ?? new Date().getDay()
  );
  const inputRef = useRef<TextInput>(null);

  const translateY      = useSharedValue(700);
  const backdropOpacity = useSharedValue(0);
  const shakeX          = useSharedValue(0);

  const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const shakeStyle    = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useEffect(() => {
    if (visible) {
      if (initialHabit) {
        setName(initialHabit.name);
        setColor(initialHabit.colorKey);
        setFreq(initialHabit.frequency);
        setCat(initialHabit.category ?? "");
        setFreqDay(
          initialHabit.frequencyDay ??
          (initialHabit.frequency === "monthly" ? new Date().getDate() : new Date().getDay())
        );
      } else {
        setName(""); setColor(HABIT_COLORS[0].key); setFreq("daily");
        setCat(""); setFreqDay(new Date().getDay());
      }
      translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 280 });
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [visible, initialHabit]);

  const close = () => {
    Keyboard.dismiss();
    translateY.value = withSpring(700, { damping: 28, stiffness: 320 });
    backdropOpacity.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      shakeX.value = withSequence(
        withTiming(-12, { duration: 55 }), withTiming(12, { duration: 55 }),
        withTiming(-10, { duration: 55 }), withTiming(10, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      inputRef.current?.focus();
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const freqDay = (selectedFreq === "weekly" || selectedFreq === "monthly")
      ? selectedFreqDay : undefined;
    onSave(name.trim(), selectedColor, "star-outline", selectedFreq, selectedCat, freqDay);
    close();
  };

  const handleFreqSelect = (key: HabitFrequency) => {
    setFreq(key);
    if (key === "weekly")  setFreqDay(new Date().getDay());
    if (key === "monthly") setFreqDay(new Date().getDate());
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const selectedHex = getHabitHex(selectedColor);
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
            <TouchableWithoutFeedback onPress={close}>
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View style={[s.sheet, { backgroundColor: colors.background, paddingBottom: bottomPad }, sheetStyle]}>
            <View style={s.handleWrap}>
              <View style={[s.handle, { backgroundColor: colors.border }]} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 22, paddingHorizontal: 24, paddingBottom: 12 }}
            >
              <Text style={[s.sheetTitle, { color: colors.foreground }]}>
                {isEdit ? "Edit Habit" : "New Habit"}
              </Text>

              {/* Name */}
              <Animated.View style={shakeStyle}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>HABIT NAME</Text>
                <TextInput
                  ref={inputRef}
                  style={[s.nameInput, {
                    backgroundColor: colors.card, color: colors.foreground,
                    borderColor: name.trim() ? selectedHex : colors.border, borderRadius: 16,
                  }]}
                  placeholder="Enter a habit..."
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  maxLength={48}
                  selectionColor={selectedHex}
                />
              </Animated.View>

              {/* Life Pillar */}
              <View>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>LIFE PILLAR</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {LIFE_PILLARS.map((p) => {
                    const active = selectedCat === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => {
                          setCat(active ? "" : p.key);
                          if (Platform.OS !== "web") Haptics.selectionAsync();
                        }}
                        style={[s.catChip, {
                          backgroundColor: active ? p.color + "22" : colors.card,
                          borderColor: active ? p.color : colors.border,
                          borderRadius: 12,
                        }]}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: active ? p.color : colors.foreground }}>
                          {p.key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Color */}
              <View>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>COLOR</Text>
                <View style={s.colorRow}>
                  {HABIT_COLORS.map((c) => {
                    const active = selectedColor === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => { setColor(c.key); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                        style={[s.colorDot, {
                          backgroundColor: c.hex,
                          transform: [{ scale: active ? 1.18 : 1 }],
                          shadowColor: active ? c.hex : "transparent",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: active ? 0.5 : 0,
                          shadowRadius: 8,
                        }]}
                      >
                        {active && <Ionicons name="checkmark" size={18} color="#FFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Frequency — 2×2 grid */}
              <View>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>FREQUENCY</Text>
                <View style={s.freqGrid}>
                  {FREQUENCIES.map((f) => {
                    const active = selectedFreq === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        onPress={() => handleFreqSelect(f.key)}
                        style={[s.freqChip, {
                          backgroundColor: active ? selectedHex : colors.card,
                          borderColor: active ? selectedHex : colors.border,
                          borderRadius: 14,
                        }]}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.freqLabel, { color: active ? "#FFF" : colors.foreground }]}>{f.label}</Text>
                        <Text style={[s.freqSub, { color: active ? "rgba(255,255,255,0.78)" : colors.mutedForeground }]}>{f.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day-of-week picker (Weekly) */}
                {selectedFreq === "weekly" && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>DAY OF WEEK</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                        {DOW_SHORT.map((label, i) => {
                          const active = selectedFreqDay === i;
                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => { setFreqDay(i); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                              style={[s.dayChip, {
                                backgroundColor: active ? selectedHex : colors.card,
                                borderColor: active ? selectedHex : colors.border,
                              }]}
                              activeOpacity={0.75}
                            >
                              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFF" : colors.foreground }}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Day-of-month picker (Monthly) */}
                {selectedFreq === "monthly" && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>DAY OF MONTH</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4, flexWrap: "nowrap" }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                          const active = selectedFreqDay === day;
                          return (
                            <TouchableOpacity
                              key={day}
                              onPress={() => { setFreqDay(day); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                              style={[s.dayNumChip, {
                                backgroundColor: active ? selectedHex : colors.card,
                                borderColor: active ? selectedHex : colors.border,
                              }]}
                              activeOpacity={0.75}
                            >
                              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFF" : colors.foreground }}>
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                    {selectedFreqDay > 28 && (
                      <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 6 }}>
                        * Shorter months will use the last available day.
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Buttons */}
              <View style={s.btnRow}>
                <TouchableOpacity
                  onPress={close}
                  style={[s.cancelBtn, { backgroundColor: colors.muted, borderRadius: 16 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.cancelText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[s.saveBtn, {
                    backgroundColor: name.trim() ? selectedHex : colors.muted,
                    borderRadius: 16, flex: 1.6,
                  }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={20} color={name.trim() ? "#FFF" : colors.mutedForeground} />
                  <Text style={[s.saveText, { color: name.trim() ? "#FFF" : colors.mutedForeground }]}>
                    {isEdit ? "Save Changes" : "Save Habit"}
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

// ─── Favorites Edit Sheet ─────────────────────────────────────────────────────

interface FavEditSheetProps {
  visible: boolean;
  habits: Habit[];
  selected: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
  getStreak: (id: string) => number;
}

function FavEditSheet({ visible, habits, selected, onClose, onSave, getStreak }: FavEditSheetProps) {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const isWeb    = Platform.OS === "web";
  const [picked, setPicked] = useState<string[]>(selected);

  const translateY      = useSharedValue(700);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setPicked(selected);
      translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 280 });
    }
  }, [visible, selected]);

  const close = () => {
    translateY.value = withSpring(700, { damping: 28, stiffness: 320 });
    backdropOpacity.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };

  const toggle = (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!visible) return null;
  const bottomPad = isWeb ? 24 : insets.bottom + 8;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <TouchableWithoutFeedback onPress={close}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View style={[s.sheet, { backgroundColor: colors.background, paddingBottom: bottomPad }, sheetStyle]}>
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 12, gap: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[s.sheetTitle, { color: colors.foreground }]}>Edit Favorites</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                {picked.length}/3 selected
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={{ gap: 8 }}>
                {habits.map((h) => {
                  const pillar  = getPillar(h.category);
                  const active  = picked.includes(h.id);
                  const streak  = getStreak(h.id);
                  const disabled = !active && picked.length >= 3;
                  return (
                    <TouchableOpacity
                      key={h.id}
                      onPress={() => toggle(h.id)}
                      activeOpacity={0.7}
                      style={[s.favEditRow, {
                        backgroundColor: active ? pillar.color + "18" : colors.card,
                        borderColor: active ? pillar.color : colors.border,
                        opacity: disabled ? 0.4 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 20 }}>{pillar.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }} numberOfLines={1}>
                          {h.name}
                        </Text>
                        {streak > 0 && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                            🔥 {streak} day streak
                          </Text>
                        )}
                      </View>
                      <View style={[s.favCheck, {
                        backgroundColor: active ? pillar.color : "transparent",
                        borderColor: active ? pillar.color : colors.border,
                      }]}>
                        {active && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={s.btnRow}>
              <TouchableOpacity
                onPress={close}
                style={[s.cancelBtn, { backgroundColor: colors.muted, borderRadius: 16 }]}
                activeOpacity={0.7}
              >
                <Text style={[s.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onSave(picked); close(); }}
                style={[s.saveBtn, { backgroundColor: colors.primary, borderRadius: 16, flex: 1.4 }]}
                activeOpacity={0.85}
              >
                <Text style={[s.saveText, { color: "#FFF" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Habit Row (inside expanded category) ─────────────────────────────────────

interface HabitRowItemProps {
  habit: Habit;
  pillar: LifePillar;
  doneToday: boolean;
  streak: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isLast: boolean;
}

function HabitRowItem({ habit, pillar, doneToday, streak, onToggle, onEdit, onDelete, isLast }: HabitRowItemProps) {
  const colors = useColors();
  const router = useRouter();

  const checkScale = useSharedValue(doneToday ? 1 : 0);
  const checkRot   = useSharedValue(doneToday ? 0 : -15);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }, { rotate: `${checkRot.value}deg` }],
  }));

  const handleToggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!doneToday) {
      checkScale.value = withSpring(1, { damping: 9, stiffness: 200 });
      checkRot.value   = withSpring(0, { damping: 12, stiffness: 220 });
    } else {
      checkScale.value = withTiming(0, { duration: 150 });
      checkRot.value   = withTiming(-15, { duration: 150 });
    }
    runOnJS(onToggle)();
  };

  const handleDelete = () => {
    Alert.alert("Remove Habit", `Remove "${habit.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <View style={[
      s.habitRow,
      {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        borderBottomLeftRadius: isLast ? 18 : 0,
        borderBottomRightRadius: isLast ? 18 : 0,
        backgroundColor: doneToday ? pillar.color + "08" : "transparent",
      },
    ]}>
      {/* Completion circle */}
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
        <View style={[s.checkCircle, {
          borderColor: doneToday ? pillar.color : colors.border,
          backgroundColor: doneToday ? pillar.color : "transparent",
        }]}>
          {doneToday ? (
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={17} color="#FFF" />
            </Animated.View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Name + meta */}
      <TouchableOpacity onPress={() => router.push(`/habit/${habit.id}`)} activeOpacity={0.65} style={{ flex: 1, gap: 2 }}>
        <Text style={[s.habitName, {
          color: doneToday ? colors.mutedForeground : colors.foreground,
          textDecorationLine: doneToday ? "line-through" : "none",
        }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {streak > 0 && (
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              🔥 {streak} day streak
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.border, fontFamily: "Inter_400Regular" }}>
            {getFreqLabel(habit)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
          <Ionicons name="pencil-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
          <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/habit/${habit.id}`)} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  pillar: LifePillar;
  allHabits: Habit[];
  today: string;
  todayDate: Date;
  expanded: boolean;
  onToggle: () => void;
  getStreak: (id: string) => number;
  onToggleHabit: (id: string) => void;
  onEditHabit: (h: Habit) => void;
  onDeleteHabit: (id: string) => void;
}

function CategorySection({
  pillar, allHabits, today, todayDate, expanded, onToggle,
  getStreak, onToggleHabit, onEditHabit, onDeleteHabit,
}: CategorySectionProps) {
  const colors = useColors();

  const todayHabits  = allHabits.filter((h) => isHabitScheduledForDate(h, todayDate));
  const doneCount    = todayHabits.filter((h) => h.completedDates.includes(today)).length;
  const totalCount   = todayHabits.length;
  const fillRatio    = totalCount > 0 ? doneCount / totalCount : 0;
  const allDone      = totalCount > 0 && doneCount === totalCount;

  return (
    <View style={[s.catCard, { backgroundColor: colors.card }]}>
      {/* Category header — tap to expand/collapse */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.75} style={s.catHeader}>
        <View style={[s.catIconBg, { backgroundColor: pillar.color + "22" }]}>
          <Text style={{ fontSize: 18 }}>{pillar.emoji}</Text>
        </View>

        <View style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[s.catName, { color: allDone ? pillar.color : colors.foreground }]}>{pillar.key}</Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: allDone ? pillar.color : colors.mutedForeground }}>
              {doneCount}/{totalCount}
            </Text>
          </View>
          {/* Progress bar */}
          <View style={[s.catProgressTrack, { backgroundColor: pillar.color + "22" }]}>
            <View style={[s.catProgressFill, {
              width: `${fillRatio * 100}%` as any,
              backgroundColor: allDone ? pillar.color : pillar.color + "BB",
            }]} />
          </View>
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {/* Expanded habit rows */}
      {expanded && allHabits.map((habit, idx) => {
        const doneToday = habit.completedDates.includes(today);
        const scheduled = isHabitScheduledForDate(habit, todayDate);
        if (!scheduled) {
          return (
            <View key={habit.id} style={[
              s.habitRow,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                opacity: 0.45,
                borderBottomLeftRadius: idx === allHabits.length - 1 ? 18 : 0,
                borderBottomRightRadius: idx === allHabits.length - 1 ? 18 : 0,
              },
            ]}>
              <View style={[s.checkCircle, { borderColor: colors.border, backgroundColor: "transparent" }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.habitName, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.border, fontFamily: "Inter_400Regular" }}>
                  {getFreqLabel(habit)} · not scheduled today
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TouchableOpacity onPress={() => onEditHabit(habit)} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
                  <Ionicons name="pencil-outline" size={15} color={colors.border} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }
        return (
          <HabitRowItem
            key={habit.id}
            habit={habit}
            pillar={pillar}
            doneToday={doneToday}
            streak={getStreak(habit.id)}
            onToggle={() => onToggleHabit(habit.id)}
            onEdit={() => onEditHabit(habit)}
            onDelete={() => onDeleteHabit(habit.id)}
            isLast={idx === allHabits.length - 1}
          />
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    habits, addHabit, editHabit, removeHabit, toggleHabit,
    getHabitStreak, getTodayCompletionCount,
    favoriteHabitIds, setFavoriteHabits,
    getBestStreak,
  } = useApp();
  const isWeb     = Platform.OS === "web";
  const topPad    = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [favEditOpen, setFavEditOpen]   = useState(false);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());

  const today     = getTodayString();
  const todayDate = useMemo(() => new Date(), []);

  const todayHabits = useMemo(
    () => habits.filter((h) => isHabitScheduledForDate(h, todayDate)),
    [habits, todayDate],
  );

  const todayDone      = getTodayCompletionCount();
  const completionRate = todayHabits.length > 0 ? todayDone / todayHabits.length : 0;
  const isAllDone      = todayHabits.length > 0 && todayDone === todayHabits.length;

  // Group ALL habits by pillar (only pillars that have at least 1 habit)
  const groupedByPillar = useMemo(() => {
    const map: Record<string, Habit[]> = {};
    for (const h of habits) {
      const key = (h.category && h.category.trim() !== "") ? h.category : "Other";
      if (!map[key]) map[key] = [];
      map[key].push(h);
    }
    const result: Array<{ pillar: LifePillar; habits: Habit[] }> = [];
    for (const pillar of LIFE_PILLARS) {
      if (map[pillar.key]) result.push({ pillar, habits: map[pillar.key] });
    }
    return result;
  }, [habits]);

  // Favorites: if user has set them, use those; else derive top-3 by streak
  const favoriteHabits = useMemo(() => {
    if (favoriteHabitIds.length > 0) {
      return favoriteHabitIds
        .map((id) => habits.find((h) => h.id === id))
        .filter(Boolean) as Habit[];
    }
    return [...habits]
      .sort((a, b) => getHabitStreak(b.id) - getHabitStreak(a.id))
      .slice(0, 3);
  }, [habits, favoriteHabitIds, getHabitStreak]);

  const bestStreak = getBestStreak();

  const togglePillar = useCallback((key: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }, []);

  const handleAdd = async (name: string, colorKey: string, icon: string, frequency: HabitFrequency, category: string, frequencyDay?: number) => {
    await addHabit(name, colorKey, icon, frequency, category, frequencyDay);
  };

  const handleEdit = async (name: string, colorKey: string, icon: string, frequency: HabitFrequency, category: string, frequencyDay?: number) => {
    if (!editingHabit) return;
    await editHabit(editingHabit.id, { name, colorKey, icon, frequency, frequencyDay, category });
    setEditingHabit(null);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 100, gap: 14 }}
      >
        {/* ── Header ── */}
        <View style={[s.headerRow, { paddingHorizontal: 20 }]}>
          <View>
            <Text style={[s.screenTitle, { color: colors.foreground }]}>My Habits</Text>
            {todayHabits.length > 0 && (
              <Text style={[s.screenSub, { color: colors.mutedForeground }]}>
                {todayDone} of {todayHabits.length} done today
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              setSheetOpen(true);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[s.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Today's Summary Card ── */}
        {habits.length > 0 && (
          <View style={[s.summaryCard, { backgroundColor: colors.card, marginHorizontal: 20 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {/* Ring */}
              <ProgressCircle
                progress={completionRate}
                size={76}
                strokeWidth={7}
                color={isAllDone ? "#7C6CE7" : colors.primary}
                trackColor={colors.muted}
              >
                <Text style={{
                  fontSize: 15, fontFamily: "Inter_700Bold",
                  color: isAllDone ? "#7C6CE7" : colors.primary,
                }}>
                  {Math.round(completionRate * 100)}%
                </Text>
              </ProgressCircle>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground }}>
                  {isAllDone ? "Amazing work! 🎉" : todayHabits.length === 0 ? "No habits today" : "Keep going!"}
                </Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3 }}>
                  {todayDone} of {todayHabits.length} habits completed today
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={{ fontSize: 20 }}>🔥</Text>
                <View>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground }}>
                    {bestStreak}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                    Day Streak
                  </Text>
                </View>
              </View>
              <View style={[s.statDivider, { backgroundColor: colors.border }]} />
              <View style={s.statItem}>
                <Text style={{ fontSize: 20 }}>⭐</Text>
                <View>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground }}>
                    +{todayDone}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                    Momentum Points
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Favorites Section ── */}
        {habits.length > 0 && (
          <View style={{ marginHorizontal: 20 }}>
            <View style={s.favHeader}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                ⭐ Favorites
              </Text>
              <TouchableOpacity
                onPress={() => setFavEditOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Edit</Text>
              </TouchableOpacity>
            </View>

            {favoriteHabits.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 10, paddingRight: 4 }}>
                  {favoriteHabits.map((habit) => {
                    const pillar = getPillar(habit.category);
                    const streak = getHabitStreak(habit.id);
                    return (
                      <TouchableOpacity
                        key={habit.id}
                        onPress={() => {}}
                        activeOpacity={0.8}
                        style={[s.favChip, { backgroundColor: colors.card }]}
                      >
                        <View style={[s.favChipIcon, { backgroundColor: pillar.color + "22" }]}>
                          <Text style={{ fontSize: 22 }}>{pillar.emoji}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }} numberOfLines={1}>
                          {habit.name}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                          {streak > 0 ? `${streak} day streak` : "Start today"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                Add habits to see favorites here.
              </Text>
            )}
          </View>
        )}

        {/* ── Empty state ── */}
        {habits.length === 0 && (
          <View style={[s.emptyCard, { backgroundColor: colors.card, borderRadius: 18, marginHorizontal: 20 }]}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🌱</Text>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 }}>
              Start building habits
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 20, fontFamily: "Inter_400Regular" }}>
              Tap the + button above to add your first habit.
            </Text>
          </View>
        )}

        {/* ── Category sections ── */}
        {groupedByPillar.map(({ pillar, habits: groupHabits }) => (
          <CategorySection
            key={pillar.key}
            pillar={pillar}
            allHabits={groupHabits}
            today={today}
            todayDate={todayDate}
            expanded={expandedPillars.has(pillar.key)}
            onToggle={() => togglePillar(pillar.key)}
            getStreak={getHabitStreak}
            onToggleHabit={(id) => toggleHabit(id)}
            onEditHabit={(h) => setEditingHabit(h)}
            onDeleteHabit={(id) =>
              Alert.alert("Remove Habit", `Remove this habit?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => removeHabit(id) },
              ])
            }
          />
        ))}

        {/* ── Add Habit button ── */}
        {habits.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSheetOpen(true);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.8}
            style={[s.addHabitBtn, { backgroundColor: colors.card, marginHorizontal: 20 }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
              Add Habit
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Add Sheet ── */}
      <HabitSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleAdd}
      />

      {/* ── Edit Sheet ── */}
      {editingHabit && (
        <HabitSheet
          visible={!!editingHabit}
          initialHabit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSave={handleEdit}
        />
      )}

      {/* ── Favorites Edit Sheet ── */}
      <FavEditSheet
        visible={favEditOpen}
        habits={habits}
        selected={favoriteHabitIds.length > 0 ? favoriteHabitIds : favoriteHabits.map((h) => h.id)}
        onClose={() => setFavEditOpen(false)}
        onSave={(ids) => setFavoriteHabits(ids)}
        getStreak={getHabitStreak}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1 },
  headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  screenSub:   { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  summaryCard: { borderRadius: 20, padding: 18, gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statsRow:    { flexDirection: "row", alignItems: "center", paddingTop: 4 },
  statItem:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },

  favHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  favChip:     { alignItems: "center", gap: 6, padding: 12, borderRadius: 16, width: 90,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  favChipIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  catCard:     { borderRadius: 18, overflow: "hidden", marginHorizontal: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  catHeader:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  catIconBg:   { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catName:     { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catProgressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  catProgressFill:  { height: "100%", borderRadius: 3 },

  habitRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  checkCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  habitName:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  emptyCard:  { padding: 32, alignItems: "center" },
  addHabitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    padding: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },

  // Sheet
  sheet:      { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%" },
  handleWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 6 },
  handle:     { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 10 },
  nameInput:  { fontSize: 17, fontFamily: "Inter_400Regular", padding: 16, borderWidth: 1.5 },
  catChip:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  colorRow:   { flexDirection: "row", gap: 14, alignItems: "center" },
  colorDot:   { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  freqGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  freqChip:   { width: "48%", padding: 14, alignItems: "center", borderWidth: 1.5 },
  freqLabel:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  freqSub:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  dayChip:    { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  dayNumChip: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  btnRow:     { flexDirection: "row", gap: 12 },
  cancelBtn:  { flex: 1, padding: 16, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn:    { flexDirection: "row", padding: 16, alignItems: "center", justifyContent: "center", gap: 8 },
  saveText:   { fontSize: 15, fontFamily: "Inter_700Bold" },

  favEditRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  favCheck:   { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
