import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from "expo-audio";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ArrowLeft, LogOut, Mic } from "lucide-react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api, { axios } from "../../src/api";
import { VoiceReactiveOrb } from "../../src/components/VoiceReactiveOrb";
import { AI_CHAT_PATH, AI_SPEAK_PATH, getApiBaseUrl } from "../../src/constants/api";
import {
  ROLE_PLAY_SECONDS,
  buildRoleContext,
  getRolePlay,
} from "../../src/constants/rolePlays";

/** AAC/M4A — Groq Whisper rejects CAF / unknown formats. */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: ".m4a",
  isMeteringEnabled: true,
  numberOfChannels: 1,
  sampleRate: 44100,
  bitRate: 128000,
};

type Phase = "ready" | "active" | "finished";

type Bubble = {
  id: string;
  role: "user" | "partner";
  text: string;
  tip?: string;
};

type ChatApiResponse = {
  transcript: string;
  reply: string;
  grammar_correction: string;
  audio_url: string;
};

type SpeakApiResponse = {
  text: string;
  audio_url: string;
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function meteringToLevel(db: number | undefined): number {
  if (db == null || !Number.isFinite(db)) return 0;
  const clamped = Math.max(-50, Math.min(0, db));
  return (clamped + 50) / 50;
}

function resolveAudioUrl(audioUrl: string): string {
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

function audioUploadFromUri(uri: string): { uri: string; type: string; name: string } {
  const lower = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();
  if (lower.endsWith(".wav")) return { uri, type: "audio/wav", name: "speech.wav" };
  if (lower.endsWith(".webm")) return { uri, type: "audio/webm", name: "speech.webm" };
  if (lower.endsWith(".mp3")) return { uri, type: "audio/mpeg", name: "speech.mp3" };
  if (lower.endsWith(".ogg") || lower.endsWith(".oga")) {
    return { uri, type: "audio/ogg", name: "speech.ogg" };
  }
  // Always label as m4a for AAC recordings (including URIs without an extension).
  return { uri, type: "audio/m4a", name: "speech.m4a" };
}

/**
 * Two-person role-play voice chat — 4-minute timer, hold-to-talk, reactive orb.
 */
export default function RolePlayChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scenario = getRolePlay(String(id ?? ""));

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 40);

  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(ROLE_PLAY_SECONDS);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [partnerSpeaking, setPartnerSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const holdingRef = useRef(false);
  const recordStartedAtRef = useRef(0);
  const speakWaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simWaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roleContext = scenario ? buildRoleContext(scenario) : "";

  const clearSpeakWave = useCallback(() => {
    if (speakWaveRef.current) {
      clearInterval(speakWaveRef.current);
      speakWaveRef.current = null;
    }
  }, []);

  const clearSimWave = useCallback(() => {
    if (simWaveRef.current) {
      clearInterval(simWaveRef.current);
      simWaveRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    clearSpeakWave();
    const player = playerRef.current;
    playerRef.current = null;
    try {
      player?.pause();
      player?.release();
    } catch {
      // ignore
    }
    setPartnerSpeaking(false);
    setVoiceLevel(0);
  }, [clearSpeakWave]);

  const playPartnerAudio = useCallback(
    async (audioUrl: string, spokenText: string) => {
      await stopPlayback();
      setPartnerSpeaking(true);

      const words = spokenText.trim().split(/\s+/).filter(Boolean).length;
      const fallbackMs = Math.min(10_000, Math.max(2200, Math.round((words / 2.4) * 1000)));
      let tick = 0;
      speakWaveRef.current = setInterval(() => {
        tick += 1;
        setVoiceLevel(0.35 + 0.45 * Math.abs(Math.sin(tick / 3)));
      }, 80);

      if (!audioUrl) {
        setTimeout(() => {
          clearSpeakWave();
          setPartnerSpeaking(false);
          setVoiceLevel(0);
        }, fallbackMs);
        return;
      }

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          interruptionMode: "duckOthers",
        });
        const player = createAudioPlayer(
          { uri: resolveAudioUrl(audioUrl) },
          { downloadFirst: true },
        );
        playerRef.current = player;
        player.play();

        const watch = setInterval(() => {
          if (!player.playing) {
            clearInterval(watch);
            clearSpeakWave();
            setPartnerSpeaking(false);
            setVoiceLevel(0);
            void setAudioModeAsync({
              playsInSilentMode: true,
              allowsRecording: true,
              interruptionMode: "duckOthers",
            });
          }
        }, 200);

        setTimeout(() => {
          clearInterval(watch);
          clearSpeakWave();
          setPartnerSpeaking(false);
          setVoiceLevel(0);
        }, 45_000);
      } catch {
        setTimeout(() => {
          clearSpeakWave();
          setPartnerSpeaking(false);
          setVoiceLevel(0);
        }, fallbackMs);
      }
    },
    [clearSpeakWave, stopPlayback],
  );

  // Live mic metering → orb level; simulate if metering is unavailable
  useEffect(() => {
    if (!(holding || recorderState.isRecording)) {
      clearSimWave();
      if (!partnerSpeaking && !sending) setVoiceLevel(0);
      return;
    }

    const fromMeter = meteringToLevel(recorderState.metering);
    if (fromMeter > 0.05) {
      clearSimWave();
      setVoiceLevel(Math.max(0.2, fromMeter));
      return;
    }

    // Metering missing/flat — keep the orb visibly reacting while held
    if (!simWaveRef.current) {
      let tick = 0;
      simWaveRef.current = setInterval(() => {
        tick += 1;
        setVoiceLevel(0.28 + 0.5 * Math.abs(Math.sin(tick / 2.4)));
      }, 70);
    }
  }, [
    clearSimWave,
    holding,
    partnerSpeaking,
    recorderState.isRecording,
    recorderState.metering,
    sending,
  ]);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, sending, partnerSpeaking]);

  // Session countdown
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "active" && secondsLeft <= 0) {
      setPhase("finished");
      holdingRef.current = false;
      setHolding(false);
      void stopPlayback();
      try {
        if (audioRecorder.isRecording) void audioRecorder.stop();
      } catch {
        // ignore
      }
    }
  }, [audioRecorder, phase, secondsLeft, stopPlayback]);

  useEffect(() => {
    return () => {
      clearSpeakWave();
      clearSimWave();
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.pause();
        player?.release();
      } catch {
        // ignore
      }
    };
  }, [clearSimWave, clearSpeakWave]);

  const exitRolePlay = useCallback(async () => {
    holdingRef.current = false;
    setHolding(false);
    clearSimWave();
    await stopPlayback();
    try {
      if (audioRecorder.isRecording) await audioRecorder.stop();
    } catch {
      // ignore
    }
    router.replace("/(tabs)/role-plays");
  }, [audioRecorder, clearSimWave, stopPlayback]);

  if (!scenario) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Role play not found.</Text>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  async function startSession() {
    if (!scenario) return;
    const opening = scenario.openingLine;
    setError(null);
    setMessages([]);
    setSecondsLeft(ROLE_PLAY_SECONDS);
    setPhase("active");

    const stamp = Date.now().toString();
    setMessages([
      {
        id: `${stamp}-partner`,
        role: "partner",
        text: opening,
      },
    ]);

    // Best-effort TTS for the partner's opening line
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone needed", "Allow the microphone for this voice role play.");
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "duckOthers",
      });

      const form = new FormData();
      form.append("text", opening);
      const response = await api.post<SpeakApiResponse>(AI_SPEAK_PATH, form, {
        timeout: 60_000,
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
      });
      await playPartnerAudio(response.data.audio_url, response.data.text || opening);
    } catch {
      // Text-only opening is fine if TTS is unavailable
      setPartnerSpeaking(true);
      setVoiceLevel(0.4);
      setTimeout(() => {
        setPartnerSpeaking(false);
        setVoiceLevel(0);
      }, 2800);
    }
  }

  async function beginHold() {
    if (phase !== "active" || sending || partnerSpeaking || holdingRef.current) return;
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone needed", "Allow the microphone so you can speak.");
      return;
    }
    try {
      await stopPlayback();
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "duckOthers",
      });
      // Pass the full preset — a partial options object drops .m4a / AAC settings.
      await audioRecorder.prepareToRecordAsync(RECORDING_OPTIONS);
      audioRecorder.record();
      holdingRef.current = true;
      recordStartedAtRef.current = Date.now();
      setHolding(true);
      // Kick the orb immediately even before the first metering sample
      setVoiceLevel(0.32);
    } catch {
      holdingRef.current = false;
      setHolding(false);
      setError("Could not start the microphone.");
    }
  }

  async function endHold() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    clearSimWave();

    const elapsed = Date.now() - recordStartedAtRef.current;
    setSending(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri || elapsed < 450) {
        setError("Hold a little longer and speak clearly.");
        return;
      }

      const form = new FormData();
      form.append("audio", audioUploadFromUri(uri) as unknown as Blob);
      form.append("role_context", roleContext);

      const response = await api.post<ChatApiResponse>(AI_CHAT_PATH, form, {
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
      });

      const data = response.data;
      const stamp = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: `${stamp}-user`,
          role: "user",
          text: data.transcript,
          tip: data.grammar_correction?.trim() || undefined,
        },
        {
          id: `${stamp}-partner`,
          role: "partner",
          text: data.reply,
        },
      ]);
      await playPartnerAudio(data.audio_url, data.reply);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      const detail =
        axios.isAxiosError(err) && typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : null;
      setError(detail || "Could not send that. Try again.");
    } finally {
      setSending(false);
      setVoiceLevel(0);
    }
  }

  const orbActive = holding || partnerSpeaking || sending;
  const orbTone = holding || sending ? "user" : "partner";
  const timerProgress = secondsLeft / ROLE_PLAY_SECONDS;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => void exitRolePlay()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Exit role play"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {scenario.title}
          </Text>
          <Text style={styles.topMeta} numberOfLines={1}>
            You · {scenario.userRole}  ↔  {scenario.partnerRole}
          </Text>
        </View>
        {phase === "ready" ? (
          <View style={styles.topSpacer} />
        ) : (
          <Pressable
            onPress={() => void exitRolePlay()}
            style={styles.exitChip}
            accessibilityRole="button"
            accessibilityLabel="Exit"
          >
            <LogOut size={14} color="#B91C1C" />
            <Text style={styles.exitChipText}>Exit</Text>
          </Pressable>
        )}
      </View>

      {phase === "ready" ? (
        <View style={styles.readyPane}>
          <View style={styles.orbPane}>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatClock(ROLE_PLAY_SECONDS)}</Text>
            </View>
            <View style={styles.timerTrack}>
              <View style={[styles.timerFill, { flex: 1 }]} />
            </View>
            <VoiceReactiveOrb active={false} level={0} size={140} />
          </View>
          <Text style={styles.readyTitle}>4-minute voice chat</Text>
          <Text style={styles.readyBody}>
            You are the {scenario.userRole}. Your partner is the {scenario.partnerRole}. Hold the
            mic, speak naturally, and keep the conversation going until the timer ends.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => void startSession()}>
            <Text style={styles.primaryBtnText}>Start role play</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.orbPane}>
            <View style={styles.timerBadge}>
              <Text style={[styles.timerText, secondsLeft <= 30 && styles.timerUrgent]}>
                {formatClock(secondsLeft)}
              </Text>
            </View>
            <View style={styles.timerTrack}>
              <View style={[styles.timerFill, { flex: Math.max(0.001, timerProgress) }]} />
              <View style={{ flex: Math.max(0.001, 1 - timerProgress) }} />
            </View>
            <Text style={styles.speakerLabel}>
              {holding
                ? "You are speaking"
                : partnerSpeaking
                  ? `${scenario.partnerRole} is speaking`
                  : sending
                    ? "Listening…"
                    : phase === "finished"
                      ? "Time’s up"
                      : "Your turn — hold the mic"}
            </Text>
            <VoiceReactiveOrb active={orbActive} level={voiceLevel} size={150} tone={orbTone} />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const mine = msg.role === "user";
              return (
                <View
                  key={msg.id}
                  style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}
                >
                  <Text style={styles.bubbleRole}>{mine ? "You" : scenario.partnerRole}</Text>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{msg.text}</Text>
                  </View>
                  {msg.tip ? <Text style={styles.tip}>{msg.tip}</Text> : null}
                </View>
              );
            })}
            {sending ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color="#0891B2" />
                <Text style={styles.typingText}>{scenario.partnerRole} is thinking…</Text>
              </View>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {phase === "finished" ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={styles.finishedLabel}>Nice work — session complete</Text>
              <View style={styles.footerActions}>
                <Pressable
                  style={styles.exitBtn}
                  onPress={() => void exitRolePlay()}
                  accessibilityRole="button"
                  accessibilityLabel="Exit role play"
                >
                  <LogOut size={16} color="#B91C1C" />
                  <Text style={styles.exitBtnText}>Exit</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryBtnCompact}
                  onPress={() => {
                    setPhase("ready");
                    setMessages([]);
                    setSecondsLeft(ROLE_PLAY_SECONDS);
                    setError(null);
                  }}
                >
                  <Text style={styles.primaryBtnText}>Practice again</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Pressable
                onPressIn={() => void beginHold()}
                onPressOut={() => void endHold()}
                disabled={sending || partnerSpeaking}
                style={[
                  styles.micBtn,
                  holding && styles.micBtnActive,
                  (sending || partnerSpeaking) && styles.micBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Hold to talk"
              >
                <Mic size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.micHint}>
                {holding ? "Release to send" : "Hold to talk"}
              </Text>
              <Pressable
                style={styles.exitLink}
                onPress={() => void exitRolePlay()}
                accessibilityRole="button"
                accessibilityLabel="Exit chat"
              >
                <LogOut size={14} color="#64748B" />
                <Text style={styles.exitLinkText}>Exit chat</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  topSpacer: {
    width: 40,
  },
  exitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  exitChipText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  topMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  timerBadge: {
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  timerUrgent: {
    color: "#FCA5A5",
  },
  timerTrack: {
    flexDirection: "row",
    width: 168,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  timerFill: {
    backgroundColor: "#2563EB",
  },
  readyPane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  readyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  readyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  orbPane: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 4,
    gap: 10,
  },
  speakerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  chat: {
    flex: 1,
    marginTop: 4,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  bubbleWrap: {
    maxWidth: "86%",
    gap: 4,
  },
  bubbleWrapMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubbleWrapTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubbleRole: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#0F172A",
  },
  bubbleTextMine: {
    color: "#FFFFFF",
  },
  tip: {
    fontSize: 12,
    color: "#B45309",
    maxWidth: 260,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 13,
    color: "#64748B",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 6,
    color: "#B91C1C",
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 15,
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: {
    backgroundColor: "#DC2626",
    transform: [{ scale: 1.06 }],
  },
  micBtnDisabled: {
    opacity: 0.45,
  },
  micHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  finishedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: "center",
  },
  primaryBtnCompact: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  exitBtnText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "800",
  },
  exitLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  exitLinkText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
