import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
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
import { Mic } from "lucide-react-native";
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

import { AI_CHAT_PATH, getApiBaseUrl, TOKEN_KEY } from "../../src/constants/api";
import { authErrorMessage } from "../../src/lib/authSession";

const SESSION_SECONDS = 4 * 60; // 4-minute countdown

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  grammarCorrection?: string;
};

type ChatApiResponse = {
  transcript: string;
  reply: string;
  grammar_correction: string;
  audio_url: string;
  ai_talk_time_seconds: number;
};

function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Backend may return localhost; rewrite host so devices can play the MP3. */
function resolveAudioUrl(audioUrl: string): string {
  try {
    const parsed = new URL(audioUrl);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const base = new URL(getApiBaseUrl());
      parsed.protocol = base.protocol;
      parsed.hostname = base.hostname;
      parsed.port = base.port;
      return parsed.toString();
    }
  } catch {
    // Fall through and use the original URL
  }
  return audioUrl;
}

/**
 * Hold-to-talk AI practice: record with expo-audio, POST audio to /api/ai/chat,
 * show transcript + reply bubbles, play TTS, and run a 4-minute session timer.
 */
export default function LessonAiChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lessonId?: string; id?: string }>();
  const lessonId = String(params.lessonId ?? params.id ?? "");

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const startingRef = useRef(false);
  const timerExpired = secondsLeft <= 0;
  const recording = recorderState.isRecording;

  // Request mic permission + configure audio session once
  useEffect(() => {
    void (async () => {
      await AudioModule.requestRecordingPermissionsAsync();
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();

    return () => {
      playerRef.current?.release();
      playerRef.current = null;
    };
  }, []);

  // 4-minute countdown
  useEffect(() => {
    if (timerExpired) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [timerExpired]);

  const playReplyAudio = useCallback(async (audioUrl: string) => {
    try {
      playerRef.current?.release();
      playerRef.current = null;

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      const player = createAudioPlayer(resolveAudioUrl(audioUrl), {
        downloadFirst: true,
      });
      playerRef.current = player;
      player.play();
    } catch {
      // Playback failure should not block the chat UI
    }
  }, []);

  const sendRecording = useCallback(
    async (uri: string) => {
      if (!lessonId) {
        setError("Missing lesson id. Go back and open Talk with AI from a lesson.");
        return;
      }

      setSending(true);
      setError(null);

      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) {
          router.replace("/");
          return;
        }

        const formData = new FormData();
        formData.append("lesson_id", lessonId);
        formData.append("audio", {
          uri,
          type: "audio/m4a",
          name: "speech.m4a",
        } as unknown as Blob);

        const response = await axios.post<ChatApiResponse>(
          `${getApiBaseUrl()}${AI_CHAT_PATH}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            timeout: 120_000,
          },
        );

        const data = response.data;
        const stamp = Date.now().toString();
        const grammar = data.grammar_correction?.trim();

        setMessages((prev) => [
          ...prev,
          { id: `${stamp}-user`, role: "user", text: data.transcript },
          {
            id: `${stamp}-ai`,
            role: "ai",
            text: data.reply,
            grammarCorrection: grammar || undefined,
          },
        ]);

        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        });

        await playReplyAudio(data.audio_url);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          router.replace("/");
          return;
        }
        setError(authErrorMessage(err, "Could not reach the AI tutor. Try again."));
      } finally {
        setSending(false);
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      }
    },
    [lessonId, playReplyAudio],
  );

  const startRecording = useCallback(async () => {
    if (timerExpired || sending || startingRef.current || recording) {
      return;
    }

    startingRef.current = true;
    setError(null);

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone needed",
          "Allow microphone access so you can practice speaking with the AI tutor.",
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      setError("Could not start recording. Try again.");
    } finally {
      startingRef.current = false;
    }
  }, [audioRecorder, recording, sending, timerExpired]);

  const stopRecordingAndSend = useCallback(async () => {
    if (!recording && !audioRecorder.isRecording) {
      return;
    }

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        setError("No audio was captured. Hold the mic and speak, then release.");
        return;
      }
      await sendRecording(uri);
    } catch {
      setError("Could not finish recording. Try again.");
    }
  }, [audioRecorder, recording, sendRecording]);

  return (
    <>
      <Stack.Screen options={{ title: "Talk with AI", headerShown: true }} />
      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.timerBar, timerExpired && styles.timerBarExpired]}>
          <Text style={styles.timerLabel}>Session time</Text>
          <Text style={[styles.timerValue, timerExpired && styles.timerExpired]}>
            {formatTimer(secondsLeft)}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <Text style={styles.emptyHint}>
              Hold the microphone and speak. Release to send your voice to the tutor.
            </Text>
          ) : null}

          {messages.map((message) => (
            <View key={message.id} style={styles.messageBlock}>
              <View
                style={[
                  styles.bubble,
                  message.role === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleRole,
                    message.role === "user" ? styles.userRole : styles.aiRole,
                  ]}
                >
                  {message.role === "user" ? "You" : "AI Tutor"}
                </Text>
                <Text
                  style={[
                    styles.bubbleText,
                    message.role === "user" ? styles.userText : styles.aiText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>

              {message.role === "ai" && message.grammarCorrection ? (
                <View style={styles.grammarBox}>
                  <Text style={styles.grammarTitle}>Grammar tip</Text>
                  <Text style={styles.grammarText}>{message.grammarCorrection}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {sending ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>Tutor is listening…</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {timerExpired ? (
            <Text style={styles.sessionEnded}>
              Time is up for this 4-minute session. Go back and start again anytime.
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.micSection}>
          <Text style={styles.micHint}>
            {timerExpired
              ? "Session ended"
              : recording
                ? "Recording… release to send"
                : sending
                  ? "Please wait"
                  : "Press and hold to talk"}
          </Text>

          <Pressable
            onPressIn={() => {
              void startRecording();
            }}
            onPressOut={() => {
              void stopRecordingAndSend();
            }}
            disabled={timerExpired || sending}
            style={({ pressed }) => [
              styles.micButton,
              recording && styles.micButtonActive,
              (timerExpired || sending) && styles.micButtonDisabled,
              pressed && !timerExpired && !sending && styles.micButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Hold to record your voice"
          >
            <Mic color="#FFFFFF" size={40} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  timerBarExpired: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E3A8A",
    fontVariant: ["tabular-nums"],
  },
  timerExpired: {
    color: "#B91C1C",
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    flexGrow: 1,
  },
  emptyHint: {
    marginTop: 40,
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  messageBlock: {
    gap: 8,
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderBottomLeftRadius: 4,
  },
  bubbleRole: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  userRole: {
    color: "#DBEAFE",
  },
  aiRole: {
    color: "#64748B",
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#0F172A",
  },
  grammarBox: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    backgroundColor: "#FEF9C3",
    borderColor: "#FACC15",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grammarTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#A16207",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  grammarText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#713F12",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  loadingText: {
    color: "#2563EB",
    fontWeight: "600",
  },
  error: {
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    overflow: "hidden",
  },
  sessionEnded: {
    color: "#B91C1C",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 8,
  },
  micSection: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  micHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  micButtonActive: {
    backgroundColor: "#DC2626",
    transform: [{ scale: 1.06 }],
  },
  micButtonPressed: {
    opacity: 0.92,
  },
  micButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
});
