import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Mic } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api, { axios } from "../../../src/api";
import { getApiBaseUrl } from "../../../src/constants/api";

type Bubble = {
  id: string;
  role: "user" | "ai";
  text: string;
  grammar?: string;
};

type SpeakingReply = {
  transcript: string;
  reply: string;
  grammar_correction: string;
  audio_url: string;
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

/**
 * Speaking practice. Recording uses expo-audio because expo-av is not in this Expo SDK.
 */
export default function SpeakScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = String(id);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<Bubble[]>([]);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function openSession() {
      try {
        const response = await api.post<{ id: string }>("/api/v1/speaking/sessions", {
          lesson_id: Number(lessonId),
        });
        if (!cancelled) {
          sessionRef.current = response.data.id;
          setReady(true);
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) return;
        if (!cancelled) setError("Could not start a speaking session.");
      }
    }
    void openSession();
    return () => {
      cancelled = true;
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.pause();
        player?.release();
      } catch {
        // ignore
      }
    };
  }, [lessonId]);

  async function playReply(audioUrl: string) {
    if (!audioUrl) return;
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
    if (!ready || sending || recording) return;
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
    if (!recording) return;
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
      const grammar = data.grammar_correction.trim();
      setMessages((current) => [
        ...current,
        { id: `${stamp}-user`, role: "user", text: data.transcript },
        { id: `${stamp}-ai`, role: "ai", text: data.reply, grammar: grammar || undefined },
      ]);
      await playReply(data.audio_url);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      setError("Could not send that recording.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <ChevronLeft color="#0F172A" size={22} strokeWidth={2.6} />
        </Pressable>
        <Text style={styles.navTitle}>Speaking</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Hold the microphone and say a sentence in English.</Text>
        ) : null}
        {messages.map((message) => (
          <View key={message.id} style={message.role === "user" ? styles.userWrap : styles.aiWrap}>
            <View style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.bubbleText, message.role === "user" && styles.userText]}>{message.text}</Text>
            </View>
            {message.grammar ? (
              <View style={styles.grammar}>
                <Text style={styles.grammarLabel}>Grammar</Text>
                <Text style={styles.grammarText}>{message.grammar}</Text>
              </View>
            ) : null}
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <Pressable
        disabled={!ready || sending}
        onPressIn={() => void startRecording()}
        onPressOut={() => void stopAndSend()}
        style={[styles.mic, recording && styles.micOn, (!ready || sending) && styles.micDisabled]}
        accessibilityLabel="Hold to speak"
      >
        {sending ? <ActivityIndicator color="#FFFFFF" /> : <Mic color="#FFFFFF" size={28} />}
      </Pressable>
      <Text style={styles.hint}>{recording ? "Release to send" : "Hold to speak"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  nav: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: "#0F172A" },
  thread: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  empty: { marginTop: 32, textAlign: "center", color: "#64748B", lineHeight: 22 },
  userWrap: { alignItems: "flex-end" },
  aiWrap: { alignItems: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  userBubble: { backgroundColor: "#2563EB" },
  aiBubble: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  bubbleText: { fontSize: 16, lineHeight: 22, color: "#0F172A" },
  userText: { color: "#FFFFFF" },
  grammar: {
    marginTop: 8,
    maxWidth: "82%",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grammarLabel: { fontSize: 12, fontWeight: "800", color: "#92400E", marginBottom: 2 },
  grammarText: { color: "#78350F", lineHeight: 20 },
  error: { color: "#DC2626", textAlign: "center" },
  mic: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  micOn: { backgroundColor: "#DC2626" },
  micDisabled: { opacity: 0.45 },
  hint: { marginTop: 8, textAlign: "center", color: "#64748B", fontWeight: "600" },
});
