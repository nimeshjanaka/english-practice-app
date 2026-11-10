import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOKEN_KEY } from "../src/constants/api";
import {
  APP_NAME,
  APP_NAME_PREFIX,
  APP_NAME_SUFFIX,
} from "../src/constants/brand";
import { ONBOARDING_SEEN_KEY } from "../src/constants/onboarding";

/** Keep the native indigo splash visible until this screen is ready. */
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const SPLASH_ROBOT_IMAGE = require("../assets/images/ai-tutor-robot.png");
const LOCAL_ROBOT_LOTTIE = require("../assets/lottie/ai-robot.json");
const WELCOME_AUDIO = require("../assets/audio/welcome.m4a");

const SPLASH_MAX_MS = 3200;
const ANIMATION_MS = 1200;

/**
 * Branded Speakora splash — robot image + Lottie motion on indigo gradient.
 */
export default function AppSplashScreen() {
  const insets = useSafeAreaInsets();
  const lottieRef = useRef<LottieView>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const finishWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedRef = useRef(false);
  const [useLottie, setUseLottie] = useState(true);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.78);
  const ring = useSharedValue(0);
  const floatY = useSharedValue(0);

  const robotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 - ring.value * 0.45,
    transform: [{ scale: 1 + ring.value * 0.55 }],
  }));

  const ringBStyle = useAnimatedStyle(() => ({
    opacity: 0.4 - ring.value * 0.35,
    transform: [{ scale: 1.08 + ring.value * 0.7 }],
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
      await SplashScreen.hideAsync().catch(() => undefined);

      opacity.value = withTiming(1, {
        duration: 850,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      floatY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring.value = withDelay(
        200,
        withRepeat(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );

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
            if (!player.playing) {
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

        setTimeout(() => {
          clearFinishWatch();
          audioDone = true;
          void goNext();
        }, SPLASH_MAX_MS - 200);
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
      cancelAnimation(floatY);
      cancelAnimation(ring);
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
  }, [floatY, opacity, ring, scale]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["#1E1B4B", "#312E81", "#4338CA"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} />

      <Animated.View style={[styles.robotWrap, robotStyle]}>
        <Animated.View style={[styles.pulseRing, ringStyle]} />
        <Animated.View style={[styles.pulseRing, ringBStyle]} />

        <Image
          source={SPLASH_ROBOT_IMAGE}
          style={styles.robotImage}
          resizeMode="cover"
          accessibilityLabel={`${APP_NAME} robot tutor`}
        />

        {useLottie ? (
          <LottieView
            ref={lottieRef}
            source={LOCAL_ROBOT_LOTTIE}
            autoPlay
            loop
            style={styles.lottie}
            onAnimationFailure={() => setUseLottie(false)}
          />
        ) : null}
      </Animated.View>

      <Text style={styles.brand} accessibilityLabel={APP_NAME}>
        <Text style={styles.brandPrefix}>{APP_NAME_PREFIX}</Text>
        <Text style={styles.brandSuffix}>{APP_NAME_SUFFIX}</Text>
      </Text>
      <Text style={styles.tagline}>Speak English with confidence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#312E81",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(129, 140, 248, 0.28)",
  },
  robotWrap: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    borderColor: "rgba(199, 210, 254, 0.55)",
  },
  robotImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "#EEF2FF",
  },
  lottie: {
    position: "absolute",
    width: 260,
    height: 260,
    opacity: 0.42,
  },
  brand: {
    marginTop: 22,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandPrefix: {
    color: "#FFFFFF",
  },
  brandSuffix: {
    color: "#FDE047",
  },
  tagline: {
    marginTop: 10,
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
  },
});
