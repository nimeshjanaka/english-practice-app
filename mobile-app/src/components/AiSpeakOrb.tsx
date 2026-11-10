import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from "react-native-svg";

type AiSpeakOrbProps = {
  /** true while AI or user voice is active */
  active: boolean;
  /**
   * Live voice energy 0..1 (from mic metering or AI speak simulation).
   * When provided while active, the orb reacts to loudness in real time.
   */
  level?: number;
  size?: number;
};

/**
 * Always-visible teal orb.
 * Idle = still image. Active = reacts to `level` (your voice / AI voice).
 */
export function AiSpeakOrb({ active, level = 0, size = 240 }: AiSpeakOrbProps) {
  const pulse = useSharedValue(1);
  const spin = useSharedValue(0);
  const glow = useSharedValue(0.5);
  const swirlOpacity = useSharedValue(0.28);
  const levelSV = useSharedValue(0);

  // Follow live voice level smoothly
  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, level));
    levelSV.value = withSpring(active ? clamped : 0, {
      damping: 16,
      stiffness: 180,
      mass: 0.35,
    });
  }, [active, level, levelSV]);

  useEffect(() => {
    if (active) {
      // Continuous spin while anyone is talking
      spin.value = withRepeat(
        withTiming(1, {
          duration: 3200,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      // Soft fallback pulse under the level-driven scale
      pulse.value = withRepeat(
        withTiming(1.04, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
      glow.value = withRepeat(
        withTiming(0.85, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
      swirlOpacity.value = withRepeat(
        withTiming(0.6, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      cancelAnimation(spin);
      cancelAnimation(glow);
      cancelAnimation(swirlOpacity);
      pulse.value = withTiming(1, { duration: 250 });
      spin.value = withTiming(0.08, { duration: 250 });
      glow.value = withTiming(0.48, { duration: 250 });
      swirlOpacity.value = withTiming(0.28, { duration: 250 });
      levelSV.value = withTiming(0, { duration: 250 });
    }
  }, [active, glow, levelSV, pulse, spin, swirlOpacity]);

  const shellStyle = useAnimatedStyle(() => {
    // Louder voice → bigger orb (1.0 → ~1.28)
    const voiceBoost = interpolate(levelSV.value, [0, 1], [0, 0.28]);
    return {
      transform: [{ scale: pulse.value + voiceBoost }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const voiceGlow = interpolate(levelSV.value, [0, 1], [0, 0.45]);
    const voiceScale = interpolate(levelSV.value, [0, 1], [0, 0.18]);
    return {
      opacity: Math.min(1, glow.value + voiceGlow),
      transform: [
        {
          scale: interpolate(glow.value, [0.48, 0.85], [0.98, 1.08]) + voiceScale,
        },
      ],
    };
  });

  const swirlStyle = useAnimatedStyle(() => ({
    opacity: swirlOpacity.value + levelSV.value * 0.25,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const swirlBStyle = useAnimatedStyle(() => ({
    opacity: swirlOpacity.value * 0.85 + levelSV.value * 0.2,
    transform: [{ rotate: `${-spin.value * 360}deg` }],
  }));

  const half = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.outerRing,
          ringStyle,
          { width: size, height: size, borderRadius: half },
        ]}
      />

      <Animated.View
        style={[
          styles.shell,
          shellStyle,
          {
            width: size * 0.86,
            height: size * 0.86,
            borderRadius: size * 0.43,
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="orbCore" cx="50%" cy="42%" r="58%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="22%" stopColor="#E0F2FE" stopOpacity="1" />
              <Stop offset="45%" stopColor="#67E8F9" stopOpacity="0.98" />
              <Stop offset="72%" stopColor="#0E7490" stopOpacity="1" />
              <Stop offset="100%" stopColor="#083344" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Circle cx="100" cy="100" r="98" fill="url(#orbCore)" />
        </Svg>

        <Animated.View style={[styles.swirlLayer, swirlStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Ellipse
              cx="100"
              cy="72"
              rx="68"
              ry="30"
              fill="#A5F3FC"
              opacity={0.55}
              transform="rotate(-16 100 100)"
            />
            <Ellipse
              cx="126"
              cy="122"
              rx="58"
              ry="26"
              fill="#22D3EE"
              opacity={0.4}
              transform="rotate(48 100 100)"
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.swirlLayer, swirlBStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Ellipse
              cx="74"
              cy="118"
              rx="56"
              ry="24"
              fill="#ECFEFF"
              opacity={0.4}
              transform="rotate(78 100 100)"
            />
            <Ellipse
              cx="112"
              cy="80"
              rx="44"
              ry="20"
              fill="#67E8F9"
              opacity={0.45}
              transform="rotate(-52 100 100)"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "rgba(34, 211, 238, 0.65)",
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    shadowColor: "#06B6D4",
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  shell: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0E7490",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  swirlLayer: {
    ...StyleSheet.absoluteFill,
  },
});
