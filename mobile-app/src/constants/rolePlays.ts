import type { ImageSourcePropType } from "react-native";

/**
 * Speakora Role Plays — 10 two-person voice scenarios (4 minutes each).
 */

export const ROLE_PLAY_SECONDS = 4 * 60;

export type RolePlayScenario = {
  id: string;
  title: string;
  description: string;
  /** Who the AI plays */
  partnerRole: string;
  /** Who the learner plays */
  userRole: string;
  /** First line the partner speaks when the session starts */
  openingLine: string;
  /** Accent color for chips / accents */
  accent: string;
  /** Topic thumbnail */
  image: ImageSourcePropType;
};

export const ROLE_PLAYS: RolePlayScenario[] = [
  {
    id: "coffee",
    title: "Ordering Coffee",
    description: "Order a drink, ask about sizes, and chat with a barista.",
    partnerRole: "Barista",
    userRole: "Customer",
    openingLine: "Hi there! Welcome in. What can I get started for you today?",
    accent: "#D97706",
    image: require("../../assets/role-plays/coffee.jpg"),
  },
  {
    id: "airport",
    title: "At the Airport",
    description: "Check in, ask about gates, and handle travel questions.",
    partnerRole: "Check-in agent",
    userRole: "Traveler",
    openingLine: "Good morning. May I see your passport and booking reference, please?",
    accent: "#2563EB",
    image: require("../../assets/role-plays/airport.jpg"),
  },
  {
    id: "friend",
    title: "Meeting a Friend",
    description: "Greet someone, make small talk, and make plans.",
    partnerRole: "Friend",
    userRole: "You",
    openingLine: "Hey! It's been ages. How have you been?",
    accent: "#DB2777",
    image: require("../../assets/role-plays/friend.jpg"),
  },
  {
    id: "hotel",
    title: "Hotel Check-in",
    description: "Check into a hotel, ask about the room, and request extras.",
    partnerRole: "Receptionist",
    userRole: "Guest",
    openingLine: "Welcome to the Grand Hotel. Do you have a reservation with us?",
    accent: "#7C3AED",
    image: require("../../assets/role-plays/hotel.jpg"),
  },
  {
    id: "doctor",
    title: "Doctor Visit",
    description: "Describe symptoms and answer the doctor's questions clearly.",
    partnerRole: "Doctor",
    userRole: "Patient",
    openingLine: "Hello, please take a seat. What brings you in today?",
    accent: "#059669",
    image: require("../../assets/role-plays/doctor.jpg"),
  },
  {
    id: "interview",
    title: "Job Interview",
    description: "Introduce yourself and answer common interview questions.",
    partnerRole: "Interviewer",
    userRole: "Candidate",
    openingLine: "Thanks for coming in today. Could you start by telling me a bit about yourself?",
    accent: "#0F766E",
    image: require("../../assets/role-plays/interview.jpg"),
  },
  {
    id: "restaurant",
    title: "Restaurant Dinner",
    description: "Order food, ask about dishes, and handle the bill politely.",
    partnerRole: "Waiter",
    userRole: "Diner",
    openingLine: "Good evening! Would you like to hear tonight's specials, or are you ready to order?",
    accent: "#DC2626",
    image: require("../../assets/role-plays/restaurant.jpg"),
  },
  {
    id: "shopping",
    title: "Clothes Shopping",
    description: "Ask for sizes, colors, and try-on help in a store.",
    partnerRole: "Shop assistant",
    userRole: "Shopper",
    openingLine: "Hi! Looking for anything in particular today, or just browsing?",
    accent: "#EA580C",
    image: require("../../assets/role-plays/shopping.jpg"),
  },
  {
    id: "directions",
    title: "Asking for Directions",
    description: "Ask a local how to get somewhere and confirm the route.",
    partnerRole: "Local resident",
    userRole: "Visitor",
    openingLine: "Excuse me — you look a bit lost. Can I help you find something?",
    accent: "#0284C7",
    image: require("../../assets/role-plays/directions.jpg"),
  },
  {
    id: "support",
    title: "Phone Support",
    description: "Explain a problem and follow support steps on a call.",
    partnerRole: "Support agent",
    userRole: "Customer",
    openingLine: "Thank you for calling support. My name is Alex. How can I help you today?",
    accent: "#4F46E5",
    image: require("../../assets/role-plays/support.jpg"),
  },
];

export function getRolePlay(id: string): RolePlayScenario | undefined {
  return ROLE_PLAYS.find((item) => item.id === id);
}

/** Brief passed to the AI so it stays in character as the partner. */
export function buildRoleContext(scenario: RolePlayScenario): string {
  return [
    `ROLE PLAY MODE.`,
    `Scenario: ${scenario.title}.`,
    `You are the ${scenario.partnerRole}.`,
    `The learner is the ${scenario.userRole}.`,
    `Stay in character and keep a natural two-person spoken conversation.`,
    `Reply in 1-2 short spoken sentences. Gently correct weak English inside your reply when needed.`,
  ].join(" ");
}
