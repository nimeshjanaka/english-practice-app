import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { Mic, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api, { axios } from "../../../src/api";
import { LearningPathButton, goToLearningPath } from "../../../src/components/LearningPathButton";
import { SettingsButton } from "../../../src/components/SettingsButton";
import { getApiBaseUrl, speakingSessionEndPath } from "../../../src/constants/api";

/** Speaking practice ends after 3 minutes. */
const SESSION_SECONDS = 3 * 60;

type Bubble = {
  id: string;
  role: "user" | "ai";
  text: string;
  grammar?: string;
};

type SpeakingReply = {
  user_transcript: string;
  ai_reply_text: string;
  grammar_correction: string;
  ai_audio_url: string;
};

function audioFile(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.includes(".wav")) return { uri, type: "audio/wav", name: "speech.wav" };
  if (lower.includes(".webm")) return { uri, type: "audio/webm", name: "speech.webm" };
  return { uri, type: "audio/mp4", name: "speech.m4a" };
}

function playableUrl(audioUrl: string): string {
  try {
    const parsed = new URL(audioUrl);
    const base = new URL(getApiBaseUrl());
    parsed.protocol = base.protocol;
    parsed.hostname = base.hostname;
    parsed.port = base.port;
    return parsed.toString();
  } catch {
    return audioUrl;
  }
}

function grammarTooltip(said: string, correction: string): string {
  const tip = correction.trim();
  if (!tip) return "";
  if (/you said|correction:/i.test(tip)) return tip;
  return `You said: ${said}. Correction: ${tip}`;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Lesson speaking practice — 3-minute timed session, then return to the unit path.
 */
export default function SpeakScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = String(id);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const endingRef = useRef(false);
  const openRequestRef = useRef(0);

  const [messages, setMessages] = useState<Bubble[]>([]);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pulse = useSharedValue(1);
  const ripple = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);

  const closeSession = useCallback(async (): Promise<boolean> => {
    const sessionId = sessionRef.current;
    sessionRef.current = null;
    if (!sessionId) return false;
    try {
      const response = await api.post<{
        session_id: string;
        duration_seconds: number;
        lesson_completed?: boolean;
      }>(speakingSessionEndPath(sessionId), {});
      return Boolean(response.data?.lesson_completed);
    } catch {
      // Best-effort progress write.
      return false;
    }
  }, []);

  const startSession = useCallback(async () => {
    const requestId = ++openRequestRef.current;
    setStarting(true);
    setError(null);
    setReady(false);
    try {
      const response = await api.post<{ session_id: string }>("/api/v1/speaking/sessions", {
        lesson_id: Number(lessonId),
      });
      if (openRequestRef.current !== requestId) return;
      sessionRef.current = response.data.session_id;
      setReady(true);
      setStarting(false);
    } catch (err) {
      if (openRequestRef.current !== requestId) return;
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      const detail =
        axios.isAxiosError(err) && typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : null;
      setReady(false);
      setStarting(false);
      setError(detail || "Could not start a speaking session. Tap Retry or return to your path.");
    }
  }, [lessonId]);

  const finishSession = useCallback(async () => {
    if (endingRef.current || finished) return;
    endingRef.current = true;
    setFinished(true);
    setRecording(false);
    setSending(false);
    setStarting(false);
    setFinishing(true);
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {
      // ignore
    }
    const unlocked = await closeSession();
    setLessonCompleted(unlocked);
    setFinishing(false);
  }, [closeSession, finished, recorder]);

  useEffect(() => {
    endingRef.current = false;
    void startSession();
    return () => {
      openRequestRef.current += 1;
      cancelAnimation(pulse);
      cancelAnimation(ripple);
      cancelAnimation(rippleOpacity);
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.pause();
        player?.release();
      } catch {
        // ignore
      }
      if (!endingRef.current) {
        const sessionId = sessionRef.current;
        sessionRef.current = null;
        if (sessionId) {
          void api.post(speakingSessionEndPath(sessionId), {}).catch(() => undefined);
        }
      }
    };
    // Only restart when the lesson changes — not on Reanimated shared value identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, startSession]);

  // Timer runs on screen open so the user always sees countdown progress.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (secondsLeft <= 0 && !finished) {
      void finishSession();
    }
  }, [secondsLeft, finished, finishSession]);

  useEffect(() => {
    if (recording && !finished) {
      pulse.value = withRepeat(
        withTiming(1.18, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      ripple.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.85, { duration: 900, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      rippleOpacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 0 }),
          withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      cancelAnimation(ripple);
      cancelAnimation(rippleOpacity);
      pulse.value = withTiming(1, { duration: 160 });
      ripple.value = withTiming(1, { duration: 160 });
      rippleOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [recording, finished, pulse, ripple, rippleOpacity]);

  useEffect(() => {
    if (messages.length === 0 && !finished) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, sending, finished]);

  const micPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: ripple.value }],
  }));

  async function playReply(audioUrl: string) {
    if (!audioUrl || finished) return;
    const current = playerRef.current;
    playerRef.current = null;
    try {
      current?.pause();
      current?.release();
    } catch {
      // ignore
    }
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: "duckOthers",
    });
    const player = createAudioPlayer({ uri: playableUrl(audioUrl) }, { downloadFirst: true });
    playerRef.current = player;
    player.play();
  }

  async function startRecording() {
    if (!ready || sending || recording || finished || starting) return;
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone needed", "Allow the microphone so you can practice speaking.");
      return;
    }
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "duckOthers",
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch {
      setError("Could not start recording.");
    }
  }

  async function stopAndSend() {
    if (!recording || finished) return;
    setRecording(false);
    setSending(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const sessionId = sessionRef.current;
      if (!uri || !sessionId) {
        setError("No audio was captured. Hold the microphone and speak.");
        return;
      }

      const form = new FormData();
      form.append("audio", audioFile(uri) as unknown as Blob);

      const response = await api.post<SpeakingReply>(
        `/api/v1/speaking/sessions/${sessionId}/messages`,
        form,
        {
          timeout: 120_000,
          headers: { Accept: "application/json" },
          transformRequest: [
            (data, headers) => {
              if (headers) {
                delete headers["Content-Type"];
                delete headers["content-type"];
              }
              return data;
            },
          ],
        },
      );

      const data = response.data;
      const stamp = Date.now().toString();
      const tip = grammarTooltip(data.user_transcript, data.grammar_correction);

      setMessages((current) => [
        ...current,
        {
          id: `${stamp}-user`,
          role: "user",
          text: data.user_transcript,
          grammar: tip || undefined,
        },
        {
          id: `${stamp}-ai`,
          role: "ai",
          text: data.ai_reply_text,
        },
      ]);

      await playReply(data.ai_audio_url);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      setError("Could not send that recording.");
    } finally {
      setSending(false);
    }
  }

  function returnToUnit() {
    goToLearningPath();
  }

  const timerExpired = secondsLeft <= 0;
  const hint = finished
    ? "Speaking time is over"
    : starting
      ? "Starting session…"
      : !ready
        ? "Tap Retry to start speaking"
        : recording
          ? "Release to send"
          : sending
            ? "Sending…"
            : "Hold to speak";

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#EEF3FF", "#F8FAFC", "#FFFFFF"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.nav, { paddingTop: insets.top + 6 }]}>
        <LearningPathButton labeled />
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Speaking</Text>
          <Text style={styles.navSubtitle}>3-minute practice · then back to unit</Text>
        </View>
        <SettingsButton />
      </View>

      <View style={[styles.timerBar, (timerExpired || finished) && styles.timerBarDone]}>
        <Text style={styles.timerBarLabel}>Time left</Text>
        <Text style={[styles.timerBarValue, (timerExpired || finished) && styles.timerBarValueDone]}>
          {formatClock(secondsLeft)}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={[styles.threadContent, { paddingBottom: 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !finished ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Sparkles color="#2563EB" size={22} />
            </View>
            <Text style={styles.emptyTitle}>Practice out loud</Text>
            <Text style={styles.emptyBody}>
              Hold the microphone and speak for up to 3 minutes. When you finish, you return to your
              unit and the next lesson unlocks.
            </Text>
          </View>
        ) : null}

        {messages.map((message) => (
          <View
            key={message.id}
            style={message.role === "user" ? styles.userWrap : styles.aiWrap}
          >
            {message.role === "ai" ? <Text style={styles.aiLabel}>Tutor</Text> : null}
            <View
              style={[
                styles.bubble,
                message.role === "user" ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text style={[styles.bubbleText, message.role === "user" && styles.userText]}>
                {message.text}
              </Text>
            </View>
            {message.role === "user" && message.grammar ? (
              <View style={styles.grammarTip}>
                <Text style={styles.grammarTipLabel}>Grammar tip</Text>
                <Text style={styles.grammarTipText}>{message.grammar}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {sending ? (
          <View style={styles.aiWrap}>
            <View style={[styles.bubble, styles.aiBubble, styles.thinking]}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.thinkingText}>Listening…</Text>
            </View>
          </View>
        ) : null}

        {finished ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>
              {lessonCompleted ? "Lesson complete" : "Speaking complete"}
            </Text>
            <Text style={styles.doneBody}>
              {lessonCompleted
                ? "Nice work. Return to your unit — the next lesson is unlocked."
                : "Speaking finished. Finish every exercise in this lesson first if the next node is still locked."}
            </Text>
            {finishing ? (
              <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />
            ) : (
              <Pressable style={styles.nextBtn} onPress={returnToUnit}>
                <Text style={styles.nextBtnText}>Back to unit</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        {!finished ? (
          <>
            <View style={styles.micStage}>
              <Animated.View style={[styles.ripple, rippleStyle]} />
              <Animated.View style={micPulseStyle}>
                <Pressable
                  disabled={!ready || sending || starting}
                  onPressIn={() => void startRecording()}
                  onPressOut={() => void stopAndSend()}
                  style={[
                    styles.mic,
                    recording && styles.micOn,
                    (!ready || sending || starting) && styles.micDisabled,
                  ]}
                  accessibilityLabel="Hold to speak"
                >
                  {sending || starting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Mic color="#FFFFFF" size={30} strokeWidth={2.4} />
                  )}
                </Pressable>
              </Animated.View>
            </View>
            <Text style={styles.hint}>{hint}</Text>

            {!ready && !starting ? (
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  void startSession();
                }}
              >
                <Text style={styles.retryBtnText}>Retry speaking session</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.finishEarlyBtn}
              disabled={sending || recording || starting}
              onPress={() => {
                void finishSession();
              }}
            >
              <Text style={styles.finishEarlyText}>Finish & continue</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.hint}>Speaking time is over</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  navCenter: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  navTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  navSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "#64748B" },
  timerBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 5,
  },
  timerBarDone: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  timerBarLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },
  timerBarValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D4ED8",
    fontVariant: ["tabular-nums"],
  },
  timerBarValueDone: { color: "#15803D" },
  thread: { flex: 1 },
  threadContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  emptyCard: {
    marginTop: 28,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyBody: {
    textAlign: "center",
    color: "#64748B",
    lineHeight: 21,
    fontSize: 14,
    fontWeight: "500",
  },
  userWrap: { alignItems: "flex-end" },
  aiWrap: { alignItems: "flex-start" },
  aiLabel: {
    marginLeft: 6,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: "#64748B",
    textTransform: "uppercase",
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomLeftRadius: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 23,
    color: "#0F172A",
    fontWeight: "500",
  },
  userText: { color: "#FFFFFF", fontWeight: "600" },
  grammarTip: {
    marginTop: 8,
    maxWidth: "84%",
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grammarTipLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: "#92400E",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  grammarTipText: {
    color: "#78350F",
    lineHeight: 20,
    fontSize: 13,
    fontWeight: "600",
  },
  thinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  thinkingText: { color: "#475569", fontWeight: "600" },
  doneCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    padding: 18,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 6,
  },
  doneBody: {
    color: "#3F6212",
    lineHeight: 20,
    fontWeight: "500",
  },
  nextBtn: {
    marginTop: 14,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  micStage: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FCA5A5",
  },
  mic: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  micOn: { backgroundColor: "#DC2626" },
  micDisabled: { opacity: 0.45 },
  hint: {
    marginTop: 2,
    textAlign: "center",
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  finishEarlyBtn: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  finishEarlyText: {
    color: "#1D4ED8",
    fontWeight: "800",
    fontSize: 14,
  },
});
