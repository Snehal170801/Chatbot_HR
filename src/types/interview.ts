// src/types/interview.ts

// ─── Interview Session Status ─────────────────────────────────────────────────

export type InterviewStatus =
  | "idle" // Nothing started yet
  | "connecting" // WebSocket opening
  | "ready" // Connected, waiting for user to speak
  | "listening" // VAD detected user speech
  | "speaking" // Aria is responding with audio
  | "error"; // Something went wrong

// ─── Chat Message (UI layer) ──────────────────────────────────────────────────

export type MessageRole = "user" | "aria";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isPartial?: boolean; // true while transcript delta is still streaming in
}

// ─── Outgoing WS Payloads (client → server) ───────────────────────────────────

export interface WsInitPayload {
  type: "init";
  jd_b64: string;
  resume_b64: string;
  job_title: string;
}

export interface WsAudioAppendPayload {
  type: "input_audio_buffer.append";
  audio: string; // base64 encoded PCM Int16 at 24kHz mono
}

export type WsOutgoingMessage = WsInitPayload | WsAudioAppendPayload;

// ─── Incoming WS Messages (server → client) ───────────────────────────────────

// ── NEW: Backend's own session ID (sent before session.created) ───────────────
// main.py sends: { "type": "session.assigned", "id": "<uuid4>" }
// This is the ID used for /api/evaluate/{session_id} and /api/sessions/{session_id}
export interface WsMsgSessionAssigned {
  type: "session.assigned";
  id: string; // backend UUID — use this for all REST API calls
}

// Session lifecycle (from Azure/OpenAI — NOT the backend session ID)
export interface WsMsgSessionCreated {
  type: "session.created";
  session: {
    id: string;
    model: string;
    instructions?: string;
    voice?: string;
    input_audio_format?: string;
    output_audio_format?: string;
    turn_detection?: {
      type: string;
      threshold?: number;
      silence_duration_ms?: number;
    };
  };
}

export interface WsMsgSessionUpdated {
  type: "session.updated";
  session: WsMsgSessionCreated["session"];
}

// Speech detection (VAD)
export interface WsMsgSpeechStarted {
  type: "input_audio_buffer.speech_started";
  audio_start_ms: number;
  item_id: string;
}

export interface WsMsgSpeechStopped {
  type: "input_audio_buffer.speech_stopped";
  audio_end_ms: number;
  item_id: string;
}

// Response lifecycle
export interface WsMsgResponseCreated {
  type: "response.created";
  response: {
    id: string;
    status: string;
    output: unknown[];
  };
}

// Audio output from Aria
export interface WsMsgOutputAudioDelta {
  type: "response.output_audio.delta";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 encoded PCM Int16 audio chunk
}

// Aria's transcript streaming in word by word
export interface WsMsgOutputTranscriptDelta {
  type: "response.output_audio_transcript.delta";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // partial text
}

// Aria's transcript fully complete
export interface WsMsgOutputTranscriptDone {
  type: "response.output_audio_transcript.done";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string; // full final text
}

// User's speech transcription complete
export interface WsMsgInputTranscriptionCompleted {
  type: "conversation.item.input_audio_transcription.completed";
  item_id: string;
  content_index: number;
  transcript: string; // what the user said
}

// Full response cycle done
export interface WsMsgResponseDone {
  type: "response.done";
  response: {
    id: string;
    status: "completed" | "cancelled" | "failed" | "incomplete";
    output: Array<{
      id: string;
      type: string;
      role: string;
      content: Array<{
        type: string;
        transcript?: string;
        audio?: string;
      }>;
    }>;
    usage?: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
    };
  };
}

// Error from server
export interface WsMsgError {
  type: "error";
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string;
    event_id?: string;
  };
}

// ─── Union of ALL incoming message types ─────────────────────────────────────

export type WsIncomingMessage =
  | WsMsgSessionAssigned // ← NEW: backend UUID (comes first)
  | WsMsgSessionCreated // Azure/OpenAI session (do NOT use for REST calls)
  | WsMsgSessionUpdated
  | WsMsgSpeechStarted
  | WsMsgSpeechStopped
  | WsMsgResponseCreated
  | WsMsgOutputAudioDelta
  | WsMsgOutputTranscriptDelta
  | WsMsgOutputTranscriptDone
  | WsMsgInputTranscriptionCompleted
  | WsMsgResponseDone
  | WsMsgError;

// ─── Interview Context State Shape ───────────────────────────────────────────

export interface InterviewState {
  status: InterviewStatus;
  messages: ChatMessage[];
  sessionId: string | null; // backend UUID from session.assigned
  isMuted: boolean;
  errorMessage: string | null;
}

// ─── File Upload State ────────────────────────────────────────────────────────

export interface UploadedFile {
  name: string;
  b64: string; // base64 encoded content
  sizeKb: number;
}

export interface InterviewFiles {
  jd: UploadedFile | null;
  resume: UploadedFile | null;
}

// ─── Session (from GET /api/sessions) ────────────────────────────────────────

export interface Session {
  id: string;
  candidate_name: string;
  job_title: string;
  timestamp: string;
  transcript?: string;
}

// ── NEW: Evaluation Report (from GET /api/evaluate/{session_id}) ──────────────
// Matches exactly what main.py returns — both the AI result and the fallback shape

export interface EvaluationCategory {
  score: number; // integer 0–10
  feedback: string;
}

export type EvaluationDecision = "Hire" | "No Hire" | "Hold";

export interface EvaluationReport {
  overall_summary: string;
  decision: EvaluationDecision;
  communication: EvaluationCategory;
  technical: EvaluationCategory;
  behavioural: EvaluationCategory;
}
