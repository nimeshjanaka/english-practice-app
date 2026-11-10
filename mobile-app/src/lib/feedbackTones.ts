import { Asset } from "expo-asset";
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import { Platform, Vibration } from "react-native";

/** Prefer CAF on iOS (native), WAV elsewhere. */
const CORRECT_SOURCE = Platform.select({
  ios: require("../../assets/audio/correct.caf"),
  default: require("../../assets/audio/correct.wav"),
});
const INCORRECT_SOURCE = Platform.select({
  ios: require("../../assets/audio/incorrect.caf"),
  default: require("../../assets/audio/incorrect.wav"),
});

let correctPlayer: AudioPlayer | null = null;
let incorrectPlayer: AudioPlayer | null = null;
let prepared = false;
let preparing: Promise<void> | null = null;

async function resolveSource(moduleId: number): Promise<{ uri: string }> {
  const asset = Asset.fromModule(moduleId);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("Could not resolve feedback tone asset URI");
  }
  return { uri };
}

async function waitUntilLoaded(player: AudioPlayer, timeoutMs = 1500): Promise<void> {
  if (player.isLoaded && player.duration > 0) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      sub.remove();
      resolve();
    }, timeoutMs);

    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded || (typeof status.duration === "number" && status.duration > 0)) {
        clearTimeout(timer);
        sub.remove();
        resolve();
      }
    });
  });
}

async function preparePlayers(): Promise<void> {
  if (prepared && correctPlayer && incorrectPlayer) return;
  if (preparing) {
    await preparing;
    return;
  }

  preparing = (async () => {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: "duckOthers",
      shouldPlayInBackground: false,
    });

    const [correctSrc, incorrectSrc] = await Promise.all([
      resolveSource(CORRECT_SOURCE),
      resolveSource(INCORRECT_SOURCE),
    ]);

    try {
      correctPlayer?.release();
    } catch {
      // ignore
    }
    try {
      incorrectPlayer?.release();
    } catch {
      // ignore
    }

    correctPlayer = createAudioPlayer(correctSrc, { updateInterval: 100 });
    incorrectPlayer = createAudioPlayer(incorrectSrc, { updateInterval: 100 });
    correctPlayer.volume = 1;
    incorrectPlayer.volume = 1;

    await Promise.all([waitUntilLoaded(correctPlayer), waitUntilLoaded(incorrectPlayer)]);
    prepared = true;
  })();

  try {
    await preparing;
  } finally {
    preparing = null;
  }
}

async function playKind(kind: "correct" | "incorrect"): Promise<void> {
  await preparePlayers();
  const player = kind === "correct" ? correctPlayer : incorrectPlayer;
  if (!player) {
    throw new Error(`Feedback ${kind} player was not created`);
  }

  try {
    player.pause();
  } catch {
    // ignore
  }

  try {
    await player.seekTo(0);
  } catch {
    // ignore
  }

  player.volume = 1;
  player.play();
}

/** Bright ascending chime for a correct answer. */
export function playCorrectTone(): void {
  if (Platform.OS !== "web") {
    Vibration.vibrate(40);
  }
  void playKind("correct").catch((err) => {
    console.warn("[Speakora] correct tone failed", err);
  });
}

/** Soft low descending tone for an incorrect answer. */
export function playIncorrectTone(): void {
  if (Platform.OS !== "web") {
    Vibration.vibrate([0, 50, 40, 50]);
  }
  void playKind("incorrect").catch((err) => {
    console.warn("[Speakora] incorrect tone failed", err);
  });
}

/** Call early (e.g. exercise screen mount) so the first answer is not silent. */
export function preloadFeedbackTones(): void {
  void preparePlayers().catch((err) => {
    console.warn("[Speakora] tone preload failed", err);
  });
}
