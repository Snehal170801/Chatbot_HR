// src/hooks/useAudioEngine.ts

import { useRef, useCallback, useEffect } from "react";
import type { WsAudioAppendPayload } from "../types/interview";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 24000; // must match backend expectation
const BUFFER_SIZE = 4096; // ScriptProcessor chunk size
const CHANNELS = 1; // mono

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Float32 PCM → Int16 PCM (browser mic gives Float32, backend wants Int16) */
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }
  return int16;
}

/** Int16 PCM → Float32 PCM (backend sends Int16, AudioContext wants Float32) */
function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

/** ArrayBuffer → base64 string */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** base64 string → Uint8Array */
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Hook Options ─────────────────────────────────────────────────────────────

export interface UseAudioEngineOptions {
  /** Called with each encoded audio chunk ready to send over WS */
  onAudioChunk: (payload: WsAudioAppendPayload) => void;
  /** Called when VAD inside the browser detects silence (optional extra) */
  onSilence?: () => void;
}

// ─── Hook Return ──────────────────────────────────────────────────────────────

export interface UseAudioEngineReturn {
  startMic: () => Promise<void>;
  stopMic: () => void;
  playAudioChunk: (b64: string) => void;
  stopPlayback: () => void;
  isMicActive: () => boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudioEngine(
  options: UseAudioEngineOptions,
): UseAudioEngineReturn {
  // ── Refs — mic side ────────────────────────────────────────────────────────
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // ── Refs — playback side ───────────────────────────────────────────────────
  const playContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0); // scheduled end of last queued chunk

  // Keep callback in ref to avoid stale closures in ScriptProcessor
  const onAudioChunkRef = useRef(options.onAudioChunk);
  useEffect(() => {
    onAudioChunkRef.current = options.onAudioChunk;
  }, [options.onAudioChunk]);

  // ── getOrCreatePlayContext ─────────────────────────────────────────────────
  const getOrCreatePlayContext = useCallback((): AudioContext => {
    if (!playContextRef.current || playContextRef.current.state === "closed") {
      playContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      nextPlayTimeRef.current = 0;
    }
    return playContextRef.current;
  }, []);

  // ── startMic ──────────────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    // Guard: don't double-start
    if (micStreamRef.current) {
      console.warn("[Audio] startMic called but mic already active");
      return;
    }

    console.log("[Audio] requesting microphone...");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err) {
      console.error("[Audio] getUserMedia failed", err);
      throw err; // let context handle the error state
    }

    micStreamRef.current = stream;

    // AudioContext for mic processing
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    micContextRef.current = ctx;

    // Source node from mic stream
    const source = ctx.createMediaStreamSource(stream);
    micSourceRef.current = source;

    // ScriptProcessorNode — deprecated but universally supported
    // AudioWorklet would be preferred but adds complexity; matches the HTML impl
    const processor = ctx.createScriptProcessor(
      BUFFER_SIZE,
      CHANNELS,
      CHANNELS,
    );
    processorRef.current = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      // Only send if context is still running (not closed/suspended after stopMic)
      if (ctx.state !== "running") return;

      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = float32ToInt16(float32);
      const b64 = arrayBufferToBase64(int16.buffer);

      onAudioChunkRef.current({
        type: "input_audio_buffer.append",
        audio: b64,
      });
    };

    // Connect graph: mic → processor → destination (silent output)
    source.connect(processor);
    processor.connect(ctx.destination);

    console.log("[Audio] mic started, sample rate:", ctx.sampleRate);
  }, []);

  // ── stopMic ───────────────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    // Disconnect processor first to stop onaudioprocess firing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }

    // Stop all mic tracks (releases browser mic indicator)
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    // Close AudioContext
    if (micContextRef.current) {
      micContextRef.current.close().catch(() => {});
      micContextRef.current = null;
    }

    console.log("[Audio] mic stopped");
  }, []);

  // ── playAudioChunk ────────────────────────────────────────────────────────
  const playAudioChunk = useCallback(
    (b64: string) => {
      const ctx = getOrCreatePlayContext();

      // Resume context if it was suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      // Decode: base64 → Uint8Array → Int16Array → Float32Array
      const uint8 = base64ToUint8Array(b64);
      const int16 = new Int16Array(
        uint8.buffer,
        uint8.byteOffset,
        uint8.byteLength / 2,
      );
      const float32 = int16ToFloat32(int16);

      // Build an AudioBuffer from the Float32 samples
      const audioBuffer = ctx.createBuffer(
        CHANNELS,
        float32.length,
        SAMPLE_RATE,
      );
      audioBuffer.copyToChannel(float32, 0);

      // Schedule it to play right after the previous chunk ends
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // nextPlayTimeRef ensures chunks are stitched together without gaps
      const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
      source.start(startAt);

      // Advance the pointer
      nextPlayTimeRef.current = startAt + audioBuffer.duration;
    },
    [getOrCreatePlayContext],
  );

  // ── stopPlayback ──────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (playContextRef.current) {
      playContextRef.current.close().catch(() => {});
      playContextRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    console.log("[Audio] playback stopped");
  }, []);

  // ── isMicActive ───────────────────────────────────────────────────────────
  const isMicActive = useCallback(() => {
    return micStreamRef.current !== null;
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMic();
      stopPlayback();
    };
  }, [stopMic, stopPlayback]);

  return {
    startMic,
    stopMic,
    playAudioChunk,
    stopPlayback,
    isMicActive,
  };
}
