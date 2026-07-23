"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ClipboardCheck,
  Download,
  LoaderCircle,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultPersona,
  getPersonaPreset,
  personaPresets,
} from "@/features/roleplay/personas";
import {
  conversationResponseSchema,
  type Persona,
  type RoleplayMessage,
} from "@/features/roleplay/schemas";
import { MIN_SELLER_TURNS_TO_SCORE } from "@/features/roleplay/scoring/rubric";
import {
  scoreResponseSchema,
  type ScoreResponse,
} from "@/features/roleplay/scoring/schemas";
import { useAudioRecorder } from "@/features/roleplay/use-audio-recorder";
import { cn } from "@/lib/utils";

type Activity =
  | "ready"
  | "transcribing"
  | "thinking"
  | "speaking";

type VoiceProvider = "neuphonic" | "groq" | "browser" | null;

const openings: Record<string, string> = {
  "maya-security":
    "Thanks for making the time. I have about fifteen minutes—what did you want to discuss?",
  "daniel-operations":
    "Hi. I reviewed the overview, but I want to understand what this would actually take to roll out.",
  "aisha-founder":
    "Great to meet you. We are actively improving how our team practices sales calls, so I’m curious to hear your thinking.",
};

const activityLabels: Record<Activity, string> = {
  ready: "Ready",
  transcribing: "Transcribing your message",
  thinking: "Buyer is considering your pitch",
  speaking: "Buyer is responding",
};

function createMessage(
  role: RoleplayMessage["role"],
  content: string,
): RoleplayMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function initialMessages(persona: Persona) {
  return [
    createMessage(
      "buyer",
      openings[persona.id] ??
        "Thanks for meeting with me. What would you like to discuss?",
    ),
  ];
}

export function RoleplayStudio() {
  const [personaId, setPersonaId] = useState<string>(defaultPersona.id);
  const persona = getPersonaPreset(personaId) ?? defaultPersona;
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<RoleplayMessage[]>(() =>
    initialMessages(defaultPersona),
  );
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState<Activity>("ready");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [responseMode, setResponseMode] = useState<"live" | "mock" | null>(
    null,
  );
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recorder = useAudioRecorder();
  const sellerTurnCount = messages.filter(
    (message) => message.role === "seller",
  ).length;
  const canScore =
    sellerTurnCount >= MIN_SELLER_TURNS_TO_SCORE && !isScoring && !recorder.isRecording;
  const isBusy =
    activity !== "ready" ||
    isScoring ||
    recorder.status === "requesting" ||
    recorder.status === "stopping";

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activity]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      window.speechSynthesis?.cancel();
    },
    [],
  );

  function stopPlayback() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }

  function resetSession(nextPersona = persona) {
    stopPlayback();
    setSessionId(crypto.randomUUID());
    setMessages(initialMessages(nextPersona));
    setDraft("");
    setError(null);
    setNotice(null);
    setResponseMode(null);
    setVoiceProvider(null);
    setScore(null);
    setIsScoring(false);
    setActivity("ready");
    recorder.clearError();
  }

  function changePersona(nextId: string) {
    const nextPersona = getPersonaPreset(nextId);

    if (!nextPersona || nextId === personaId) {
      return;
    }

    setPersonaId(nextId);
    resetSession(nextPersona);
  }

  function pickBrowserVoice(): SpeechSynthesisVoice | null {
    if (!("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      return null;
    }

    return (
      voices.find(
        (voice) =>
          voice.lang.toLowerCase().startsWith("en") &&
          /google|natural|premium|enhanced|neural/i.test(voice.name),
      ) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
      voices[0] ??
      null
    );
  }

  function speakWithBrowser(text: string) {
    if (!("speechSynthesis" in window)) {
      setNotice("Audio is unavailable in this browser; the transcript is ready.");
      setActivity("ready");
      return;
    }

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickBrowserVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "en-US";
      }
      utterance.rate = persona.voice.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => setActivity("ready");
      utterance.onerror = () => {
        setNotice(
          "Browser voice could not play. Unmute the speaker icon and check system sound.",
        );
        setActivity("ready");
      };
      window.speechSynthesis.cancel();
      // Some browsers drop the first utterance right after cancel().
      window.setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 40);
      setVoiceProvider("browser");
      setActivity("speaking");
    };

    // Chrome often loads voices asynchronously.
    if (window.speechSynthesis.getVoices().length === 0) {
      const onVoices = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        speak();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      window.setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        speak();
      }, 400);
      return;
    }

    speak();
  }

  async function playBuyerReply(text: string) {
    if (!voiceEnabled) {
      setActivity("ready");
      return;
    }

    setActivity("speaking");

    try {
      const response = await fetch("/api/roleplay/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: persona.voice }),
      });

      if (!response.ok) {
        speakWithBrowser(text);
        return;
      }

      const blob = await response.blob();
      // Empty / header-only WAVs were previously returned as "success" and played silence.
      if (blob.size < 512) {
        speakWithBrowser(text);
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      stopPlayback();
      audioRef.current = audio;
      audioUrlRef.current = url;
      setVoiceProvider(
        response.headers.get("X-TTS-Provider") === "groq"
          ? "groq"
          : "neuphonic",
      );
      audio.onended = () => {
        stopPlayback();
        setActivity("ready");
      };
      audio.onerror = () => {
        stopPlayback();
        speakWithBrowser(text);
      };
      try {
        await audio.play();
      } catch {
        // Autoplay / user-gesture restrictions — fall back to browser TTS.
        stopPlayback();
        speakWithBrowser(text);
      }
    } catch {
      stopPlayback();
      speakWithBrowser(text);
    }
  }

  async function sendSellerMessage(rawMessage: string, bypassIdleCheck = false) {
    const sellerMessage = rawMessage.trim();

    if (
      !sellerMessage ||
      (!bypassIdleCheck && (isBusy || recorder.isRecording))
    ) {
      return;
    }

    const sellerTurn = createMessage("seller", sellerMessage);
    setDraft("");
    setError(null);
    setNotice(null);
    setMessages((current) => [...current, sellerTurn]);
    setActivity("thinking");

    try {
      const response = await fetch("/api/roleplay/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          persona,
          messages: messages.slice(-28),
          sellerMessage,
        }),
      });
      const body: unknown = await response.json();
      const parsed = conversationResponseSchema.safeParse(body);

      if (!response.ok || !parsed.success) {
        throw new Error("The buyer could not respond. Please try again.");
      }

      const buyerTurn = createMessage("buyer", parsed.data.reply);
      setMessages((current) => [...current, buyerTurn]);
      setResponseMode(parsed.data.mode);
      setNotice(
        parsed.data.fallbackReason
          ? `${parsed.data.fallbackReason} A reliable mock buyer answered instead.`
          : null,
      );
      await playBuyerReply(parsed.data.reply);
    } catch (cause) {
      setActivity("ready");
      setError(
        cause instanceof Error
          ? cause.message
          : "The buyer could not respond. Please try again.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendSellerMessage(draft);
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function transcribeRecording(blob: Blob) {
    setActivity("transcribing");
    setError(null);
    const formData = new FormData();
    const extension = blob.type.includes("mp4")
      ? "mp4"
      : blob.type.includes("ogg")
        ? "ogg"
        : "webm";
    formData.set("audio", blob, `seller-message.${extension}`);

    try {
      const response = await fetch("/api/roleplay/transcribe", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !body.text) {
        throw new Error(
          body.error ??
            "The recording could not be transcribed. You can type instead.",
        );
      }

      setActivity("ready");
      await sendSellerMessage(body.text, true);
    } catch (cause) {
      setActivity("ready");
      setError(
        cause instanceof Error
          ? cause.message
          : "The recording could not be transcribed. You can type instead.",
      );
    }
  }

  async function handleMicrophone() {
    if (recorder.isRecording) {
      try {
        const recording = await recorder.stopRecording();
        await transcribeRecording(recording);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The microphone recording failed.",
        );
      }
      return;
    }

    try {
      await recorder.startRecording();
    } catch {
      // The recorder hook presents the actionable permission error.
    }
  }

  function downloadTranscript() {
    const scoreBlock = score
      ? [
          "",
          "--- Call score ---",
          `Overall: ${score.overallScore}/100 (${score.mode})`,
          score.summary,
          "",
          ...score.dimensions.map(
            (dimension) =>
              `${dimension.label}: ${dimension.score}/10 — ${dimension.note}`,
          ),
          "",
          "Strengths:",
          ...score.strengths.map((item) => `- ${item}`),
          "",
          "Improvements:",
          ...score.improvements.map((item) => `- ${item}`),
        ]
      : [];

    const transcript = [
      `CloseLoop sales roleplay`,
      `Buyer: ${persona.name}, ${persona.buyerRole} at ${persona.company}`,
      `Difficulty: ${persona.difficulty}`,
      "",
      ...messages.map(
        (message) =>
          `${message.role === "buyer" ? persona.name : "Seller"}: ${message.content}`,
      ),
      ...scoreBlock,
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([transcript], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `closeloop-${persona.id}-transcript.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function scoreCall() {
    if (!canScore || activity !== "ready") {
      return;
    }

    setIsScoring(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/roleplay/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          persona,
          messages: messages.slice(-40),
        }),
      });
      const body: unknown = await response.json();
      const parsed = scoreResponseSchema.safeParse(body);

      if (!response.ok || !parsed.success) {
        const message =
          typeof body === "object" &&
          body &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "The call could not be scored. Please try again.";
        throw new Error(message);
      }

      setScore(parsed.data);
      setNotice(
        parsed.data.fallbackReason
          ? `${parsed.data.fallbackReason} A deterministic demo score was used instead.`
          : parsed.data.mode === "live"
            ? "Live coach score ready."
            : "Demo coach score ready.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The call could not be scored. Please try again.",
      );
    } finally {
      setIsScoring(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20.5rem_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
        <Card className="overflow-hidden border-border/80 bg-card/75 shadow-none backdrop-blur">
          <CardHeader className="border-b border-border/70 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-medium tracking-[0.14em] text-primary uppercase">
                  Buyer setup
                </p>
                <CardTitle className="mt-1 text-base">Choose a persona</CardTitle>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 capitalize text-muted-foreground"
              >
                {persona.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {personaPresets.map((preset) => {
              const active = preset.id === persona.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => changePersona(preset.id)}
                  disabled={isBusy || recorder.isRecording}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "border-primary/40 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]"
                      : "border-border/50 bg-background/30 hover:border-border hover:bg-muted/40",
                  )}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {preset.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <span className="truncate">{preset.name}</span>
                      {active ? (
                        <Check
                          className="size-3.5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {preset.buyerRole}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground/80">
                      {preset.company} · {preset.industry}
                    </span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60 shadow-none backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium leading-snug">
              What matters to {persona.name}
            </CardTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {persona.personality}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                Business goals
              </p>
              <ul className="mt-2 space-y-2">
                {persona.goals.map((goal) => (
                  <li
                    key={goal}
                    className="flex gap-2.5 text-xs leading-5 text-foreground/90"
                  >
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-border/60 pt-4">
              <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                Likely objections
              </p>
              <ul className="mt-2 space-y-2">
                {persona.concerns.map((concern) => (
                  <li
                    key={concern}
                    className="flex gap-2.5 text-xs leading-5 text-foreground/90"
                  >
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400/70"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      <Card className="min-h-[43rem] border-border/80 bg-card/75 shadow-none backdrop-blur lg:h-[calc(100vh-9rem)] lg:min-h-[39rem]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="size-5" aria-hidden="true" />
                <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {persona.name}
                </CardTitle>
                <p className="truncate text-xs text-muted-foreground">
                  {persona.buyerRole} at {persona.company}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {responseMode ? (
                <Badge
                  variant={responseMode === "live" ? "default" : "secondary"}
                >
                  {responseMode === "live" ? "Live AI" : "Demo mode"}
                </Badge>
              ) : null}
              {voiceProvider ? (
                <Badge variant="outline" className="capitalize">
                  Voice: {voiceProvider}
                </Badge>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (voiceEnabled) {
                    stopPlayback();
                    setActivity("ready");
                  }
                  setVoiceEnabled((enabled) => !enabled);
                }}
                aria-label={voiceEnabled ? "Mute buyer voice" : "Enable buyer voice"}
              >
                {voiceEnabled ? (
                  <Volume2 aria-hidden="true" />
                ) : (
                  <VolumeX aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => void scoreCall()}
                disabled={!canScore || activity !== "ready"}
                aria-label="Score this call"
                title={
                  sellerTurnCount < MIN_SELLER_TURNS_TO_SCORE
                    ? `Need ${MIN_SELLER_TURNS_TO_SCORE} seller turns to score`
                    : "Score this call"
                }
              >
                {isScoring ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <ClipboardCheck aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => resetSession()}
                disabled={isBusy || recorder.isRecording}
                aria-label="Start a new session"
              >
                <RefreshCw aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={downloadTranscript}
                aria-label="Download transcript"
              >
                <Download aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-2">
              <div className="flex justify-center">
                <span className="rounded-full border border-border/80 bg-background/50 px-3 py-1 text-[0.68rem] text-muted-foreground">
                  Discovery call · {persona.industry} ·{" "}
                  <span className="capitalize">{persona.difficulty}</span>
                </span>
              </div>

              {messages.map((message) => {
                const buyer = message.role === "buyer";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      buyer ? "justify-start" : "justify-end",
                    )}
                  >
                    {buyer ? (
                      <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bot className="size-3.5" aria-hidden="true" />
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%]",
                        buyer
                          ? "rounded-tl-md border border-border/80 bg-background/65"
                          : "rounded-tr-md bg-primary text-primary-foreground",
                      )}
                    >
                      <p>{message.content}</p>
                      <p
                        className={cn(
                          "mt-1.5 text-[0.66rem]",
                          buyer
                            ? "text-muted-foreground"
                            : "text-primary-foreground/65",
                        )}
                      >
                        {buyer ? persona.name : "You"}
                      </p>
                    </div>
                  </div>
                );
              })}

              {activity === "thinking" ? (
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border/80 bg-background/65 px-4 py-3">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                        style={{ animationDelay: `${dot * 160}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {score ? (
            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border/80 bg-background/55 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium tracking-tight">
                    Call score
                  </p>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {score.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {score.mode === "live" ? "Live coach" : "Demo score"}
                  </Badge>
                  <span className="text-2xl font-semibold tabular-nums tracking-tight">
                    {score.overallScore}
                    <span className="text-sm font-normal text-muted-foreground">
                      /100
                    </span>
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {score.dimensions.map((dimension) => (
                  <div
                    key={dimension.id}
                    className="rounded-xl border border-border/70 bg-card/40 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{dimension.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {dimension.score}/10
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${dimension.score * 10}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {dimension.note}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Strengths
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-foreground/90">
                    {score.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Improvements
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-foreground/90">
                    {score.improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mx-auto w-full max-w-3xl space-y-3 border-t border-border/70 pt-4">
            {error || recorder.error ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>
                  {error ?? recorder.error}
                </AlertDescription>
              </Alert>
            ) : notice ? (
              <Alert>
                <Sparkles aria-hidden="true" />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder={
                  recorder.isRecording
                    ? "Listening… tap stop when you finish"
                    : "Ask a discovery question or present your value proposition…"
                }
                className="min-h-24 resize-none bg-background/55 pr-24 pb-11 leading-6"
                maxLength={1_200}
                disabled={isBusy || recorder.isRecording}
                aria-label="Your sales message"
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant={recorder.isRecording ? "destructive" : "outline"}
                  onClick={handleMicrophone}
                  disabled={isBusy}
                  aria-label={
                    recorder.isRecording ? "Stop recording" : "Record message"
                  }
                  className={cn(
                    recorder.isRecording &&
                      "animate-pulse ring-4 ring-destructive/15",
                  )}
                >
                  {recorder.isRecording ? (
                    <Square className="fill-current" aria-hidden="true" />
                  ) : (
                    <Mic aria-hidden="true" />
                  )}
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim() || isBusy || recorder.isRecording}
                  aria-label="Send message"
                >
                  {isBusy && !recorder.isRecording ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                </Button>
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
                {recorder.isRecording ? (
                  <>
                    <span className="size-2 animate-pulse rounded-full bg-red-400" />
                    Recording
                  </>
                ) : (
                  <>
                    <span>{draft.length}/1200</span>
                    <span className="hidden sm:inline">⌘/Ctrl + Enter to send</span>
                  </>
                )}
              </div>
            </form>

            <div
              className="flex items-center justify-between gap-3 text-[0.68rem] text-muted-foreground"
              aria-live="polite"
            >
              <span className="flex items-center gap-1.5">
                {activity === "ready" ? (
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <LoaderCircle className="size-3 animate-spin" />
                )}
                {recorder.isRecording
                  ? "Listening"
                  : activityLabels[activity]}
              </span>
              <span className="flex items-center gap-1.5">
                {voiceEnabled ? (
                  <Volume2 className="size-3" aria-hidden="true" />
                ) : (
                  <MicOff className="size-3" aria-hidden="true" />
                )}
                {messages.filter((message) => message.role === "seller").length}{" "}
                seller turns
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
