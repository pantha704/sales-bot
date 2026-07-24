"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DictationStatus = "idle" | "listening" | "error";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike> & { length: number };
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechDictationSupported() {
  return getSpeechRecognitionConstructor() !== null;
}

/**
 * Live browser speech-to-text into a text field (Chrome/Edge/Safari).
 * Uses the browser vendor cloud STT (e.g. Google in Chromium) — not our API.
 * Network/VPN/firewall blocks often surface as error code "network".
 */
export function useSpeechDictation(options: {
  onTranscript: (text: string, meta: { isFinal: boolean }) => void;
  /** Called for fatal recognition errors so the UI can fall back (e.g. Whisper). */
  onFatalError?: (code: string, message: string) => void;
  lang?: string;
}) {
  const { onTranscript, onFatalError, lang = "en-US" } = options;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const intentionalStopRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onFatalErrorRef = useRef(onFatalError);
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const supported = isBrowserSpeechDictationSupported();

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onFatalErrorRef.current = onFatalError;
  }, [onFatalError]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    }
    recognitionRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(() => {
    setError(null);
    setLastErrorCode(null);
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      const message =
        "Live dictation is not supported in this browser. Use Chrome/Edge, or type your message.";
      setError(message);
      setLastErrorCode("not-supported");
      setStatus("error");
      onFatalErrorRef.current?.("not-supported", message);
      throw new Error(message);
    }

    // Stop any previous session.
    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    intentionalStopRef.current = false;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += piece;
        } else {
          interimChunk += piece;
        }
      }

      if (finalChunk.trim()) {
        onTranscriptRef.current(finalChunk, { isFinal: true });
      }
      if (interimChunk.trim()) {
        onTranscriptRef.current(interimChunk, { isFinal: false });
      }
    };

    recognition.onerror = (event) => {
      // "aborted" / "no-speech" are normal when stopping or pausing.
      if (
        event.error === "aborted" ||
        event.error === "no-speech" ||
        intentionalStopRef.current
      ) {
        return;
      }

      const code = event.error || "unknown";
      const message =
        code === "not-allowed"
          ? "Microphone permission was denied."
          : code === "network"
            ? "Browser live dictation could not reach the speech service (VPN/firewall/offline). Falling back to server transcription if available."
            : code === "service-not-allowed"
              ? "Browser speech service is blocked on this device."
              : `Speech recognition error: ${code}`;
      setLastErrorCode(code);
      setError(message);
      setStatus("error");
      recognitionRef.current = null;
      onFatalErrorRef.current?.(code, message);
    };

    recognition.onend = () => {
      // Chrome ends sessions periodically; restart if user still wants listening.
      if (!intentionalStopRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to idle
        }
      }
      recognitionRef.current = null;
      setStatus((current) => (current === "error" ? current : "idle"));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatus("listening");
    } catch (cause) {
      recognitionRef.current = null;
      const message =
        cause instanceof Error
          ? cause.message
          : "Could not start live dictation.";
      setError(message);
      setLastErrorCode("start-failed");
      setStatus("error");
      onFatalErrorRef.current?.("start-failed", message);
      throw new Error(message, { cause });
    }
  }, [lang]);

  const clearError = useCallback(() => {
    setError(null);
    setLastErrorCode(null);
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      intentionalStopRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    },
    [],
  );

  return {
    supported,
    status,
    error,
    lastErrorCode,
    isListening: status === "listening",
    start,
    stop,
    clearError,
  };
}
