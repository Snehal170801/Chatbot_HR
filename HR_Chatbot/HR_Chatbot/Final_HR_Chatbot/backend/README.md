# Aria — HR Interview Agent

A real-time speech-to-speech HR interview agent powered by Azure OpenAI Realtime API (GPT-4o Realtime).

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the server

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Open the app

Navigate to → **http://localhost:8000**

Click **"Start Interview"** and allow microphone access when prompted.

---

## How It Works

```
Browser Mic → PCM16 Audio → WebSocket → FastAPI → Azure OpenAI Realtime API
                                                         ↓
Browser Speaker ← PCM16 Audio ← WebSocket ← FastAPI ←──┘
```

- **Backend**: FastAPI acts as a WebSocket proxy, forwarding audio chunks bidirectionally between browser and Azure.
- **Frontend**: Web Audio API captures mic input at 24kHz PCM16, streams it to the server in base64 chunks, and plays back Aria's audio response in real time.
- **VAD**: Azure server-side Voice Activity Detection automatically detects when you stop speaking and triggers Aria's response.
- **Transcription**: Both Aria's speech and your speech are transcribed and shown as chat bubbles.

---

## Configuration

Edit `main.py` to change:

| Variable | Default | Description |
|---|---|---|
| `AZURE_API_KEY` | (your key) | Azure Cognitive Services API key |
| `AZURE_ENDPOINT` | (your endpoint) | Azure endpoint hostname |
| `MODEL_NAME` | `gpt-realtime-2` | Realtime model name |
| `API_VERSION` | `2026-05-06` | API version |
| `HR_SYSTEM_PROMPT` | Aria's persona | Customize the interviewer's personality |

---

## Troubleshooting

**"Microphone access denied"** — Allow mic permissions in your browser when prompted.

**"Connection error"** — Ensure the FastAPI server is running on port 8000.

**No audio playback** — Click somewhere on the page first (browsers require user interaction before audio playback).

**Echo/feedback** — Use headphones to prevent Aria's voice from being picked up by your mic.
