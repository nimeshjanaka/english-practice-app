import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOKEN_KEY } from "../src/constants/api";
import { ONBOARDING_SEEN_KEY } from "../src/constants/onboarding";

/** Replace this JSON anytime with your own AI-robot Lottie file. */
const AI_ROBOT_LOTTIE = require("../assets/lottie/ai-robot.json");
const WELCOME_AUDIO = require("../assets/audio/welcome.m4a");

const SPLASH_MIN_MS = 3000;

/**
 * Animated splash — yaytalk blue, AI robot Lottie (fade + scale),
 * welcome audio (expo-audio), then Onboarding (or Tabs if signed in).
 *
 * Note: expo-av is not available in current Expo Go — use expo-audio instead.
 */
export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const lottieRef = useRef<LottieView>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const finishWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedRef = useRef(false);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.72);

  const robotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    let cancelled = false;
    let minTimer: ReturnType<typeof setTimeout> | null = null;
    let audioSafetyTimer: ReturnType<typeof setTimeout> | null = null;
    let audioDone = false;
    let minDone = false;

    const clearFinishWatch = () => {
      if (finishWatchRef.current) {
        clearInterval(finishWatchRef.current);
        finishWatchRef.current = null;
      }
    };

    const goNext = async () => {
      if (cancelled || navigatedRef.current) return;
      if (!audioDone || !minDone) return;
      navigatedRef.current = true;

      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (cancelled) return;
        if (token) {
          router.replace("/(tabs)");
          return;
        }
        const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        if (cancelled) return;
        router.replace(seen === "1" ? "/login" : "/onboarding");
      } catch {
        if (!cancelled) router.replace("/onboarding");
      }
    };

    async function run() {
      opacity.value = withTiming(1, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: 1100,
        easing: Easing.out(Easing.cubic),
      });

      lottieRef.current?.play();

      minTimer = setTimeout(() => {
        minDone = true;
        void goNext();
      }, SPLASH_MIN_MS);

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          interruptionMode: "duckOthers",
        });

        const player = createAudioPlayer(WELCOME_AUDIO, { downloadFirst: true });
        if (cancelled) {
          player.release();
          return;
        }
        playerRef.current = player;
        player.play();

        clearFinishWatch();
        finishWatchRef.current = setInterval(() => {
          try {
            const duration = player.duration ?? 0;
            const current = player.currentTime ?? 0;
            if (duration > 0 && current >= duration - 0.12) {
              clearFinishWatch();
              audioDone = true;
              void goNext();
            }
          } catch {
            clearFinishWatch();
            audioDone = true;
            void goNext();
          }
        }, 200);

        audioSafetyTimer = setTimeout(() => {
          audioDone = true;
          void goNext();
        }, SPLASH_MIN_MS + 2500);
      } catch {
        audioDone = true;
        void goNext();
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (minTimer) clearTimeout(minTimer);
      if (audioSafetyTimer) clearTimeout(audioSafetyTimer);
      clearFinishWatch();
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.pause();
          player.release();
        } catch {
          // ignore
        }
      }
    };
  }, [opacity, scale]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.robotWrap, robotStyle]}>
        <LottieView
          ref={lottieRef}
          source={AI_ROBOT_LOTTIE}
          autoPlay
          loop
          style={styles.lottie}
        />
      </Animated.View>

      <Text style={styles.brand}>
        <Text style={styles.brandYay}>yay</Text>
        <Text style={styles.brandTalk}>talk</Text>
      </Text>
      <Text style={styles.tagline}>Welcome to our English app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#2A84F8",
    alignItems: "center",
    justifyContent: "center",
  },
  robotWrap: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: 260,
    height: 260,
  },
  brand: {
    marginTop: 8,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandYay: {
    color: "#FFFFFF",
  },
  brandTalk: {
    color: "#FDE047",
  },
  tagline: {
    marginTop: 10,
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
  },
});
