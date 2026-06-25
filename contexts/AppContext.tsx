import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { PushMessage, getRandomPush } from "@/constants/pushMessages";

const STORAGE_KEY = "@momentum/v1";

// ─── Quote Library ────────────────────────────────────────────────────────────

export interface DailyQuoteCard {
  text: string;
  source: string;
}

const DAILY_QUOTE_CARDS: DailyQuoteCard[] = [
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", source: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", source: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", source: "Confucius" },
  { text: "Well done is better than well said.", source: "Benjamin Franklin" },
  { text: "The only way to do great work is to love what you do.", source: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", source: "Albert Einstein" },
  { text: "It always seems impossible until it is done.", source: "Nelson Mandela" },
  { text: "Do what you can, with what you have, where you are.", source: "Theodore Roosevelt" },
  { text: "Whether you think you can or think you can't — you're right.", source: "Henry Ford" },
  { text: "Start where you are. Use what you have. Do what you can.", source: "Arthur Ashe" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", source: "Winston Churchill" },
  { text: "Be yourself; everyone else is already taken.", source: "Oscar Wilde" },
  { text: "Courage is resistance to fear, mastery of fear — not absence of fear.", source: "Mark Twain" },
  { text: "Act as if what you do makes a difference. It does.", source: "William James" },
  { text: "I have not failed. I have just found 10,000 ways that won't work.", source: "Thomas Edison" },
  { text: "You must do the things you think you cannot do.", source: "Eleanor Roosevelt" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", source: "Rumi" },
  { text: "The cave you fear to enter holds the treasure you seek.", source: "Joseph Campbell" },
  { text: "When we are no longer able to change a situation, we are challenged to change ourselves.", source: "Viktor Frankl" },
  { text: "Knowing is not enough; we must apply. Willing is not enough; we must do.", source: "Goethe" },
  { text: "Champions keep playing until they get it right.", source: "Billie Jean King" },
];

export const MOOD_ENCOURAGEMENTS: Record<number, string> = {
  5: "You are glowing today. Ride that wave.",
  4: "Good energy. Keep building on it.",
  3: "Okay days still move you forward. You showed up.",
  2: "Tough days are part of the journey. Be gentle with yourself.",
  1: "Rough moments pass. You are stronger than how you feel right now.",
};

// ─── Life Pillars ─────────────────────────────────────────────────────────────

export interface LifePillar {
  key: string;
  emoji: string;
  color: string;
}

export const LIFE_PILLARS: LifePillar[] = [
  { key: "Health",        emoji: "💪", color: "#E89494" },
  { key: "Mind",          emoji: "🧘", color: "#A094E8" },
  { key: "Learning",      emoji: "📚", color: "#6B9EEB" },
  { key: "Career",        emoji: "💼", color: "#E8CE80" },
  { key: "Relationships", emoji: "❤️", color: "#E87878" },
  { key: "Home",          emoji: "🏠", color: "#6DBFA0" },
  { key: "Finances",      emoji: "💰", color: "#E8AE80" },
  { key: "Creativity",    emoji: "🎨", color: "#C094E8" },
  { key: "Other",         emoji: "⭐", color: "#9AA0B0" },
];

export function getPillar(key: string): LifePillar {
  return LIFE_PILLARS.find((p) => p.key === key) ?? { key, emoji: "⭐", color: "#7C6CE7" };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type HabitFrequency = "daily" | "weekdays" | "weekly" | "monthly";
export type GrowthJourneyType = "21-days" | "6-months" | "1-year";

export interface Habit {
  id: string;
  name: string;
  colorKey: string;
  icon: string;
  frequency: HabitFrequency;
  frequencyDay?: number; // 0-6 for weekly (0=Sun), 1-31 for monthly
  category: string;
  completedDates: string[];
  createdAt: string;
}

export interface Priority {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export interface Task {
  id: string;
  name: string;
  dueDate: string;
  category: string;
  completed: boolean;
  createdAt: string;
}

export interface MoodEntry {
  date: string;
  mood: number;
  timestamp: number;
}

export interface BiggestWinEntry {
  date: string;
  text: string;
}

export interface GrowthJourneyReflection {
  answeredDate: string;
  q1: string;
  q2: string;
  q3: string;
}

export interface GrowthJourney {
  id: string;
  type: GrowthJourneyType;
  goal: string;
  startDate: string;
  endDate: string;
  reflection?: GrowthJourneyReflection;
}

export interface GoalItem {
  id: string;
  text: string;
  daysCompleted: number;
}

export interface GoalPeriodReflection {
  proudOf: string;
  surprised: string;
  nextStep: string;
  savedDate: string;
}

export interface GoalPeriod {
  type: GrowthJourneyType;
  startDate: string;
  items: GoalItem[];
  whyGoal: string;
  reflection: GoalPeriodReflection | null;
}

export interface AchievementEntry {
  id: string;
  text: string;
  emoji: string;
  date: string;
}

export interface VictoryEntry {
  id: string;
  text: string;
  date: string;
}

export interface MemoryEntry {
  id: string;
  text: string;
  date: string;
}

export interface FutureLetter {
  id: string;
  text: string;
  writtenDate: string;
  openIn: "30d" | "6m" | "1y";
  openDate: string;
}

export interface ScoreBreakdown {
  habits: number;
  priorities: number;
  checkIn: number;
  total: number;
}

export interface DaySnapshot {
  date: string;
  momentumScore: number;
  habitsCompleted: number;
  habitsTotal: number;
  top3Completed: number;
  top3Total: number;
  mood: number;
  biggestWin: string;
}

interface StorageData {
  habits: Habit[];
  moodHistory: MoodEntry[];
  todayGoal: string;
  priorities: Priority[];
  tasks: Task[];
  lastCheckIn: string;
  userName: string;
  biggestWins: BiggestWinEntry[];
  savedQuotes: string[];
  myWhy: string;
  growthJourneys: GrowthJourney[];
  achievements: AchievementEntry[];
  lessons: string[];
  gratitudeList: string[];
  victoryWall: VictoryEntry[];
  memoryLane: MemoryEntry[];
  futureLetters: FutureLetter[];
  identityVault: string[];
  startedDate: string;
  favoriteHabitIds: string[];
  journeyGoals: Record<string, string>;
  goalPeriods: Partial<Record<GrowthJourneyType, GoalPeriod>>;
  pinnedQuote: { text: string; source: string; date: string } | null;
}

interface AppContextType {
  habits: Habit[];
  moodHistory: MoodEntry[];
  priorities: Priority[];
  tasks: Task[];
  biggestWins: BiggestWinEntry[];
  savedQuotes: string[];
  myWhy: string;
  growthJourneys: GrowthJourney[];
  achievements: AchievementEntry[];
  lessons: string[];
  gratitudeList: string[];
  victoryWall: VictoryEntry[];
  memoryLane: MemoryEntry[];
  futureLetters: FutureLetter[];
  identityVault: string[];
  startedDate: string;
  favoriteHabitIds: string[];
  todayGoal: string;
  userName: string;
  biggestWin: string;
  momentumScore: number;
  scoreBreakdown: ScoreBreakdown;
  totalCompletions: number;
  todayMood: number | null;
  todayPriorities: Priority[];
  addHabit: (name: string, colorKey: string, icon: string, frequency: HabitFrequency, category?: string, frequencyDay?: number) => Promise<void>;
  editHabit: (id: string, updates: Partial<Pick<Habit, "name" | "colorKey" | "icon" | "frequency" | "frequencyDay" | "category">>) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string) => Promise<void>;
  setTodayGoal: (goal: string) => Promise<void>;
  logMood: (mood: number) => Promise<void>;
  addPriority: (text: string, date?: string) => Promise<void>;
  togglePriority: (id: string) => Promise<void>;
  removePriority: (id: string) => Promise<void>;
  addTask: (name: string, dueDate: string, category?: string) => Promise<void>;
  editTask: (id: string, updates: Partial<Pick<Task, "name" | "dueDate" | "category">>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  setUserName: (name: string) => Promise<void>;
  setBiggestWin: (text: string) => Promise<void>;
  saveQuote: (text: string) => Promise<void>;
  removeQuote: (text: string) => Promise<void>;
  setMyWhy: (text: string) => Promise<void>;
  addGrowthJourney: (type: GrowthJourneyType, goal: string) => Promise<void>;
  answerJourneyReflection: (id: string, q1: string, q2: string, q3: string) => Promise<void>;
  removeGrowthJourney: (id: string) => Promise<void>;
  addAchievement: (text: string, emoji: string) => Promise<void>;
  removeAchievement: (id: string) => Promise<void>;
  addLesson: (text: string) => Promise<void>;
  removeLesson: (idx: number) => Promise<void>;
  addGratitude: (text: string) => Promise<void>;
  removeGratitude: (idx: number) => Promise<void>;
  addVictory: (text: string) => Promise<void>;
  removeVictory: (id: string) => Promise<void>;
  addMemory: (text: string, date?: string) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  addFutureLetter: (text: string, openIn: "30d" | "6m" | "1y") => Promise<void>;
  removeFutureLetter: (id: string) => Promise<void>;
  addIdentityVault: (text: string) => Promise<void>;
  removeIdentityVault: (idx: number) => Promise<void>;
  setFavoriteHabits: (ids: string[]) => Promise<void>;
  journeyGoals: Record<string, string>;
  setJourneyGoal: (type: string, goal: string) => Promise<void>;
  goalPeriods: Partial<Record<GrowthJourneyType, GoalPeriod>>;
  startGoalPeriod: (type: GrowthJourneyType) => Promise<void>;
  addGoalItem: (type: GrowthJourneyType, text: string) => Promise<void>;
  removeGoalItem: (type: GrowthJourneyType, itemId: string) => Promise<void>;
  updateGoalItemDays: (type: GrowthJourneyType, itemId: string, days: number) => Promise<void>;
  setGoalWhy: (type: GrowthJourneyType, text: string) => Promise<void>;
  saveGoalReflection: (type: GrowthJourneyType, proudOf: string, surprised: string, nextStep: string) => Promise<void>;
  getHabitStreak: (id: string) => number;
  getHabitBestStreak: (id: string) => number;
  pinnedQuote: { text: string; source: string; date: string } | null;
  setPinnedQuote: (text: string, source: string) => Promise<void>;
  clearPinnedQuote: () => Promise<void>;
  getDailyQuoteCard: () => DailyQuoteCard;
  getPushMessage: () => PushMessage;
  getBestStreak: () => number;
  getTodayCompletionCount: () => number;
  isHabitDueToday: (habit: Habit) => boolean;
  getMoodTrend: () => MoodEntry[];
  getDaySnapshot: (date: string) => DaySnapshot;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const generateId = (): string =>
  `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00");
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function journeyEndDate(startDate: string, type: GrowthJourneyType): string {
  if (type === "21-days")    return addDays(startDate, 21);
  if (type === "6-months")   return addDays(startDate, 182);
  return addDays(startDate, 365);
}

export function isHabitScheduledForDate(habit: Habit, date: Date): boolean {
  const day     = date.getDay();    // 0 = Sunday
  const dateNum = date.getDate();   // 1–31
  if (habit.frequency === "daily")    return true;
  if (habit.frequency === "weekdays") return day >= 1 && day <= 5;
  if (habit.frequency === "weekly")   return day === (habit.frequencyDay ?? 0);
  if (habit.frequency === "monthly") {
    const target  = habit.frequencyDay ?? 1;
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return dateNum === Math.min(target, lastDay);
  }
  return true;
}

const withDefaults = (h: Partial<Habit>): Habit => ({
  icon: "star-outline",
  frequency: "daily",
  frequencyDay: undefined,
  category: "",
  completedDates: [],
  createdAt: new Date().toISOString(),
  ...h,
  id: h.id ?? generateId(),
  name: h.name ?? "",
  colorKey: h.colorKey ?? "habitLavender",
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayGoal, setTodayGoalState] = useState<string>("");
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [userName, setUserNameState] = useState<string>("");
  const [biggestWins, setBiggestWins] = useState<BiggestWinEntry[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<string[]>([]);
  const [myWhy, setMyWhyState] = useState<string>("");
  const [growthJourneys, setGrowthJourneys] = useState<GrowthJourney[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [lessons, setLessons] = useState<string[]>([]);
  const [gratitudeList, setGratitudeList] = useState<string[]>([]);
  const [victoryWall, setVictoryWall] = useState<VictoryEntry[]>([]);
  const [memoryLane, setMemoryLane] = useState<MemoryEntry[]>([]);
  const [futureLetters, setFutureLetters] = useState<FutureLetter[]>([]);
  const [identityVault, setIdentityVault] = useState<string[]>([]);
  const [startedDate, setStartedDate] = useState<string>("");
  const [favoriteHabitIds, setFavoriteHabitIds] = useState<string[]>([]);
  const [journeyGoals, setJourneyGoals] = useState<Record<string, string>>({});
  const [goalPeriods, setGoalPeriodsState] = useState<Partial<Record<GrowthJourneyType, GoalPeriod>>>({});
  const [pinnedQuote, setPinnedQuoteState] = useState<{ text: string; source: string; date: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-current snapshot used by the debounced persist fn
  const snap = useRef<StorageData>({
    habits: [], moodHistory: [], todayGoal: "", priorities: [], tasks: [],
    lastCheckIn: "", userName: "", biggestWins: [],
    savedQuotes: [], myWhy: "", growthJourneys: [],
    achievements: [], lessons: [], gratitudeList: [], victoryWall: [],
    memoryLane: [], futureLetters: [], identityVault: [], startedDate: "",
    favoriteHabitIds: [], journeyGoals: {}, goalPeriods: {}, pinnedQuote: null,
  });

  // Update snap on every render so the timer always writes fresh state
  snap.current = {
    habits, moodHistory, todayGoal, priorities, tasks, lastCheckIn,
    userName, biggestWins, savedQuotes, myWhy, growthJourneys,
    achievements, lessons, gratitudeList, victoryWall,
    memoryLane, futureLetters, identityVault, startedDate,
    favoriteHabitIds,
    journeyGoals,
    goalPeriods,
    pinnedQuote,
  };

  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap.current));
    }, 300);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const today = getTodayString();
      if (raw) {
        try {
          const data: Partial<StorageData> = JSON.parse(raw);
          setHabits((data.habits ?? []).map(withDefaults));
          setMoodHistory(data.moodHistory ?? []);
          setPriorities(data.priorities ?? []);
          setTasks(data.tasks ?? []);
          setTodayGoalState(data.todayGoal ?? "");
          setLastCheckIn(data.lastCheckIn ?? today);
          setUserNameState(data.userName ?? "");
          setBiggestWins(data.biggestWins ?? []);
          setSavedQuotes(data.savedQuotes ?? []);
          setMyWhyState(data.myWhy ?? "");
          setGrowthJourneys(data.growthJourneys ?? []);
          setAchievements(data.achievements ?? []);
          setLessons(data.lessons ?? []);
          setGratitudeList(data.gratitudeList ?? []);
          setVictoryWall(data.victoryWall ?? []);
          setMemoryLane(data.memoryLane ?? []);
          setFutureLetters(data.futureLetters ?? []);
          setIdentityVault(data.identityVault ?? []);
          setStartedDate(data.startedDate || today);
          setFavoriteHabitIds(data.favoriteHabitIds ?? []);
          setJourneyGoals(data.journeyGoals ?? {});
          setGoalPeriodsState(data.goalPeriods ?? {});
          const pinned = data.pinnedQuote ?? null;
          setPinnedQuoteState(pinned?.date === today ? pinned : null);
        } catch (_) {
          setLastCheckIn(today);
          setStartedDate(today);
        }
      } else {
        setLastCheckIn(today);
        setStartedDate(today);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const today = getTodayString();
    if (lastCheckIn !== today) {
      setLastCheckIn(today);
      setTimeout(persist, 10);
    }
  }, [loaded]);

  // ── Habit actions ────────────────────────────────────────────────────────

  const addHabit = useCallback(
    async (name: string, colorKey: string, icon: string, frequency: HabitFrequency, category = "", frequencyDay?: number) => {
      setHabits((prev) => [...prev, {
        id: generateId(), name, colorKey, icon, frequency, frequencyDay, category,
        completedDates: [], createdAt: new Date().toISOString(),
      }]);
      setTimeout(persist, 10);
    },
    [persist],
  );

  const editHabit = useCallback(
    async (id: string, updates: Partial<Pick<Habit, "name" | "colorKey" | "icon" | "frequency" | "frequencyDay" | "category">>) => {
      setHabits((prev) => prev.map((h) => h.id === id ? { ...h, ...updates } : h));
      setTimeout(persist, 10);
    },
    [persist],
  );

  const removeHabit = useCallback(
    async (id: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setTimeout(persist, 10);
    },
    [persist],
  );

  const toggleHabit = useCallback(
    async (id: string) => {
      const today = getTodayString();
      setHabits((prev) => prev.map((h) => {
        if (h.id !== id) return h;
        const done = h.completedDates.includes(today);
        return {
          ...h,
          completedDates: done
            ? h.completedDates.filter((d) => d !== today)
            : [...h.completedDates, today],
        };
      }));
      setTimeout(persist, 10);
    },
    [persist],
  );

  // ── Other actions ────────────────────────────────────────────────────────

  const setTodayGoal = useCallback(async (goal: string) => {
    setTodayGoalState(goal);
    setTimeout(persist, 10);
  }, [persist]);

  const logMood = useCallback(async (mood: number) => {
    const today = getTodayString();
    setMoodHistory((prev) => {
      const filtered = prev.filter((m) => m.date !== today);
      return [...filtered, { date: today, mood, timestamp: Date.now() }];
    });
    setTimeout(persist, 10);
  }, [persist]);

  const addPriority = useCallback(async (text: string, date?: string) => {
    const targetDate = date ?? getTodayString();
    setPriorities((prev) => {
      if (prev.filter((p) => p.date === targetDate).length >= 3) return prev;
      return [...prev, { id: generateId(), text: text.trim(), completed: false, date: targetDate }];
    });
    setTimeout(persist, 10);
  }, [persist]);

  const togglePriority = useCallback(async (id: string) => {
    setPriorities((prev) => prev.map((p) => p.id === id ? { ...p, completed: !p.completed } : p));
    setTimeout(persist, 10);
  }, [persist]);

  const removePriority = useCallback(async (id: string) => {
    setPriorities((prev) => prev.filter((p) => p.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const addTask = useCallback(async (name: string, dueDate: string, category = "") => {
    setTasks((prev) => [...prev, {
      id: generateId(), name: name.trim(), dueDate, category,
      completed: false, createdAt: new Date().toISOString(),
    }]);
    setTimeout(persist, 10);
  }, [persist]);

  const editTask = useCallback(async (id: string, updates: Partial<Pick<Task, "name" | "dueDate" | "category">>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    setTimeout(persist, 10);
  }, [persist]);

  const removeTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const toggleTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
    setTimeout(persist, 10);
  }, [persist]);

  const setUserName = useCallback(async (name: string) => {
    setUserNameState(name);
    setTimeout(persist, 10);
  }, [persist]);

  const setBiggestWin = useCallback(async (text: string) => {
    const today = getTodayString();
    setBiggestWins((prev) => {
      const filtered = prev.filter((w) => w.date !== today);
      return text.trim() ? [...filtered, { date: today, text: text.trim() }] : filtered;
    });
    setTimeout(persist, 10);
  }, [persist]);

  const saveQuote = useCallback(async (text: string) => {
    setSavedQuotes((prev) => (prev.includes(text) ? prev : [text, ...prev]));
    setTimeout(persist, 10);
  }, [persist]);

  const removeQuote = useCallback(async (text: string) => {
    setSavedQuotes((prev) => prev.filter((q) => q !== text));
    setTimeout(persist, 10);
  }, [persist]);

  const setMyWhy = useCallback(async (text: string) => {
    setMyWhyState(text);
    setTimeout(persist, 10);
  }, [persist]);

  const addGrowthJourney = useCallback(async (type: GrowthJourneyType, goal: string) => {
    const startDate = getTodayString();
    const journey: GrowthJourney = {
      id: generateId(), type, goal,
      startDate, endDate: journeyEndDate(startDate, type),
    };
    setGrowthJourneys((prev) => [journey, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const answerJourneyReflection = useCallback(async (id: string, q1: string, q2: string, q3: string) => {
    setGrowthJourneys((prev) => prev.map((j) =>
      j.id === id
        ? { ...j, reflection: { answeredDate: getTodayString(), q1, q2, q3 } }
        : j,
    ));
    setTimeout(persist, 10);
  }, [persist]);

  const removeGrowthJourney = useCallback(async (id: string) => {
    setGrowthJourneys((prev) => prev.filter((j) => j.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const addAchievement = useCallback(async (text: string, emoji: string) => {
    setAchievements((prev) => [{ id: generateId(), text, emoji, date: getTodayString() }, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeAchievement = useCallback(async (id: string) => {
    setAchievements((prev) => prev.filter((a) => a.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const addLesson = useCallback(async (text: string) => {
    setLessons((prev) => [text, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeLesson = useCallback(async (idx: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== idx));
    setTimeout(persist, 10);
  }, [persist]);

  const addGratitude = useCallback(async (text: string) => {
    setGratitudeList((prev) => [...prev, text]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeGratitude = useCallback(async (idx: number) => {
    setGratitudeList((prev) => prev.filter((_, i) => i !== idx));
    setTimeout(persist, 10);
  }, [persist]);

  const addVictory = useCallback(async (text: string) => {
    setVictoryWall((prev) => [{ id: generateId(), text, date: getTodayString() }, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeVictory = useCallback(async (id: string) => {
    setVictoryWall((prev) => prev.filter((v) => v.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const addMemory = useCallback(async (text: string, date?: string) => {
    setMemoryLane((prev) => [{ id: generateId(), text, date: date ?? getTodayString() }, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeMemory = useCallback(async (id: string) => {
    setMemoryLane((prev) => prev.filter((m) => m.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const addFutureLetter = useCallback(async (text: string, openIn: "30d" | "6m" | "1y") => {
    const written = getTodayString();
    const days = openIn === "30d" ? 30 : openIn === "6m" ? 182 : 365;
    const d = new Date(written + "T12:00");
    d.setDate(d.getDate() + days);
    const openDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setFutureLetters((prev) => [{ id: generateId(), text, writtenDate: written, openIn, openDate }, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeFutureLetter = useCallback(async (id: string) => {
    setFutureLetters((prev) => prev.filter((l) => l.id !== id));
    setTimeout(persist, 10);
  }, [persist]);

  const addIdentityVault = useCallback(async (text: string) => {
    setIdentityVault((prev) => [text, ...prev]);
    setTimeout(persist, 10);
  }, [persist]);

  const removeIdentityVault = useCallback(async (idx: number) => {
    setIdentityVault((prev) => prev.filter((_, i) => i !== idx));
    setTimeout(persist, 10);
  }, [persist]);

  const setFavoriteHabits = useCallback(async (ids: string[]) => {
    setFavoriteHabitIds(ids);
    setTimeout(persist, 10);
  }, [persist]);

  const setJourneyGoal = useCallback(async (type: string, goal: string) => {
    setJourneyGoals((prev) => ({ ...prev, [type]: goal }));
    setTimeout(persist, 10);
  }, [persist]);

  const startGoalPeriod = useCallback(async (type: GrowthJourneyType) => {
    const today = getTodayString();
    setGoalPeriodsState((prev) => ({
      ...prev,
      [type]: prev[type] ?? { type, startDate: today, items: [], whyGoal: "", reflection: null },
    }));
    setTimeout(persist, 10);
  }, [persist]);

  const addGoalItem = useCallback(async (type: GrowthJourneyType, text: string) => {
    setGoalPeriodsState((prev) => {
      const period = prev[type];
      if (!period) return prev;
      return { ...prev, [type]: { ...period, items: [...period.items, { id: generateId(), text, daysCompleted: 0 }] } };
    });
    setTimeout(persist, 10);
  }, [persist]);

  const removeGoalItem = useCallback(async (type: GrowthJourneyType, itemId: string) => {
    setGoalPeriodsState((prev) => {
      const period = prev[type];
      if (!period) return prev;
      return { ...prev, [type]: { ...period, items: period.items.filter((i) => i.id !== itemId) } };
    });
    setTimeout(persist, 10);
  }, [persist]);

  const updateGoalItemDays = useCallback(async (type: GrowthJourneyType, itemId: string, days: number) => {
    setGoalPeriodsState((prev) => {
      const period = prev[type];
      if (!period) return prev;
      return { ...prev, [type]: { ...period, items: period.items.map((i) => i.id === itemId ? { ...i, daysCompleted: Math.max(0, days) } : i) } };
    });
    setTimeout(persist, 10);
  }, [persist]);

  const setGoalWhy = useCallback(async (type: GrowthJourneyType, text: string) => {
    setGoalPeriodsState((prev) => {
      const period = prev[type];
      if (!period) return prev;
      return { ...prev, [type]: { ...period, whyGoal: text } };
    });
    setTimeout(persist, 10);
  }, [persist]);

  const saveGoalReflection = useCallback(async (type: GrowthJourneyType, proudOf: string, surprised: string, nextStep: string) => {
    setGoalPeriodsState((prev) => {
      const period = prev[type];
      if (!period) return prev;
      return { ...prev, [type]: { ...period, reflection: { proudOf, surprised, nextStep, savedDate: getTodayString() } } };
    });
    setTimeout(persist, 10);
  }, [persist]);

  const setPinnedQuote = useCallback(async (text: string, source: string) => {
    const today = getTodayString();
    const pinned = { text, source, date: today };
    snap.current.pinnedQuote = pinned;
    setPinnedQuoteState(pinned);
    persist();
  }, [persist]);

  const clearPinnedQuote = useCallback(async () => {
    snap.current.pinnedQuote = null;
    setPinnedQuoteState(null);
    persist();
  }, [persist]);

  // ── Computed / pure functions ────────────────────────────────────────────

  const getHabitStreak = useCallback(
    (id: string): number => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return 0;
      const checkDate = new Date();
      // If today is scheduled but not completed, start from yesterday
      if (
        isHabitScheduledForDate(habit, checkDate) &&
        !habit.completedDates.includes(formatDate(checkDate))
      ) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      let streak = 0;
      for (let i = 0; i < 365 * 5; i++) {
        if (isHabitScheduledForDate(habit, checkDate)) {
          if (habit.completedDates.includes(formatDate(checkDate))) {
            streak++;
          } else {
            break;
          }
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return streak;
    },
    [habits],
  );

  const getHabitBestStreak = useCallback(
    (id: string): number => {
      const habit = habits.find((h) => h.id === id);
      if (!habit || habit.completedDates.length === 0) return 0;
      const sorted = [...habit.completedDates].sort();
      const start = new Date(sorted[0] + "T12:00");
      const today = new Date();
      let best = 0, current = 0;
      const d = new Date(start);
      while (d <= today) {
        if (isHabitScheduledForDate(habit, d)) {
          if (habit.completedDates.includes(formatDate(d))) {
            current++;
            best = Math.max(best, current);
          } else {
            current = 0;
          }
        }
        d.setDate(d.getDate() + 1);
      }
      return best;
    },
    [habits],
  );

  const getBestStreak = useCallback((): number => {
    if (!habits.length) return 0;
    return Math.max(0, ...habits.map((h) => {
      const sorted = [...h.completedDates].sort();
      let best = 0, current = 0;
      for (let i = 0; i < sorted.length; i++) {
        if (i === 0) { current = 1; }
        else {
          const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
          current = diff === 1 ? current + 1 : 1;
        }
        best = Math.max(best, current);
      }
      return best;
    }));
  }, [habits]);

  const getTodayCompletionCount = useCallback((): number => {
    const todayStr  = getTodayString();
    const todayDate = new Date();
    return habits.filter(
      (h) => isHabitScheduledForDate(h, todayDate) && h.completedDates.includes(todayStr)
    ).length;
  }, [habits]);

  const isHabitDueToday = useCallback(
    (habit: Habit): boolean => isHabitScheduledForDate(habit, new Date()),
    [],
  );

  const getMoodTrend = useCallback((): MoodEntry[] => {
    const result: MoodEntry[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = formatDate(d);
      const entry = moodHistory.find((m) => m.date === ds);
      result.push(entry ?? { date: ds, mood: 0, timestamp: 0 });
    }
    return result;
  }, [moodHistory]);

  const getDailyQuoteCard = useCallback((): DailyQuoteCard => {
    const idx = (new Date().getDate() + new Date().getMonth() * 31) % DAILY_QUOTE_CARDS.length;
    return DAILY_QUOTE_CARDS[idx];
  }, []);

  const getPushMessage = useCallback((): PushMessage => getRandomPush(), []);

  const getDaySnapshot = useCallback(
    (date: string): DaySnapshot => {
      const dateObj = new Date(date + "T12:00");
      const scheduled = habits.filter((h) => isHabitScheduledForDate(h, dateObj));
      const done  = scheduled.filter((h) => h.completedDates.includes(date)).length;
      const total = scheduled.length;
      const habitsScore = total > 0 ? Math.round((done / total) * 60) : 0;
      const dayPriorities = priorities.filter((p) => p.date === date);
      const doneP = dayPriorities.filter((p) => p.completed).length;
      const top3Score = dayPriorities.length === 0 ? 30 : Math.round((doneP / dayPriorities.length) * 30);
      const hasActivity = done > 0 || dayPriorities.length > 0;
      const mood = moodHistory.find((m) => m.date === date)?.mood ?? 0;
      const win = biggestWins.find((w) => w.date === date)?.text ?? "";
      return {
        date,
        momentumScore: habitsScore + top3Score + (hasActivity ? 10 : 0),
        habitsCompleted: done,
        habitsTotal: total,
        top3Completed: doneP,
        top3Total: dayPriorities.length,
        mood,
        biggestWin: win,
      };
    },
    [habits, priorities, moodHistory, biggestWins],
  );

  // ── Derived State ──────────────────────────────────────────────────────────

  const today = getTodayString();
  const todayDate = new Date();
  const scheduledToday    = habits.filter((h) => isHabitScheduledForDate(h, todayDate));
  const todayDone         = scheduledToday.filter((h) => h.completedDates.includes(today)).length;
  const totalHabitsToday  = scheduledToday.length;
  const todayPriorities   = priorities.filter((p) => p.date === today);
  const completedPriorities = todayPriorities.filter((p) => p.completed).length;

  const habitsScore = totalHabitsToday > 0 ? Math.round((todayDone / totalHabitsToday) * 60) : 0;
  const prioritiesScore = todayPriorities.length === 0 ? 30 : Math.round((completedPriorities / todayPriorities.length) * 30);

  const scoreBreakdown: ScoreBreakdown = {
    habits: habitsScore,
    priorities: prioritiesScore,
    checkIn: 10,
    total: habitsScore + prioritiesScore + 10,
  };

  const momentumScore = scoreBreakdown.total;
  const totalCompletions = habits.reduce((sum, h) => sum + h.completedDates.length, 0);
  const todayMood: number | null = moodHistory.find((m) => m.date === today)?.mood ?? null;
  const todayBiggestWin = biggestWins.find((w) => w.date === today)?.text ?? "";

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        habits, moodHistory, priorities, tasks, biggestWins, savedQuotes, myWhy, growthJourneys,
        achievements, lessons, gratitudeList, victoryWall, memoryLane, futureLetters, identityVault, startedDate,
        todayGoal, userName,
        biggestWin: todayBiggestWin,
        momentumScore, scoreBreakdown, totalCompletions, todayMood, todayPriorities,
        addHabit, editHabit, removeHabit, toggleHabit, setTodayGoal, logMood,
        addPriority, togglePriority, removePriority,
        addTask, editTask, removeTask, toggleTask,
        setUserName, setBiggestWin,
        saveQuote, removeQuote, setMyWhy,
        addGrowthJourney, answerJourneyReflection, removeGrowthJourney,
        addAchievement, removeAchievement, addLesson, removeLesson,
        addGratitude, removeGratitude, addVictory, removeVictory,
        addMemory, removeMemory, addFutureLetter, removeFutureLetter,
        addIdentityVault, removeIdentityVault, setFavoriteHabits,
        favoriteHabitIds, journeyGoals, setJourneyGoal,
        goalPeriods, startGoalPeriod, addGoalItem, removeGoalItem, updateGoalItemDays, setGoalWhy, saveGoalReflection,
        pinnedQuote, setPinnedQuote, clearPinnedQuote,
        getHabitStreak, getHabitBestStreak, getDailyQuoteCard, getPushMessage,
        getBestStreak, getTodayCompletionCount, isHabitDueToday, getMoodTrend, getDaySnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
