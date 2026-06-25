export type PushCategory =
  | "Motivation"
  | "Productivity"
  | "Confidence"
  | "Resilience"
  | "Creativity"
  | "Courage";

export type PushType = "quote" | "nudge" | "confidence" | "tough-love";

export interface PushMessage {
  type: PushType;
  text: string;
  source?: string;
  sourceRole?: string;
  category: PushCategory;
}

// ─── Famous Quotes ────────────────────────────────────────────────────────────

export const FAMOUS_QUOTES: PushMessage[] = [
  {
    type: "quote",
    text: "The only way to do great work is to love what you do.",
    source: "Steve Jobs",
    sourceRole: "Entrepreneur",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    source: "Commonly attributed to Winston Churchill",
    sourceRole: "Prime Minister",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "It always seems impossible until it is done.",
    source: "Nelson Mandela",
    sourceRole: "Activist & President",
    category: "Courage",
  },
  {
    type: "quote",
    text: "In the middle of every difficulty lies opportunity.",
    source: "Commonly attributed to Albert Einstein",
    sourceRole: "Physicist",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "We may encounter many defeats but we must not be defeated.",
    source: "Maya Angelou",
    sourceRole: "Poet & Author",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "Do what you can, with what you have, where you are.",
    source: "Theodore Roosevelt",
    sourceRole: "26th U.S. President",
    category: "Productivity",
  },
  {
    type: "quote",
    text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.",
    source: "Will Durant",
    sourceRole: "Historian (on Aristotle)",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Do not go where the path may lead; go instead where there is no path and leave a trail.",
    source: "Ralph Waldo Emerson",
    sourceRole: "Philosopher & Poet",
    category: "Creativity",
  },
  {
    type: "quote",
    text: "Courage is resistance to fear, mastery of fear — not absence of fear.",
    source: "Mark Twain",
    sourceRole: "Author",
    category: "Courage",
  },
  {
    type: "quote",
    text: "Be yourself; everyone else is already taken.",
    source: "Oscar Wilde",
    sourceRole: "Author & Playwright",
    category: "Confidence",
  },
  {
    type: "quote",
    text: "You must do the things you think you cannot do.",
    source: "Eleanor Roosevelt",
    sourceRole: "First Lady & Diplomat",
    category: "Courage",
  },
  {
    type: "quote",
    text: "No one can make you feel inferior without your consent.",
    source: "Eleanor Roosevelt",
    sourceRole: "First Lady & Diplomat",
    category: "Confidence",
  },
  {
    type: "quote",
    text: "You are never too old to set another goal or to dream a new dream.",
    source: "Commonly attributed to C.S. Lewis",
    sourceRole: "Author",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Act as if what you do makes a difference. It does.",
    source: "William James",
    sourceRole: "Philosopher & Psychologist",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Start where you are. Use what you have. Do what you can.",
    source: "Arthur Ashe",
    sourceRole: "Tennis Champion",
    category: "Productivity",
  },
  {
    type: "quote",
    text: "Champions keep playing until they get it right.",
    source: "Billie Jean King",
    sourceRole: "Tennis Champion",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "It does not matter how slowly you go as long as you do not stop.",
    source: "Commonly attributed to Confucius",
    sourceRole: "Philosopher",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "Whether you think you can, or you think you can't — you're right.",
    source: "Henry Ford",
    sourceRole: "Entrepreneur",
    category: "Confidence",
  },
  {
    type: "quote",
    text: "I have not failed. I have just found 10,000 ways that won't work.",
    source: "Thomas A. Edison",
    sourceRole: "Inventor",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    source: "Johann Wolfgang von Goethe",
    sourceRole: "Poet & Philosopher",
    category: "Productivity",
  },
  {
    type: "quote",
    text: "It is not that things are difficult that we do not dare; it is that we do not dare that makes things difficult.",
    source: "Seneca",
    sourceRole: "Stoic Philosopher",
    category: "Courage",
  },
  {
    type: "quote",
    text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.",
    source: "Rumi",
    sourceRole: "Poet & Mystic",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Vulnerability is not weakness. It is our greatest measure of courage.",
    source: "Brené Brown",
    sourceRole: "Author & Researcher",
    category: "Courage",
  },
  {
    type: "quote",
    text: "All our dreams can come true, if we have the courage to pursue them.",
    source: "Commonly attributed to Walt Disney",
    sourceRole: "Entrepreneur",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Your life does not get better by chance, it gets better by change.",
    source: "Jim Rohn",
    sourceRole: "Entrepreneur & Author",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "I can accept failure; everyone fails at something. But I cannot accept not trying.",
    source: "Michael Jordan",
    sourceRole: "NBA Champion",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "A champion is defined not by their wins but by how they recover when they fall.",
    source: "Serena Williams",
    sourceRole: "Tennis Champion",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "The cave you fear to enter holds the treasure you seek.",
    source: "Joseph Campbell",
    sourceRole: "Author & Mythologist",
    category: "Courage",
  },
  {
    type: "quote",
    text: "When we are no longer able to change a situation, we are challenged to change ourselves.",
    source: "Viktor Frankl",
    sourceRole: "Psychiatrist & Author",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "The secret of getting ahead is getting started.",
    source: "Commonly attributed to Mark Twain",
    sourceRole: "Author",
    category: "Productivity",
  },
  {
    type: "quote",
    text: "It is during our darkest moments that we must focus to see the light.",
    source: "Commonly attributed to Aristotle",
    sourceRole: "Philosopher",
    category: "Resilience",
  },
  {
    type: "quote",
    text: "The beautiful thing about learning is nobody can take it away from you.",
    source: "B.B. King",
    sourceRole: "Musician",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Creativity is intelligence having fun.",
    source: "Commonly attributed to Albert Einstein",
    sourceRole: "Physicist",
    category: "Creativity",
  },
  {
    type: "quote",
    text: "What you do speaks so loudly that I cannot hear what you say.",
    source: "Ralph Waldo Emerson",
    sourceRole: "Philosopher & Poet",
    category: "Motivation",
  },
  {
    type: "quote",
    text: "Hard work beats talent when talent doesn't work hard.",
    source: "Commonly attributed to Tim Notke",
    sourceRole: "Coach",
    category: "Productivity",
  },
];

// ─── Productivity Nudges ──────────────────────────────────────────────────────

export const PRODUCTIVITY_NUDGES: PushMessage[] = [
  {
    type: "nudge",
    text: "Your future self is cheering you on right now. Do not let them down.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "Every action you take today is a gift to tomorrow's version of you.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "What is the one thing you can do right now that would make everything else easier?",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "Done is better than perfect. Start, then improve.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "Small wins compound into big results. Stack one more on top.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "Three minutes of focused effort beats three hours of distracted trying.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "The goal is not to feel motivated. The goal is to act first and feel the momentum after.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "Motivation follows action, not the other way around. Start anyway.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "You have the same 24 hours as everyone you admire. Use them intentionally.",
    category: "Productivity",
  },
  {
    type: "nudge",
    text: "Progress over perfection. Always.",
    category: "Productivity",
  },
];

// ─── Confidence Boosts ────────────────────────────────────────────────────────

export const CONFIDENCE_BOOSTS: PushMessage[] = [
  {
    type: "confidence",
    text: "You have survived 100% of your hardest days. Today is no exception.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "The version of you who almost gave up would be in awe of the one who didn't.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "You have done harder things than this. This is yours to conquer.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "The fact that you are trying puts you ahead of everyone who is not.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "Your consistency is quietly building something remarkable. Others will notice.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "You are more capable than your doubts would have you believe.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "Your habits are your identity. Every check-off says: this is who I am.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "Showing up when it is hard is what separates the committed from the curious.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "You have earned every bit of progress you have made. Own it.",
    category: "Confidence",
  },
  {
    type: "confidence",
    text: "The momentum you have built is real. Do not let today be the day it stops.",
    category: "Confidence",
  },
];

// ─── Funny Tough-Love ─────────────────────────────────────────────────────────

export const TOUGH_LOVE: PushMessage[] = [
  {
    type: "tough-love",
    text: "Nobody is coming to save you. Good thing you already started saving yourself.",
    category: "Motivation",
  },
  {
    type: "tough-love",
    text: "Your future self called. They are not thrilled about the excuses you are about to make.",
    category: "Motivation",
  },
  {
    type: "tough-love",
    text: "The couch will still be there. The chance to be great today will not.",
    category: "Motivation",
  },
  {
    type: "tough-love",
    text: "You did not come this far to only come this far.",
    category: "Resilience",
  },
  {
    type: "tough-love",
    text: "If it were easy, everyone would do it. You are not everyone.",
    category: "Courage",
  },
  {
    type: "tough-love",
    text: "Every champion looked exactly like you do right now before they decided to begin.",
    category: "Motivation",
  },
  {
    type: "tough-love",
    text: "Someday is not a day of the week. Today is.",
    category: "Productivity",
  },
  {
    type: "tough-love",
    text: "You have exactly zero reasons to quit and at least one great reason to keep going.",
    category: "Resilience",
  },
  {
    type: "tough-love",
    text: "Comfort is the enemy of growth. You already know this. Now act like it.",
    category: "Courage",
  },
  {
    type: "tough-love",
    text: "The hardest part is starting. You are already past that.",
    category: "Motivation",
  },
];

// ─── All Messages Combined ────────────────────────────────────────────────────

export const ALL_PUSH_MESSAGES: PushMessage[] = [
  ...FAMOUS_QUOTES,
  ...PRODUCTIVITY_NUDGES,
  ...CONFIDENCE_BOOSTS,
  ...TOUGH_LOVE,
];

export const CATEGORY_COLORS: Record<PushCategory, string> = {
  Motivation: "#F0A050",
  Productivity: "#6B9EEB",
  Confidence: "#A094E8",
  Resilience: "#6DBFA0",
  Creativity: "#E89494",
  Courage: "#E8AE80",
};

// ─── Random Picker ─────────────────────────────────────────────────────────────

let _lastIdx = -1;

export function getRandomPush(): PushMessage {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * ALL_PUSH_MESSAGES.length);
  } while (idx === _lastIdx && ALL_PUSH_MESSAGES.length > 1);
  _lastIdx = idx;
  return ALL_PUSH_MESSAGES[idx];
}
