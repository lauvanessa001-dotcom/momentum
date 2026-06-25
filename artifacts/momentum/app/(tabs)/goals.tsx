import React, { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle, G } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { GrowthJourneyType, useApp } from "@/contexts/AppContext";

// ─── Constants ─────────────────────────────────────────────────────────────────

const JOURNEY_TYPES: GrowthJourneyType[] = ["21-days", "6-months", "1-year"];

const JOURNEY_META: Record<GrowthJourneyType, { icon: string; label: string; subtitle: string; totalDays: number; color: string }> = {
  "21-days":  { icon: "🌱", label: "21 Days",  subtitle: "Build Momentum",   totalDays: 21,  color: "#6DBFA0" },
  "6-months": { icon: "🌿", label: "6 Months", subtitle: "Build Discipline", totalDays: 182, color: "#6B9EEB" },
  "1-year":   { icon: "🌳", label: "1 Year",   subtitle: "Build Lifestyle",  totalDays: 365, color: "#E8956D" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysElapsed(startDate: string): number {
  const start = new Date(startDate + "T00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function fmtDateMedium(dateStr: string): string {
  return new Date(dateStr + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── JourneyRing ──────────────────────────────────────────────────────────────

function JourneyRing({ progress, size, color }: { progress: number; size: number; color: string }) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(progress, 1);
  return (
    <Svg width={size} height={size}>
      <G transform={`rotate(-90, ${cx}, ${cy})`}>
        <Circle cx={cx} cy={cy} r={r} stroke={color + "22"} strokeWidth={6} fill="none" />
        <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={6} fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const botPad = isWeb ? 34 : insets.bottom;

  const {
    goalPeriods, startGoalPeriod, addGoalItem, removeGoalItem,
    updateGoalItemDays, setGoalWhy, saveGoalReflection,
  } = useApp();

  const [activeGoal, setActiveGoal]         = useState<GrowthJourneyType | null>(null);
  const [goalDetailTab, setGoalDetailTab]   = useState<"goals" | "progress" | "reflection">("goals");
  const [showAddGoalItem, setShowAddGoalItem]   = useState(false);
  const [addGoalItemDraft, setAddGoalItemDraft] = useState("");
  const [showStartGoalFor, setShowStartGoalFor] = useState<GrowthJourneyType | null>(null);
  const [editingWhyGoal, setEditingWhyGoal] = useState(false);
  const [whyGoalDraft, setWhyGoalDraft]     = useState("");
  const [reflDraft, setReflDraft]           = useState({ proudOf: "", surprised: "", nextStep: "" });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100, paddingHorizontal: 20, gap: 14 }}
      >
        {/* ── Header ── */}
        {!activeGoal && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: colors.foreground }}>Goals</Text>
              <Text style={{ fontSize: 22 }}>🎯</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
              Choose a timeframe. Set your intentions. Show up every day.
            </Text>
          </View>
        )}

        {/* ── Overview or Detail ── */}
        {!activeGoal ? (
          <>
            {JOURNEY_TYPES.map((type) => {
              const meta = JOURNEY_META[type];
              const period = goalPeriods[type];
              const elapsed = period ? daysElapsed(period.startDate) : 0;
              const progress = period ? Math.min(elapsed / meta.totalDays, 1) : 0;
              const currentDay = period ? Math.min(elapsed + 1, meta.totalDays) : 0;
              const activeItems = period ? period.items.length : 0;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    if (period) { setActiveGoal(type); setGoalDetailTab("goals"); }
                    else { setShowStartGoalFor(type); }
                  }}
                  activeOpacity={0.85}
                >
                  <View style={{ backgroundColor: colors.card, borderRadius: 18, overflow: "hidden" }}>
                    <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: meta.color }} />
                    <View style={{ padding: 18, paddingLeft: 22 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
                            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground }}>{meta.label}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{meta.subtitle}</Text>
                          {period ? (
                            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: meta.color, marginTop: 4 }}>Day {currentDay} of {meta.totalDays}</Text>
                          ) : (
                            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 }}>Not started yet — tap to begin</Text>
                          )}
                        </View>
                        <JourneyRing progress={progress} size={72} color={meta.color} />
                      </View>
                      <View style={{ height: 4, backgroundColor: meta.color + "20", borderRadius: 2, marginTop: 12, marginBottom: 14 }}>
                        <View style={{ height: 4, backgroundColor: meta.color, borderRadius: 2, width: `${Math.round(progress * 100)}%` as any }} />
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Ionicons name="flag-outline" size={13} color={meta.color} />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Goals  </Text>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                            {period ? (activeItems > 0 ? `${activeItems} active` : "None set") : "Not set"}
                          </Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Ionicons name="lock-closed-outline" size={13} color={colors.mutedForeground} />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Reflection  </Text>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                            {period?.reflection ? "Complete" : "Locked"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          (() => {
            const meta = JOURNEY_META[activeGoal];
            const period = goalPeriods[activeGoal];
            if (!period) return null;
            const elapsed = daysElapsed(period.startDate);
            const progress = Math.min(elapsed / meta.totalDays, 1);
            const currentDay = Math.min(elapsed + 1, meta.totalDays);
            const isComplete = elapsed >= meta.totalDays;
            const endDateStr = fmtDateMedium(addDaysToDate(period.startDate, meta.totalDays));
            return (
              <View style={{ gap: 12 }}>
                {/* Back + title */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity onPress={() => setActiveGoal(null)} style={{ marginRight: 8, padding: 4 }}>
                    <Ionicons name="chevron-back" size={22} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" }}>
                    {meta.label} Goal
                  </Text>
                  <View style={{ width: 30 }} />
                </View>

                {/* Header card */}
                <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: meta.color + "18", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 28 }}>{meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>{meta.subtitle}</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: meta.color, marginTop: 2 }}>Day {currentDay} of {meta.totalDays}</Text>
                    <View style={{ height: 4, backgroundColor: meta.color + "20", borderRadius: 2, marginTop: 10 }}>
                      <View style={{ height: 4, backgroundColor: meta.color, borderRadius: 2, width: `${Math.round(progress * 100)}%` as any }} />
                    </View>
                  </View>
                  <JourneyRing progress={progress} size={68} color={meta.color} />
                </View>

                {/* 2 mini-cards */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="flag-outline" size={15} color={meta.color} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.foreground }}>Goals</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: meta.color }}>{period.items.length} active</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="lock-closed-outline" size={15} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.foreground }}>Reflection</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: period.reflection ? "#6DBFA0" : colors.mutedForeground }}>
                      {period.reflection ? "Complete" : "Locked"}
                    </Text>
                  </View>
                </View>

                {/* 3-tab selector */}
                <View style={{ flexDirection: "row", backgroundColor: colors.muted, borderRadius: 12, padding: 3 }}>
                  {(["goals", "progress", "reflection"] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setGoalDetailTab(tab)}
                      style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9, backgroundColor: goalDetailTab === tab ? colors.card : "transparent" }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12, fontFamily: goalDetailTab === tab ? "Inter_700Bold" : "Inter_400Regular", color: goalDetailTab === tab ? colors.foreground : colors.mutedForeground, textTransform: "capitalize" }}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Goals tab ── */}
                {goalDetailTab === "goals" && (
                  <View style={{ gap: 10 }}>
                    {period.items.length === 0 ? (
                      <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 24, alignItems: "center", gap: 10 }}>
                        <Text style={{ fontSize: 32 }}>🎯</Text>
                        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>No goals set yet</Text>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" }}>
                          Add 2–5 specific goals to focus on for this period.
                        </Text>
                      </View>
                    ) : (
                      period.items.map((item) => (
                        <View key={item.id} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: meta.color + "18", alignItems: "center", justifyContent: "center" }}>
                            <Ionicons
                              name={item.daysCompleted > 0 ? "checkmark-circle" : "ellipse-outline"}
                              size={20} color={item.daysCompleted > 0 ? meta.color : colors.mutedForeground}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground }}>{item.text}</Text>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                              {item.daysCompleted} / {meta.totalDays} days
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => updateGoalItemDays(activeGoal, item.id, item.daysCompleted - 1)}
                              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}
                            >
                              <Ionicons name="remove" size={14} color={colors.foreground} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => updateGoalItemDays(activeGoal, item.id, item.daysCompleted + 1)}
                              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: meta.color + "20", alignItems: "center", justifyContent: "center" }}
                            >
                              <Ionicons name="add" size={14} color={meta.color} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onLongPress={() => Alert.alert("Remove goal?", item.text, [
                                { text: "Cancel", style: "cancel" },
                                { text: "Remove", style: "destructive", onPress: () => removeGoalItem(activeGoal, item.id) },
                              ])}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Add goal button */}
                    <TouchableOpacity
                      onPress={() => { setAddGoalItemDraft(""); setShowAddGoalItem(true); }}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: meta.color + "60", backgroundColor: meta.color + "05" }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={meta.color} />
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: meta.color }}>Add Goal</Text>
                    </TouchableOpacity>

                    {/* About section */}
                    <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18, gap: 14 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8 }}>ABOUT THIS GOAL</Text>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                        <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                        <View>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Started</Text>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground }}>{fmtDateMedium(period.startDate)}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                        <Ionicons name="time-outline" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                        <View>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Ends</Text>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground }}>{endDateStr}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                        <Ionicons name="help-circle-outline" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Why this goal?</Text>
                          {editingWhyGoal ? (
                            <TextInput
                              style={{ backgroundColor: colors.muted, color: colors.foreground, borderColor: meta.color, borderWidth: 1.5, borderRadius: 10, marginTop: 6, minHeight: 70, fontSize: 13, fontFamily: "Inter_400Regular", padding: 12, textAlignVertical: "top" }}
                              value={whyGoalDraft}
                              onChangeText={setWhyGoalDraft}
                              onBlur={() => { setEditingWhyGoal(false); if (activeGoal) setGoalWhy(activeGoal, whyGoalDraft.trim()); }}
                              multiline autoFocus
                              placeholder="What's your motivation?"
                              placeholderTextColor={colors.mutedForeground}
                            />
                          ) : (
                            <TouchableOpacity onPress={() => { setWhyGoalDraft(period.whyGoal); setEditingWhyGoal(true); }}>
                              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: period.whyGoal ? colors.foreground : colors.mutedForeground, marginTop: 4, lineHeight: 20, fontStyle: period.whyGoal ? "normal" : "italic" }}>
                                {period.whyGoal || "Tap to add your reason…"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {!isComplete && (
                        <View style={{ backgroundColor: colors.muted, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Reflection Locked</Text>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>
                              Complete all {meta.totalDays} days to unlock.
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ── Progress tab ── */}
                {goalDetailTab === "progress" && (
                  <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 22, gap: 18 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8 }}>PROGRESS</Text>
                    <View style={{ alignItems: "center", gap: 10 }}>
                      <JourneyRing progress={progress} size={130} color={meta.color} />
                      <Text style={{ fontSize: 32, fontFamily: "Inter_700Bold", color: meta.color }}>{Math.round(progress * 100)}%</Text>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Day {currentDay} of {meta.totalDays}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      {[
                        { label: "Days elapsed",   value: String(elapsed) },
                        { label: "Days remaining", value: String(Math.max(0, meta.totalDays - elapsed)) },
                        { label: "Goals tracked",  value: String(period.items.length) },
                      ].map(({ label, value }) => (
                        <View key={label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Reflection tab ── */}
                {goalDetailTab === "reflection" && (
                  isComplete ? (
                    period.reflection ? (
                      <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 22, gap: 16 }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8 }}>YOUR REFLECTION</Text>
                        {[
                          { q: "What are you most proud of?", a: period.reflection.proudOf },
                          { q: "What surprised you the most?", a: period.reflection.surprised },
                          { q: "What's next for you?", a: period.reflection.nextStep },
                        ].map(({ q, a }, i) => (
                          <View key={i} style={{ gap: 4 }}>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>{q}</Text>
                            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 21 }}>{a}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={{ gap: 12 }}>
                        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground }}>Reflect on your journey</Text>
                        {([
                          { key: "proudOf"   as const, q: "What are you most proud of?",    placeholder: "Share your biggest win…" },
                          { key: "surprised" as const, q: "What surprised you the most?",    placeholder: "What caught you off guard?" },
                          { key: "nextStep"  as const, q: "What's next for you?",            placeholder: "Your next chapter…" },
                        ]).map(({ key, q, placeholder }) => (
                          <View key={key} style={{ gap: 6 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{q}</Text>
                            <TextInput
                              style={{ backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border ? colors.border : "#E5E5E5", borderWidth: 1.5, borderRadius: 14, minHeight: 80, textAlignVertical: "top", fontSize: 13, fontFamily: "Inter_400Regular", padding: 14 }}
                              value={reflDraft[key]}
                              onChangeText={(v) => setReflDraft((prev) => ({ ...prev, [key]: v }))}
                              placeholder={placeholder}
                              placeholderTextColor={colors.mutedForeground}
                              multiline
                            />
                          </View>
                        ))}
                        <TouchableOpacity
                          onPress={() => {
                            if (!reflDraft.proudOf.trim() || !reflDraft.surprised.trim() || !reflDraft.nextStep.trim()) {
                              Alert.alert("Please answer all three questions first.");
                              return;
                            }
                            saveGoalReflection(activeGoal, reflDraft.proudOf.trim(), reflDraft.surprised.trim(), reflDraft.nextStep.trim());
                            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }}
                          style={{ padding: 16, backgroundColor: meta.color, borderRadius: 14, alignItems: "center" }}
                          activeOpacity={0.85}
                        >
                          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>Save Reflection</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  ) : (
                    <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 36, alignItems: "center", gap: 14 }}>
                      <Ionicons name="lock-closed" size={36} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>Reflection Locked</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 20 }}>
                        Complete all {meta.totalDays} days to unlock your reflection.
                      </Text>
                    </View>
                  )
                )}
              </View>
            );
          })()
        )}
      </ScrollView>

      {/* ── Start Goal Confirmation ── */}
      <Modal
        visible={!!showStartGoalFor}
        transparent animationType="slide"
        onRequestClose={() => setShowStartGoalFor(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} activeOpacity={1} onPress={() => setShowStartGoalFor(null)} />
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24, gap: 16 }}>
            {showStartGoalFor && (() => {
              const meta = JOURNEY_META[showStartGoalFor];
              return (
                <>
                  <View style={{ alignItems: "center", gap: 10 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border ?? "#E5E5E5" }} />
                    <Text style={{ fontSize: 30 }}>{meta.icon}</Text>
                    <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground }}>{meta.label} Goal</Text>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 21 }}>
                      Start a {meta.totalDays}-day journey to {meta.subtitle.toLowerCase()}. Track your goals and unlock a reflection when complete.
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setShowStartGoalFor(null)}
                      style={{ flex: 1, padding: 14, alignItems: "center", backgroundColor: colors.muted, borderRadius: 14 }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        startGoalPeriod(showStartGoalFor);
                        setActiveGoal(showStartGoalFor);
                        setGoalDetailTab("goals");
                        setShowStartGoalFor(null);
                        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }}
                      style={{ flex: 1.6, padding: 14, alignItems: "center", backgroundColor: meta.color, borderRadius: 14 }}
                      activeOpacity={0.85}
                    >
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>Start Journey</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Goal Item ── */}
      <Modal
        visible={showAddGoalItem}
        transparent animationType="slide"
        onRequestClose={() => setShowAddGoalItem(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} activeOpacity={1} onPress={() => setShowAddGoalItem(false)} />
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24, gap: 16 }}>
            {activeGoal && (() => {
              const meta = JOURNEY_META[activeGoal];
              return (
                <>
                  <View style={{ alignItems: "center", gap: 6 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border ?? "#E5E5E5" }} />
                    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 8 }}>Add Goal</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>What do you want to achieve?</Text>
                  </View>
                  <TextInput
                    style={{ backgroundColor: colors.card, color: colors.foreground, borderColor: addGoalItemDraft.trim() ? meta.color : (colors.border ?? "#E5E5E5"), borderWidth: 1.5, borderRadius: 16, minHeight: 90, textAlignVertical: "top", fontSize: 14, fontFamily: "Inter_400Regular", padding: 14 }}
                    placeholder="e.g. Read for 20 minutes every day"
                    placeholderTextColor={colors.mutedForeground}
                    value={addGoalItemDraft}
                    onChangeText={setAddGoalItemDraft}
                    multiline selectionColor={meta.color} autoFocus
                  />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setShowAddGoalItem(false)}
                      style={{ flex: 1, padding: 14, alignItems: "center", backgroundColor: colors.muted, borderRadius: 14 }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (!addGoalItemDraft.trim()) return;
                        addGoalItem(activeGoal, addGoalItemDraft.trim());
                        setShowAddGoalItem(false);
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={{ flex: 1.6, padding: 14, alignItems: "center", backgroundColor: addGoalItemDraft.trim() ? meta.color : colors.muted, borderRadius: 14 }}
                      activeOpacity={0.85}
                    >
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: addGoalItemDraft.trim() ? "#FFF" : colors.mutedForeground }}>
                        Add Goal
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
