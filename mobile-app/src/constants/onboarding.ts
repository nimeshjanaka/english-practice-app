/** AsyncStorage — first-run welcome completed (or skipped via Log In). */
export const ONBOARDING_SEEN_KEY = "onboarding_seen";

/** AsyncStorage — Speakora onboarding profile draft (JSON). */
export const ONBOARDING_PROFILE_KEY = "onboarding_profile";

export type OnboardingProfile = {
  name?: string;
  ageRange?: string;
  gender?: string;
  /** Language the learner already speaks. Explanations can use this later. */
  nativeLanguage?: string;
  learnLanguage?: string;
  /** Self-reported CEFR before the placement quiz. */
  level?: string;
  /** Placement-quiz estimated CEFR (may override level). */
  testedLevel?: string;
  /** Answer chosen on the short level-test screen. */
  levelTestAnswer?: string;
  goal?: string;
  situations?: string[];
  focus?: string;
  difficulty?: string;
  challengeAnswers?: string[];
  tutorVoice?: string;
  tutorSpeed?: number;
  goalTimeline?: string;
  dailyMinutes?: number;
  practiceHour?: number;
  practiceMinute?: number;
  notificationsEnabled?: boolean;
};

export const AGE_RANGES = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-60",
  "60+",
] as const;

export const GENDERS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

export const NATIVE_LANGUAGES = [
  { id: "si", label: "Sinhala", flag: "🇱🇰" },
  { id: "ta", label: "Tamil", flag: "🇱🇰" },
  { id: "en", label: "English", flag: "🇬🇧" },
] as const;

export const LEARN_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export const CEFR_LEVELS = [
  {
    id: "A0",
    title: "A0",
    label: "A0 Beginner",
    blurb: "I know little or no English. I need to start with the basics",
  },
  {
    id: "A1",
    title: "A1",
    label: "A1 Elementary",
    blurb: "I know common words and simple sentences",
  },
  {
    id: "A2",
    title: "A2",
    label: "A2 Elementary",
    blurb: "I can talk about everyday things, but briefly",
  },
  {
    id: "B1",
    title: "B1",
    label: "B1 Intermediate",
    blurb: "I can talk about my life and share my ideas",
  },
  {
    id: "B2",
    title: "B2",
    label: "B2 Upper-Intermediate",
    blurb: "I can speak fluently and discuss topics in depth",
  },
] as const;

export const LEARNING_GOALS = [
  { id: "growth", emoji: "💪", label: "Personal growth" },
  { id: "education", emoji: "🎓", label: "Education" },
  { id: "social", emoji: "🎉", label: "Social life" },
  { id: "career", emoji: "💼", label: "Career" },
  { id: "travel", emoji: "✈️", label: "Travel" },
  { id: "abroad", emoji: "🌎", label: "Live abroad" },
  { id: "speaking", emoji: "🗣️", label: "Speaking confidence" },
] as const;

export const SITUATIONS = [
  { id: "future", emoji: "🚀", label: "Prepare for the future" },
  { id: "brain", emoji: "🏋️", label: "Brain training" },
  { id: "books", emoji: "📖", label: "Books & articles" },
  { id: "media", emoji: "📺", label: "Movies, shows & podcasts" },
  { id: "discipline", emoji: "💪", label: "Building self-discipline" },
  { id: "other", emoji: "✨", label: "Other" },
] as const;

export const FOCUS_AREAS = [
  { id: "listening", label: "Listening Skills" },
  { id: "vocabulary", label: "Expanding Vocabulary" },
  { id: "speaking", label: "Speaking Fluency" },
] as const;

export const DIFFICULTIES = [
  { id: "vocab", emoji: "🗣️", label: "Limited vocabulary" },
  { id: "partner", emoji: "👥", label: "No one to practice with" },
  { id: "time", emoji: "⏱️", label: "No time to practice" },
  { id: "accent", emoji: "😳", label: "Embarrassed about my accent" },
  { id: "mistakes", emoji: "😰", label: "Fear of making mistakes" },
  { id: "freeze", emoji: "🥶", label: "I freeze when I speak" },
  { id: "native", emoji: "👂", label: "Can't understand native speakers" },
] as const;

export type ChallengeQuestion = {
  id: string;
  prompt: string;
  sentence: string;
  options: string[];
  /** Index of the correct option; -1 if "I'm not sure" is acceptable. */
  correctIndex: number;
  /** CEFR band this item probes. */
  band: "A1" | "A2" | "B1" | "B2";
};

export const CHALLENGE_QUESTIONS: ChallengeQuestion[] = [
  {
    id: "q1",
    prompt: "Is this sentence correct?",
    sentence: "I'm good in cooking.",
    options: ["Yes", "No", "I'm not sure"],
    correctIndex: 1,
    band: "A2",
  },
  {
    id: "q2",
    prompt: "What does this sentence mean?",
    sentence: "I used to work on weekends.",
    options: [
      "This person is used to working on weekends.",
      "This person is going to start working on weekends.",
      "This person worked on weekends before, but not anymore.",
      "I'm not sure",
    ],
    correctIndex: 2,
    band: "B1",
  },
  {
    id: "q3",
    prompt: "Is this sentence correct?",
    sentence: "She don't like coffee.",
    options: ["Yes", "No", "I'm not sure"],
    correctIndex: 1,
    band: "A1",
  },
  {
    id: "q4",
    prompt: "Choose the best meaning.",
    sentence: "Could you give me a hand with this?",
    options: [
      "Please clap for me.",
      "Please help me.",
      "Please wait a moment.",
      "I'm not sure",
    ],
    correctIndex: 1,
    band: "B1",
  },
];

export const LEVEL_COPY: Record<
  string,
  { label: string; description: string }
> = {
  A0: {
    label: "A0 Beginner",
    description:
      "You're at the very start — that's exciting. We'll build confidence with greetings, simple phrases, and everyday words.",
  },
  A1: {
    label: "A1 Elementary",
    description:
      "You know more than you think! We'll grow your vocabulary and help you speak in short, clear sentences.",
  },
  A2: {
    label: "A2 Elementary",
    description:
      "You know more than you think! Your challenge isn't vocabulary — it's feeling brave enough to use what you know. Let's practice real conversations at your own pace.",
  },
  B1: {
    label: "B1 Intermediate",
    description:
      "You can already share ideas. We'll push fluency, richer vocabulary, and smoother real-life conversations.",
  },
  B2: {
    label: "B2 Upper-Intermediate",
    description:
      "You're strong already. We'll refine nuance, confidence, and natural expression across more complex topics.",
  },
};

export const TUTORS = [
  {
    id: "nova",
    name: "Nova",
    origin: "🤖 Android",
    traits: "Encouraging • Supportive • Practical",
    tagline: "Your judgment-free speaking partner",
  },
  {
    id: "joanna",
    name: "Joanna",
    origin: "🇺🇸 United States",
    traits: "Mature • Logical • Cool-tempered",
    tagline: "Well-rounded tutor for all learners",
  },
  {
    id: "mia",
    name: "Mia",
    origin: "🇺🇸 United States",
    traits: "Reassuring • Relatable • Gentle",
    tagline: "Makes you feel comfortable speaking",
  },
  {
    id: "ben",
    name: "Ben",
    origin: "🇬🇧 United Kingdom",
    traits: "Patient • Humorous • Expressive",
    tagline: "Keeps practice lively and natural",
  },
] as const;

export const TUTOR_SPEEDS = [
  { id: 0.5, label: "Extra Slow", hint: "0.5x Clear and deliberate" },
  { id: 0.7, label: "Very Slow", hint: "0.7x Clear and by syllables" },
  { id: 0.9, label: "Slow", hint: "0.9x A bit below normal" },
  { id: 1.0, label: "Normal", hint: "1.0x Natural pace" },
  { id: 1.1, label: "Slightly Fast", hint: "1.1x Comfortably quick" },
  { id: 1.25, label: "Fast", hint: "1.25x Brisk and fluent" },
] as const;

export const GOAL_TIMELINES = [
  "1 week",
  "1 month",
  "3 months",
  "6 months",
  "I'm a long-term learner",
  "I'm not sure",
] as const;

export const DAILY_MINUTES = [5, 10, 15, 20, 30, 60] as const;

/** Speakora visual system — tuned to onboarding mockups. */
export const BRAND = {
  blue: "#5568D7",
  blueDeep: "#3F51C8",
  blueSoft: "#EEF1FF",
  blueMuted: "#C5CDF5",
  blueGlow: "#7B8CFF",
  text: "#1A1D26",
  muted: "#8B93A7",
  border: "#E6E9F2",
  borderStrong: "#D0D5E6",
  bg: "#FFFFFF",
  bgWash: "#F7F8FC",
  card: "#FFFFFF",
  success: "#22C55E",
  radius: 18,
  radiusBtn: 16,
} as const;

/** Score placement answers → estimated CEFR band. */
export function estimateLevelFromAnswers(
  answers: Array<{ correctIndex: number; chosenIndex: number; band: string }>,
): string {
  let score = 0;
  for (const a of answers) {
    if (a.chosenIndex === a.correctIndex) {
      if (a.band === "A1") score += 1;
      else if (a.band === "A2") score += 2;
      else if (a.band === "B1") score += 3;
      else score += 4;
    } else if (a.chosenIndex >= 0) {
      // Wrong but attempted — tiny credit for engagement.
      score += 0.25;
    }
  }
  if (score < 2) return "A0";
  if (score < 4) return "A1";
  if (score < 7) return "A2";
  if (score < 10) return "B1";
  return "B2";
}
