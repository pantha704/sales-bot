"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "stopping"
  | "error";

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useAudioRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((blob: Blob) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const resetMedia = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      const message = "This browser does not support microphone recording.";
      setError(message);
      setStatus("error");
      throw new Error(message);
    }

    try {
      setStatus("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        const failure = new Error("The microphone recording failed.");
        rejectRef.current?.(failure);
        rejectRef.current = null;
        resolveRef.current = null;
        setError(failure.message);
        setStatus("error");
        resetMedia();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const resolve = resolveRef.current;

        resolveRef.current = null;
        rejectRef.current = null;
        resetMedia();
        setStatus("idle");
        resolve?.(blob);
      };
      recorder.start(250);
      setStatus("recording");
    } catch (cause) {
      resetMedia();
      const message =
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not access the microphone.";
      setError(message);
      setStatus("error");
      throw new Error(message, { cause });
    }
  }, [resetMedia]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return Promise.reject(new Error("No recording is in progress."));
    }

    setStatus("stopping");

    return new Promise<Blob>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      recorder.stop();
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      stopTracks(streamRef.current);
    },
    [],
  );

  return {
    status,
    error,
    isRecording: status === "recording",
    startRecording,
    stopRecording,
    clearError,
  };
}
