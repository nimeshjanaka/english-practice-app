import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
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

/**
 * Placeholder robot animation. Swap this URL for the final YayTalk Lottie file.
 * The bundled robot is used if the URL cannot be downloaded.
 */
const PLACEHOLDER_ROBOT_LOTTIE = "https://assets1.lottiefiles.com/packages/lf20_1pxqjqps.json";
const LOCAL_ROBOT_LOTTIE = require("../assets/lottie/ai-robot.json");
const WELCOME_AUDIO = require("../assets/audio/welcome.m4a");

const SPLASH_MAX_MS = 3000;
const ANIMATION_MS = 1100;

/**
 * Entry splash. Playback uses expo-audio because expo-av is not available in this Expo SDK.
 */
export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const lottieRef = useRef<LottieView>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const finishWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedRef = useRef(false);
  const [lottieSource, setLottieSource] = useState<{ uri: string } | number>({
    uri: PLACEHOLDER_ROBOT_LOTTIE,
  });

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.72);

  const robotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    let cancelled = false;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let animationTimer: ReturnType<typeof setTimeout> | null = null;
    let audioDone = false;
    let animationDone = false;
    let forced = false;

    const clearFinishWatch = () => {
      if (finishWatchRef.current) {
        clearInterval(finishWatchRef.current);
        finishWatchRef.current = null;
      }
    };

    const goNext = async () => {
      if (cancelled || navigatedRef.current) return;
      const introFinished = animationDone && audioDone;
      if (!introFinished && !forced) return;
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
        router.replace(seen === "1" ? "/login" : "/onboarding/welcome");
      } catch {
        if (!cancelled) router.replace("/onboarding/welcome");
      }
    };

    async function run() {
      opacity.value = withTiming(1, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      lottieRef.current?.play();

      animationTimer = setTimeout(() => {
        animationDone = true;
        void goNext();
      }, ANIMATION_MS);

      maxTimer = setTimeout(() => {
        forced = true;
        void goNext();
      }, SPLASH_MAX_MS);

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
      } catch {
        audioDone = true;
        void goNext();
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (maxTimer) clearTimeout(maxTimer);
      if (animationTimer) clearTimeout(animationTimer);
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
          source={lottieSource}
          autoPlay
          loop
          style={styles.lottie}
          onAnimationFailure={() => setLottieSource(LOCAL_ROBOT_LOTTIE)}
        />
      </Animated.View>

      <Text style={styles.brand}>
        <Text style={styles.brandYay}>yay</Text>
        <Text style={styles.brandTalk}>talk</Text>
      </Text>
      <Text style={styles.tagline}>Welcome to YayTalk</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#4A55E1",
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
