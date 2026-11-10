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

type VoiceReactiveOrbProps = {
  /** true while user is talking / AI is speaking */
  active: boolean;
  /** Live energy 0..1 from mic metering (or simulated fallback) */
  level?: number;
  size?: number;
  /** Partner (teal) vs user (blue) accent */
  tone?: "partner" | "user";
};

/**
 * Clean voice orb — scales and ripples with live level.
 * When metering is flat but `active`, a soft pulse still shows so the UI feels alive.
 */
export function VoiceReactiveOrb({
  active,
  level = 0,
  size = 168,
  tone = "partner",
}: VoiceReactiveOrbProps) {
  const levelSV = useSharedValue(0);
  const pulse = useSharedValue(1);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);

  const core = tone === "user" ? "#2563EB" : "#0891B2";
  const soft = tone === "user" ? "rgba(37, 99, 235, 0.22)" : "rgba(8, 145, 178, 0.22)";
  const ring = tone === "user" ? "rgba(37, 99, 235, 0.45)" : "rgba(34, 211, 238, 0.5)";

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, level));
    levelSV.value = withSpring(active ? Math.max(clamped, active ? 0.18 : 0) : 0, {
      damping: 14,
      stiffness: 220,
      mass: 0.28,
    });
  }, [active, level, levelSV]);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1.06, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      ringA.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      ringB.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      // Stagger second ring by resetting after a short delay via timing offset
      ringB.value = 0;
      ringB.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      cancelAnimation(ringA);
      cancelAnimation(ringB);
      pulse.value = withTiming(1, { duration: 200 });
      ringA.value = withTiming(0, { duration: 200 });
      ringB.value = withTiming(0, { duration: 200 });
      levelSV.value = withTiming(0, { duration: 200 });
    }
  }, [active, levelSV, pulse, ringA, ringB]);

  const coreStyle = useAnimatedStyle(() => {
    const boost = interpolate(levelSV.value, [0, 1], [0, 0.42]);
    return {
      transform: [{ scale: pulse.value + boost }],
    };
  });

  const ringAStyle = useAnimatedStyle(() => ({
    opacity: active ? interpolate(ringA.value, [0, 0.2, 1], [0.55, 0.35, 0]) : 0,
    transform: [
      {
        scale: interpolate(ringA.value, [0, 1], [1, 1.55]) + levelSV.value * 0.2,
      },
    ],
  }));

  const ringBStyle = useAnimatedStyle(() => ({
    opacity: active ? interpolate(ringB.value, [0, 0.25, 1], [0.4, 0.25, 0]) : 0,
    transform: [
      {
        scale: interpolate(ringB.value, [0, 1], [1, 1.85]) + levelSV.value * 0.15,
      },
    ],
  }));

  const barHeights = [0.35, 0.55, 0.9, 0.6, 0.4] as const;

  return (
    <View style={[styles.wrap, { width: size * 1.7, height: size * 1.7 }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.ripple,
          ringAStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ring,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ripple,
          ringBStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ring,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.core,
          coreStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: soft,
            borderColor: core,
          },
        ]}
      >
        <View style={[styles.inner, { backgroundColor: core, width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31 }]}>
          <View style={styles.bars}>
            {barHeights.map((base, index) => (
              <VoiceBar key={index} base={base} level={level} active={active} />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function VoiceBar({
  base,
  level,
  active,
}: {
  base: number;
  level: number;
  active: boolean;
}) {
  const h = useSharedValue(8);

  useEffect(() => {
    const target = active ? 8 + (10 + base * 28) * Math.max(level, 0.2) : 8;
    h.value = withSpring(target, { damping: 12, stiffness: 260, mass: 0.2 });
  }, [active, base, h, level]);

  const style = useAnimatedStyle(() => ({
    height: h.value,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  bars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
});
