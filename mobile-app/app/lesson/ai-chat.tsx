import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from "expo-audio";
import { Stack, useLocalSearchParams } from "expo-router";
import { AudioLines, Mic, Play } from "lucide-react-native";
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
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiSpeakOrb } from "../../src/components/AiSpeakOrb";
import api, { axios } from "../../src/api";
import { AI_CHAT_PATH, AI_SPEAK_PATH, getApiBaseUrl } from "../../src/constants/api";

const SESSION_SECONDS = 4 * 60;
/** Time the learner has to answer each AI KIT question (seconds). */
const ANSWER_SECONDS = 25;
const BUSY_MESSAGE = "AI KIT is temporarily busy. Please try again.";

/** High-quality recording with live mic metering so the orb reacts to voice. */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

/** Convert recorder dBFS (~-160..0) into a 0..1 animation level. */
function meteringToLevel(db: number | undefined): number {
  if (db == null || !Number.isFinite(db)) return 0;
  const clamped = Math.max(-55, Math.min(0, db));
  return (clamped + 55) / 55;
}

/** Rough speak duration so the orb keeps moving even when TTS audio is missing. */
function estimateSpeakMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(12_000, Math.max(2_200, Math.round((words / 2.4) * 1000)));
}

/**
 * AI KIT asks these one-by-one, basic → more complex.
 * First line is the intro + first question.
 */
const AI_KIT_QUESTIONS = [
  "Hi! My name is AI KIT. What is your name?",
  "Nice to meet you. How are you today?",
  "Where are you from?",
  "What do you like to do in your free time?",
  "Can you tell me about your family in one or two sentences?",
  "What did you do yesterday?",
  "If you could travel anywhere, where would you go and why?",
  "Describe a challenge you faced and how you solved it.",
] as const;

type Phase = "idle" | "active" | "finished";

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

type SpeakApiResponse = {
  text: string;
  audio_url: string;
};

function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const lower = uri.toLowerCase();
  if (lower.includes(".wav")) {
    return { uri, type: "audio/wav", name: "speech.wav" };
  }
  if (lower.includes(".webm")) {
    return { uri, type: "audio/webm", name: "speech.webm" };
  }
  if (lower.includes(".mp3")) {
    return { uri, type: "audio/mpeg", name: "speech.mp3" };
  }
  return { uri, type: "audio/mp4", name: "speech.m4a" };
}

function tutorErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401) {
      return "Your session expired. Please log in again.";
    }
    if (status === 400) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      return "Could not understand that audio. Hold the mic a bit longer and try again.";
    }
    if (status && status >= 500) {
      return BUSY_MESSAGE;
    }
    if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
      return BUSY_MESSAGE;
    }
  }
  return BUSY_MESSAGE;
}

/**
 * AI KIT practice:
 * 1) Tap Start → AI introduces itself and asks Q1
 * 2) Learner has 25s to hold-to-talk an answer
 * 3) AI KIT replies with corrections only
 * 4) Next question (basic → complex); on timeout, skip to next question
 */
export default function LessonAiChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lessonId?: string; id?: string }>();
  const lessonId = String(params.lessonId ?? params.id ?? "");

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  // Fast poll so metering updates while the user talks
  const recorderState = useAudioRecorderState(audioRecorder, 50);

  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [answerSecondsLeft, setAnswerSecondsLeft] = useState(ANSWER_SECONDS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isHoldingMic, setIsHoldingMic] = useState(false);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);

  const playerRef = useRef<AudioPlayer | null>(null);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const startingRef = useRef(false);
  const holdingRef = useRef(false);
  const recordStartedAtRef = useRef(0);
  const finishWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionIndexRef = useRef(0);
  const awaitingAnswerRef = useRef(false);
  const busyRef = useRef(false);

  const timerExpired = secondsLeft <= 0;
  const recording = recorderState.isRecording || isHoldingMic;
  const canRecord =
    phase === "active" &&
    awaitingAnswer &&
    !sending &&
    !asking &&
    !isPlayingAudio &&
    !timerExpired;

  // Mic pulse + red talk ripples
  const pulse = useSharedValue(1);
  const talkRippleA = useSharedValue(1);
  const talkRippleAOpacity = useSharedValue(0);
  const talkRippleB = useSharedValue(1);
  const talkRippleBOpacity = useSharedValue(0);

  const startTalkAnimation = useCallback(() => {
    cancelAnimation(pulse);
    cancelAnimation(talkRippleA);
    cancelAnimation(talkRippleAOpacity);
    cancelAnimation(talkRippleB);
    cancelAnimation(talkRippleBOpacity);

    pulse.value = 1;
    pulse.value = withRepeat(
      withTiming(1.22, {
        duration: 480,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    const expandRing = (
      scale: typeof talkRippleA,
      opacity: typeof talkRippleAOpacity,
      startOpacity: number,
    ) => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.9, {
            duration: 1100,
            easing: Easing.out(Easing.ease),
          }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(startOpacity, { duration: 0 }),
          withTiming(0, {
            duration: 1100,
            easing: Easing.out(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    };

    expandRing(talkRippleA, talkRippleAOpacity, 0.7);
    talkRippleB.value = withDelay(
      350,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.9, {
            duration: 1100,
            easing: Easing.out(Easing.ease),
          }),
        ),
        -1,
        false,
      ),
    );
    talkRippleBOpacity.value = withDelay(
      350,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 0 }),
          withTiming(0, {
            duration: 1100,
            easing: Easing.out(Easing.ease),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [pulse, talkRippleA, talkRippleAOpacity, talkRippleB, talkRippleBOpacity]);

  const stopTalkAnimation = useCallback(() => {
    cancelAnimation(pulse);
    cancelAnimation(talkRippleA);
    cancelAnimation(talkRippleAOpacity);
    cancelAnimation(talkRippleB);
    cancelAnimation(talkRippleBOpacity);
    pulse.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.ease) });
    talkRippleA.value = withTiming(1, { duration: 160 });
    talkRippleAOpacity.value = withTiming(0, { duration: 160 });
    talkRippleB.value = withTiming(1, { duration: 160 });
    talkRippleBOpacity.value = withTiming(0, { duration: 160 });
  }, [pulse, talkRippleA, talkRippleAOpacity, talkRippleB, talkRippleBOpacity]);

  const micPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const talkRippleAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: talkRippleA.value }],
    opacity: talkRippleAOpacity.value,
  }));
  const talkRippleBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: talkRippleB.value }],
    opacity: talkRippleBOpacity.value,
  }));

  useEffect(() => {
    void (async () => {
      try {
        await AudioModule.requestRecordingPermissionsAsync();
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          interruptionMode: "duckOthers",
        });
      } catch {
        // Permission may be requested on first press
      }
    })();

    return () => {
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
      if (finishWatchRef.current) clearInterval(finishWatchRef.current);
      if (speakAnimRef.current) clearInterval(speakAnimRef.current);
      try {
        playerRef.current?.pause();
        playerRef.current?.release();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, []);

  // Session countdown (only after Start)
  useEffect(() => {
    if (phase !== "active" || timerExpired) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, timerExpired]);

  useEffect(() => {
    if (timerExpired && phase === "active") {
      setPhase("finished");
      setAwaitingAnswer(false);
      awaitingAnswerRef.current = false;
      if (answerTimerRef.current) {
        clearInterval(answerTimerRef.current);
        answerTimerRef.current = null;
      }
    }
  }, [timerExpired, phase]);

  const clearFinishWatch = useCallback(() => {
    if (finishWatchRef.current) {
      clearInterval(finishWatchRef.current);
      finishWatchRef.current = null;
    }
  }, []);

  const clearSpeakAnim = useCallback(() => {
    if (speakAnimRef.current) {
      clearInterval(speakAnimRef.current);
      speakAnimRef.current = null;
    }
  }, []);

  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
  }, []);

  /** Fake voice energy waves while AI KIT is "speaking" (TTS or text-only). */
  const startAiVoiceWaves = useCallback(
    (durationMs: number) => {
      clearSpeakAnim();
      setIsPlayingAudio(true);
      const started = Date.now();
      speakAnimRef.current = setInterval(() => {
        const elapsed = Date.now() - started;
        if (elapsed >= durationMs) {
          clearSpeakAnim();
          setIsPlayingAudio(false);
          setVoiceLevel(0);
          return;
        }
        // Irregular speech-like envelope
        const t = elapsed / 180;
        const wave =
          0.35 +
          0.35 * Math.abs(Math.sin(t)) +
          0.25 * Math.abs(Math.sin(t * 2.3)) +
          0.15 * Math.random();
        setVoiceLevel(Math.min(1, wave));
      }, 60);
    },
    [clearSpeakAnim],
  );

  const stopPlayback = useCallback(async () => {
    clearFinishWatch();
    clearSpeakAnim();
    setIsPlayingAudio(false);
    setVoiceLevel(0);
    const player = playerRef.current;
    playerRef.current = null;
    if (!player) return;
    try {
      player.pause();
      player.release();
    } catch {
      // ignore
    }
  }, [clearFinishWatch, clearSpeakAnim]);

  const playReplyAudio = useCallback(
    async (audioUrl: string, spokenText = "") => {
      const fallbackMs = estimateSpeakMs(spokenText || "Hello from AI KIT");

      if (!audioUrl) {
        // No TTS file — still animate the orb for the spoken line length
        startAiVoiceWaves(fallbackMs);
        await new Promise((resolve) => setTimeout(resolve, fallbackMs));
        return;
      }

      try {
        await stopPlayback();
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          interruptionMode: "doNotMix",
        });

        const uri = resolveAudioUrl(audioUrl);
        const player = createAudioPlayer({ uri }, { downloadFirst: true });
        playerRef.current = player;
        setIsPlayingAudio(true);
        startAiVoiceWaves(Math.max(fallbackMs, 4_000));

        await new Promise((resolve) => setTimeout(resolve, 150));
        player.seekTo(0);
        player.play();

        clearFinishWatch();
        finishWatchRef.current = setInterval(() => {
          try {
            const duration = player.duration ?? 0;
            const current = player.currentTime ?? 0;
            if (duration > 0 && current >= duration - 0.15) {
              clearFinishWatch();
              clearSpeakAnim();
              setIsPlayingAudio(false);
              setVoiceLevel(0);
            }
          } catch {
            clearFinishWatch();
            clearSpeakAnim();
            setIsPlayingAudio(false);
            setVoiceLevel(0);
          }
        }, 200);

        setTimeout(() => {
          clearFinishWatch();
          clearSpeakAnim();
          setIsPlayingAudio(false);
          setVoiceLevel(0);
        }, 60_000);
      } catch {
        // Fall back to timed voice waves if playback fails
        startAiVoiceWaves(fallbackMs);
        setError((prev) => prev ?? "Reply received, but audio playback failed.");
      } finally {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          interruptionMode: "duckOthers",
        });
      }
    },
    [clearFinishWatch, clearSpeakAnim, startAiVoiceWaves, stopPlayback],
  );

  // Drive orb from live mic metering while the user is holding / recording
  useEffect(() => {
    if (isHoldingMic || recorderState.isRecording) {
      const fromMeter = meteringToLevel(recorderState.metering);
      // Always show some motion while holding, even in silence
      setVoiceLevel(Math.max(0.22, fromMeter));
      return;
    }
    if (!isPlayingAudio && !asking && !sending) {
      setVoiceLevel(0);
    }
  }, [
    asking,
    isHoldingMic,
    isPlayingAudio,
    recorderState.isRecording,
    recorderState.metering,
    sending,
  ]);

  const appendAiMessage = useCallback((text: string, grammar?: string) => {
    const stamp = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: `${stamp}-ai`,
        role: "ai",
        text,
        grammarCorrection: grammar?.trim() || undefined,
      },
    ]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const startAnswerWindow = useCallback(() => {
    clearAnswerTimer();
    setAnswerSecondsLeft(ANSWER_SECONDS);
    setAwaitingAnswer(true);
    awaitingAnswerRef.current = true;

    answerTimerRef.current = setInterval(() => {
      setAnswerSecondsLeft((prev) => {
        if (prev <= 1) {
          clearAnswerTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearAnswerTimer]);

  const askQuestionAt = useCallback(
    async (index: number, skipped = false) => {
      if (!lessonId) {
        setError("Missing lesson id. Go back and open Talk with AI from a lesson.");
        return;
      }
      if (index >= AI_KIT_QUESTIONS.length) {
        setPhase("finished");
        setAwaitingAnswer(false);
        awaitingAnswerRef.current = false;
        clearAnswerTimer();
        appendAiMessage("Great practice today! Tap Start anytime to try again with AI KIT.");
        return;
      }

      const question = AI_KIT_QUESTIONS[index];
      questionIndexRef.current = index;
      setQuestionIndex(index);
      setAsking(true);
      setAwaitingAnswer(false);
      awaitingAnswerRef.current = false;
      clearAnswerTimer();
      setError(null);
      busyRef.current = true;

      try {
        if (skipped) {
          appendAiMessage("No problem — let's try another question.");
        }

        const formData = new FormData();
        formData.append("lesson_id", String(lessonId));
        formData.append("text", question);

        const response = await api.post<SpeakApiResponse>(AI_SPEAK_PATH, formData, {
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

        const spoken = response.data.text || question;
        appendAiMessage(spoken);
        await playReplyAudio(response.data.audio_url || "", spoken);
        startAnswerWindow();
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return;
        }
        // Still show the question as text if TTS/API speak fails
        appendAiMessage(question);
        await playReplyAudio("", question);
        startAnswerWindow();
        setError(tutorErrorMessage(err));
      } finally {
        setAsking(false);
        busyRef.current = false;
      }
    },
    [
      appendAiMessage,
      clearAnswerTimer,
      lessonId,
      playReplyAudio,
      startAnswerWindow,
    ],
  );

  // When 25s answer window hits 0, move to next question
  useEffect(() => {
    if (
      phase !== "active" ||
      answerSecondsLeft > 0 ||
      !awaitingAnswer ||
      sending ||
      asking ||
      isHoldingMic ||
      recording ||
      busyRef.current
    ) {
      return;
    }

    awaitingAnswerRef.current = false;
    setAwaitingAnswer(false);
    const next = questionIndexRef.current + 1;
    void askQuestionAt(next, true);
  }, [
    answerSecondsLeft,
    asking,
    awaitingAnswer,
    isHoldingMic,
    phase,
    recording,
    sending,
    askQuestionAt,
  ]);

  const sendRecording = useCallback(
    async (uri: string) => {
      if (!lessonId) {
        setError("Missing lesson id. Go back and open Talk with AI from a lesson.");
        return;
      }

      clearAnswerTimer();
      setAwaitingAnswer(false);
      awaitingAnswerRef.current = false;
      setSending(true);
      setError(null);
      busyRef.current = true;

      const asked = AI_KIT_QUESTIONS[questionIndexRef.current] ?? "";

      try {
        const formData = new FormData();
        formData.append("lesson_id", String(lessonId));
        formData.append("current_question", asked);
        formData.append("audio", audioUploadFromUri(uri) as unknown as Blob);

        const response = await api.post<ChatApiResponse>(AI_CHAT_PATH, formData, {
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

        await playReplyAudio(data.audio_url || "", data.reply);

        const next = questionIndexRef.current + 1;
        await askQuestionAt(next, false);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return;
        }
        setError(tutorErrorMessage(err));
        // Give another chance on the same question
        startAnswerWindow();
      } finally {
        setSending(false);
        busyRef.current = false;
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          interruptionMode: "duckOthers",
        });
      }
    },
    [askQuestionAt, clearAnswerTimer, lessonId, playReplyAudio, startAnswerWindow],
  );

  const startRecording = useCallback(async () => {
    if (!canRecord || startingRef.current || audioRecorder.isRecording) {
      return;
    }

    startingRef.current = true;
    setError(null);

    try {
      await stopPlayback();

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone needed",
          "Allow microphone access so you can practice speaking with AI KIT.",
        );
        holdingRef.current = false;
        setIsHoldingMic(false);
        stopTalkAnimation();
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "duckOthers",
      });

      await audioRecorder.prepareToRecordAsync({
        isMeteringEnabled: true,
      });
      if (!holdingRef.current) {
        return;
      }
      audioRecorder.record();
      recordStartedAtRef.current = Date.now();
      // Kick the orb immediately even before first metering sample
      setVoiceLevel(0.35);
    } catch {
      setError("Could not start recording. Try again.");
      holdingRef.current = false;
      setIsHoldingMic(false);
      stopTalkAnimation();
    } finally {
      startingRef.current = false;
    }
  }, [audioRecorder, canRecord, stopPlayback, stopTalkAnimation]);

  const stopRecordingAndSend = useCallback(async () => {
    holdingRef.current = false;
    stopTalkAnimation();
    setIsHoldingMic(false);

    // Block the 25s timeout from skipping while we finish/send this answer
    busyRef.current = true;
    clearAnswerTimer();
    setAwaitingAnswer(false);
    awaitingAnswerRef.current = false;

    if (startingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (!audioRecorder.isRecording) {
      busyRef.current = false;
      startAnswerWindow();
      return;
    }

    try {
      const elapsed = Date.now() - recordStartedAtRef.current;
      if (elapsed < 400) {
        await new Promise((resolve) => setTimeout(resolve, 400 - elapsed));
      }

      await audioRecorder.stop();
      await new Promise((resolve) => setTimeout(resolve, 80));

      const uri = audioRecorder.uri;
      if (!uri) {
        setError("No audio was captured. Hold the mic and speak, then release.");
        busyRef.current = false;
        startAnswerWindow();
        return;
      }
      await sendRecording(uri);
    } catch {
      setError("Could not finish recording. Try again.");
      busyRef.current = false;
      startAnswerWindow();
    }
  }, [
    audioRecorder,
    clearAnswerTimer,
    sendRecording,
    startAnswerWindow,
    stopTalkAnimation,
  ]);

  const handleStartSession = useCallback(async () => {
    if (!lessonId) {
      setError("Missing lesson id. Go back and open Talk with AI from a lesson.");
      return;
    }

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Microphone needed",
        "Allow microphone access so you can practice speaking with AI KIT.",
      );
      return;
    }

    setMessages([]);
    setError(null);
    setSecondsLeft(SESSION_SECONDS);
    setPhase("active");
    questionIndexRef.current = 0;
    setQuestionIndex(0);
    await askQuestionAt(0, false);
  }, [askQuestionAt, lessonId]);

  // Orb stays on screen always; animates + reacts to level whenever voice is active
  const voiceActive =
    isPlayingAudio || recording || isHoldingMic || asking || sending;

  const orbCaption = (() => {
    if (recording || isHoldingMic) return "Listening to you…";
    if (isPlayingAudio) return "AI KIT is speaking…";
    if (asking) return "AI KIT is preparing…";
    if (sending) return "Checking your English…";
    if (phase === "idle") return "Tap Start to begin";
    if (phase === "finished" || timerExpired) return "Session ended";
    if (awaitingAnswer) return `Hold mic & talk — ${answerSecondsLeft}s`;
    return "AI KIT is ready";
  })();

  const micHint = (() => {
    if (phase === "idle") return "Tap Start to meet AI KIT";
    if (phase === "finished" || timerExpired) return "Tap Start to practice again";
    if (asking) return "AI KIT is asking…";
    if (sending) return "AI KIT is checking your English…";
    if (isPlayingAudio) return "AI KIT is speaking…";
    if (recording) return "Recording… release to send";
    if (awaitingAnswer) return `Hold mic to answer — ${answerSecondsLeft}s`;
    return "Please wait";
  })();

  return (
    <>
      <Stack.Screen options={{ title: "Talk with AI KIT", headerShown: true }} />
      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View
          style={[
            styles.timerBar,
            (timerExpired || phase === "finished") && styles.timerBarExpired,
          ]}
        >
          <View style={styles.timerPill}>
            <Text style={styles.timerLabel}>⏱</Text>
            <Text
              style={[
                styles.timerValue,
                (timerExpired || phase === "finished") && styles.timerExpired,
              ]}
            >
              {formatTimer(secondsLeft)}
            </Text>
          </View>
          {phase === "active" && awaitingAnswer ? (
            <View style={styles.answerBadge}>
              <Text style={styles.answerBadgeLabel}>Answer in</Text>
              <Text style={styles.answerBadgeValue}>{answerSecondsLeft}s</Text>
            </View>
          ) : (
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>
                {phase === "idle"
                  ? "Ready"
                  : phase === "finished"
                    ? "Done"
                    : `Q${Math.min(questionIndex + 1, AI_KIT_QUESTIONS.length)}/${AI_KIT_QUESTIONS.length}`}
              </Text>
            </View>
          )}
        </View>

        {/* Orb always visible — reacts to your mic level / AI speech */}
        <View style={styles.orbStage}>
          <AiSpeakOrb active={voiceActive} level={voiceLevel} size={236} />
          <Text style={styles.orbCaption}>{orbCaption}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {phase === "idle" && messages.length === 0 ? (
            <Text style={styles.emptyHint}>
              Tap Start. AI KIT introduces itself, then asks questions. Hold the mic to answer
              within 25 seconds.
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
                  {message.role === "user" ? "You" : "AI KIT"}
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
                  <Text style={styles.grammarTitle}>Correction</Text>
                  <Text style={styles.grammarText}>{message.grammarCorrection}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {sending || asking ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>
                {asking ? "AI KIT is preparing a question…" : "AI KIT is listening…"}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {phase === "finished" || timerExpired ? (
            <Text style={styles.sessionEnded}>
              Practice complete. Tap Start for another round with AI KIT.
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.micSection}>
          <Text style={styles.micHint}>{micHint}</Text>

          {phase === "idle" || phase === "finished" ? (
            <Pressable
              onPress={() => {
                void handleStartSession();
              }}
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.startButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start talking with AI KIT"
            >
              <Play color="#FFFFFF" size={28} strokeWidth={2.6} fill="#FFFFFF" />
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>
          ) : (
            <View style={styles.controlsRow}>
              <View style={styles.micButtonWrap}>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.talkRipple, talkRippleAStyle]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[styles.talkRipple, talkRippleBStyle]}
                />

                <Animated.View style={micPulseStyle}>
                  <Pressable
                    onPressIn={() => {
                      if (!canRecord) return;
                      holdingRef.current = true;
                      setIsHoldingMic(true);
                      startTalkAnimation();
                      void startRecording();
                    }}
                    onPressOut={() => {
                      if (!holdingRef.current && !isHoldingMic) return;
                      void stopRecordingAndSend();
                    }}
                    disabled={!canRecord && !isHoldingMic}
                    style={({ pressed }) => [
                      styles.micButton,
                      (isHoldingMic || recorderState.isRecording) &&
                        styles.micButtonActive,
                      isPlayingAudio && styles.micButtonSpeaking,
                      !canRecord &&
                        !isHoldingMic &&
                        !isPlayingAudio &&
                        styles.micButtonDisabled,
                      pressed && canRecord && styles.micButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPlayingAudio
                        ? "AI KIT is speaking"
                        : "Hold to record your answer"
                    }
                  >
                    {isPlayingAudio ? (
                      <AudioLines color="#FFFFFF" size={36} strokeWidth={2.4} />
                    ) : (
                      <Mic color="#FFFFFF" size={36} strokeWidth={2.4} />
                    )}
                  </Pressable>
                </Animated.View>
              </View>

              <Pressable
                onPress={() => {
                  void stopPlayback();
                  clearAnswerTimer();
                  setAwaitingAnswer(false);
                  awaitingAnswerRef.current = false;
                  setPhase("finished");
                }}
                style={styles.endButton}
                accessibilityRole="button"
                accessibilityLabel="End session"
              >
                <Text style={styles.endButtonX}>✕</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timerBarExpired: {
    opacity: 0.95,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timerLabel: {
    fontSize: 14,
  },
  timerValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E3A8A",
    fontVariant: ["tabular-nums"],
  },
  timerExpired: {
    color: "#B91C1C",
  },
  answerBadge: {
    alignItems: "flex-end",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  answerBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
  },
  answerBadgeValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#B45309",
    fontVariant: ["tabular-nums"],
  },
  questionBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  questionBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  chat: {
    flex: 1,
    maxHeight: 180,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
    flexGrow: 1,
  },
  emptyHint: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
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
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
    overflow: "hidden",
    fontWeight: "600",
  },
  sessionEnded: {
    color: "#B91C1C",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 8,
  },
  orbStage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 12,
    minHeight: 280,
  },
  orbCaption: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0E7490",
  },
  micSection: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  micHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  controlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 24,
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#991B1B",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  endButtonX: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginTop: -2,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2563EB",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  startButtonPressed: {
    opacity: 0.9,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  micButtonWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  talkRipple: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.22)",
  },
  micButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
  },
  micButtonSpeaking: {
    backgroundColor: "#16A34A",
    shadowColor: "#166534",
    shadowOpacity: 0.3,
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
