import asyncio, json, aiohttp, uuid, io, base64, os
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pinecone import Pinecone, ServerlessSpec
from PyPDF2 import PdfReader
import uvicorn

app = FastAPI()

# ── NEW: ALLOW BROWSER TO SEE MP4 FILES ──
if not os.path.exists("assets"):
    os.makedirs("assets")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ── AZURE CONFIG ──
AZURE_API_KEY  = os.getenv("AZURE_API_KEY", "")
AZURE_ENDPOINT = "ariha-mm3gcbg9-eastus2.cognitiveservices.azure.com"

# Important: Voice and Text models need different deployments
MODEL_NAME      = "gpt-realtime-2"  # For live voice chat
TEXT_MODEL_NAME = "gpt-4o"          # For generating the Evaluation Report JSON

WS_URL  = f"wss://{AZURE_ENDPOINT}/openai/v1/realtime?model={MODEL_NAME}"
HEADERS = {"api-key": AZURE_API_KEY}

# ── PINECONE CONFIG ──
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
pc = Pinecone(api_key=PINECONE_API_KEY)
INDEX_NAME = "interview-sessions"

if INDEX_NAME not in pc.list_indexes().names():
    print(f"[Pinecone] Creating new index '{INDEX_NAME}'...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=1024,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

pinecone_index = pc.Index(INDEX_NAME)

# ── IN-MEMORY SESSION LIST ──
sessions_list: list[dict] = []

# ── PDF EXTRACTOR ──
def extract_pdf_text(b64_string):
    if not b64_string:
        return "No document provided."
    try:
        pdf_bytes = base64.b64decode(b64_string)
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
    except Exception as e:
        return "Error extracting PDF text."

def extract_candidate_name(resume_text: str) -> str:
    for line in resume_text.splitlines():
        clean = line.strip()
        if clean and len(clean) < 60:
            return clean
    return "Unknown Candidate"

def generate_hr_prompt(jd_text, resume_text):
    return f"""
You are Anushka, a professional, warm, and highly capable HR Interviewer.

JOB DESCRIPTION:
{jd_text}

CANDIDATE RESUME:
{resume_text}

STRICT GUARDRAILS & BOUNDARIES:
1. You must ONLY discuss topics directly related to the Job Description, the Candidate's Resume, or standard professional behavioral questions.
2. NEVER entertain off-topic questions.
3. You are representing the company. Do not break character.

LANGUAGE & STT/TTS ACCURACY PROTOCOL:
1. SUPPORTED LANGUAGES: English, Hindi, Marathi, and Gujarati ONLY. 
2. AUDIO COMPREHENSION: Actively anticipate code-switching.
3. NOISE & BACKGROUND OVERRIDE: IGNORE gibberish, unsupported scripts, and background noise.

INTERVIEW PROTOCOL:
- Greeting: Warmly greet the candidate by name, ask for a self-introduction, and mention the specific job role.
- TIME & LIMIT: MAXIMUM 10 to 15 questions. Strictly limited to 30 minutes. 
- Pacing: Ask exactly ONE question at a time. Keep your turns to 2-3 sentences max.
"""

# ── REST ROUTES ────────────────────────────────────────────────────────

@app.get("/api/sessions")
async def get_sessions():
    return list(reversed(sessions_list))

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    for s in sessions_list:
        if s["id"] == session_id:
            return s
    raise HTTPException(status_code=404, detail="Session not found")

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    global sessions_list
    try:
        pinecone_index.delete(ids=[session_id])
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")
        
    sessions_list = [s for s in sessions_list if s["id"] != session_id]
    return {"status": "deleted", "id": session_id}


# ── EVALUATION ENDPOINT ──
def generate_fallback_report(transcript):
    turns = transcript.count("Candidate:")
    if turns == 0:
        return {
            "overall_summary": "The interview was ended before the candidate answered any questions. No data available.",
            "decision": "No Hire",
            "communication": {"score": 0, "feedback": "Candidate did not speak."},
            "technical": {"score": 0, "feedback": "No technical skills discussed."},
            "behavioural": {"score": 0, "feedback": "No behavioural traits observed."}
        }
    else:
        return {
            "overall_summary": "The candidate completed the interview, but the AI evaluation engine is currently offline.",
            "decision": "Hold",
            "communication": {"score": 5, "feedback": f"Candidate participated in {turns} conversational exchanges."},
            "technical": {"score": 5, "feedback": "Requires manual review."},
            "behavioural": {"score": 5, "feedback": "Requires manual review."}
        }

@app.get("/api/evaluate/{session_id}")
async def evaluate_session(session_id: str):
    session_data = None
    for s in sessions_list:
        if s["id"] == session_id:
            session_data = s
            break
            
    if not session_data or not session_data.get("transcript"):
        return generate_fallback_report("")
    
    if "evaluation" in session_data:
        return session_data["evaluation"]
    
    transcript = session_data["transcript"]
    jd = session_data.get("jd_text", "")
    resume = session_data.get("resume_text", "")

    # NEW: Prompt explicitly commands AI to rate even a single-question interview
    prompt = f"""
    You are an expert Technical HR Evaluator.
    Analyze the following interview transcript against the Job Description and Candidate Resume.
    
    CRITICAL INSTRUCTION: Even if the candidate only answered ONE single question, you MUST generate the full evaluation report and provide ratings based on whatever context is available in that single answer. Do not refuse to evaluate.
    
    Provide a detailed evaluation strictly in the following JSON format:
    
    {{
        "overall_summary": "Detailed paragraph explaining the overall impression...",
        "decision": "Hold", 
        "communication": {{ "score": 8, "feedback": "Detailed paragraph..." }},
        "technical": {{ "score": 7, "feedback": "Detailed paragraph..." }},
        "behavioural": {{ "score": 6, "feedback": "Detailed paragraph..." }}
    }}
    Note: The "decision" field MUST be exactly one of these strings: "Hire", "No Hire", or "Hold". The scores must be integers out of 10.

    JOB DESCRIPTION:
    {jd}

    RESUME:
    {resume}

    TRANSCRIPT:
    {transcript}
    """

    # NEW: Using TEXT_MODEL_NAME to prevent Azure endpoint crashes
    url = f"https://{AZURE_ENDPOINT}/openai/deployments/{TEXT_MODEL_NAME}/chat/completions?api-version=2024-02-15-preview"
    
    payload = {
        "messages": [
            {"role": "system", "content": "You are an expert AI HR Evaluator. You MUST output valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "response_format": { "type": "json_object" }
    }

    result = None
    async with aiohttp.ClientSession() as client:
        try:
            async with client.post(url, headers=HEADERS, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    content = data["choices"][0]["message"]["content"]
                    content = content.replace("```json", "").replace("", "").strip()
                    result = json.loads(content)
                else:
                    print(f"[Evaluation] API fallback triggered. Status: {resp.status}")
                    result = generate_fallback_report(transcript)
        except Exception as e:
            print(f"[Evaluation] Exception fallback triggered: {e}")
            result = generate_fallback_report(transcript)

    session_data["evaluation"] = result

    try:
        pinecone_index.update(
            id=session_id, 
            set_metadata={"evaluation": json.dumps(result)}
        )
    except Exception as e:
        print(f"[Pinecone] Failed to update evaluation metadata: {e}")

    return result


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("index.html", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/health")
async def health():
    return {"status": "ok"}

# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_proxy(client: WebSocket):
    await client.accept()

    try:
        init_raw = await asyncio.wait_for(client.receive_text(), timeout=120.0)
        init_data = json.loads(init_raw)

        if init_data.get("type") != "init":
            await client.close()
            return

        jd_text     = extract_pdf_text(init_data.get("jd_b64"))
        resume_text = extract_pdf_text(init_data.get("resume_b64"))
        job_title   = init_data.get("job_title", "Unknown Role")

    except Exception as e:
        await client.close()
        return

    session_id       = str(uuid.uuid4())
    session_transcript = []
    candidate_name   = extract_candidate_name(resume_text)
    dynamic_prompt   = generate_hr_prompt(jd_text, resume_text)

    await client.send_text(json.dumps({"type": "session.assigned", "id": session_id}))

    async with aiohttp.ClientSession() as session:
        try:
            azure = await session.ws_connect(
                WS_URL, headers=HEADERS, ssl=True,
                heartbeat=20, max_msg_size=10 * 1024 * 1024
            )
        except Exception as e:
            await client.send_text(json.dumps({"type": "error", "error": {"message": f"Cannot connect: {e}"}}))
            return

        try:
            raw = await asyncio.wait_for(azure.receive(), timeout=8.0)
            if raw.type == aiohttp.WSMsgType.TEXT:
                await client.send_text(raw.data)
        except asyncio.TimeoutError:
            return

        try:
            await azure.send_str(json.dumps({
                "type": "session.update",
                "session": {
                    "type": "realtime",
                    "instructions": dynamic_prompt,
                    "output_modalities": ["audio"],
                    "audio": {
                        "input": {
                            "format": { "type": "audio/pcm", "rate": 24000 },
                            "transcription": { "model": "whisper-1" },
                            "turn_detection": {
                                "type": "server_vad",
                                "threshold": 0.85, 
                                "prefix_padding_ms": 200,
                                "silence_duration_ms": 1000
                            }
                        },
                        "output": {
                            "voice": "shimmer",
                            "format": { "type": "audio/pcm", "rate": 24000 }
                        }
                    }
                }
            }))
        except Exception as e:
            pass

        try:
            ack = await asyncio.wait_for(azure.receive(), timeout=3.0)
            if ack.type == aiohttp.WSMsgType.TEXT:
                await client.send_text(ack.data)
        except asyncio.TimeoutError:
            pass

        try:
            await azure.send_str(json.dumps({
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{
                        "type": "input_text",
                        "text": f"Hello Anushka, I am ready to begin my interview."
                    }]
                }
            }))
            await azure.send_str(json.dumps({"type": "response.create"}))
        except Exception as e:
            return

        async def client_to_azure():
            try:
                async for text in client.iter_text():
                    if not azure.closed:
                        await azure.send_str(text)
            except WebSocketDisconnect:
                pass
            finally:
                # CRITICAL FIX: when the browser disconnects (End Session),
                # azure_to_client() was left hanging forever on "async for msg in azure"
                # because nothing ever closed the Azure socket. That meant
                # asyncio.gather() never returned, so sessions_list.append()
                # never ran in time (or at all) -> /api/evaluate always found
                # no session -> empty "candidate did not speak" report.
                if not azure.closed:
                    await azure.close()

        async def azure_to_client():
            try:
                async for msg in azure:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        t = data.get("type", "")
                        print(f"[AZURE EVENT] {t}")

                        if t == "conversation.item.input_audio_transcription.completed":
                            user_text = data.get("transcript", "")
                            # DEBUG: see exactly what Azure sent for this event
                            print(f"[DEBUG] candidate transcript event: {repr(user_text)}")
                            if user_text and user_text.strip():
                                session_transcript.append(f"Candidate: {user_text.strip()}")

                        elif t == "response.output_audio_transcript.done":
                            anushka_text = data.get("transcript", "")
                            # DEBUG: see exactly what Azure sent for this event
                            print(f"[DEBUG] anushka transcript event: {repr(anushka_text)}")
                            if anushka_text and anushka_text.strip():
                                session_transcript.append(f"Anushka: {anushka_text.strip()}")

                        try:
                            await client.send_text(msg.data)
                        except Exception:
                            break

                    elif msg.type in (aiohttp.WSMsgType.ERROR, aiohttp.WSMsgType.CLOSED):
                        break
            except Exception:
                pass

        # DEBUG: catch + report any exception that gather() raises instead of
        # silently skipping the rest of the function (which would skip the
        # sessions_list.append below and explain the empty-report bug)
        try:
            await asyncio.gather(client_to_azure(), azure_to_client())
        except Exception as e:
            print(f"[DEBUG] gather() crashed: {repr(e)}")

        # DEBUG: show exactly what ended up in session_transcript before we
        # build the report from it
        print(f"[DEBUG] FINAL session_transcript ({len(session_transcript)} lines): {session_transcript}")

        full_interview_text = "\n".join(session_transcript) if session_transcript else ""
        timestamp = datetime.now().isoformat()

        # NEW: SAVE TO MEMORY FIRST (Fixes the Race Condition Bug!)
        sessions_list.append({
            "id":             session_id,
            "candidate_name": candidate_name,
            "job_title":      job_title,
            "timestamp":      timestamp,
            "transcript":     full_interview_text,
            "jd_text":        jd_text,
            "resume_text":    resume_text
        })

        # THEN SAVE TO PINECONE
        if full_interview_text:
            try:
                embeddings = pc.inference.embed(
                    model="multilingual-e5-large",
                    inputs=[full_interview_text],
                    parameters={"input_type": "passage"}
                )
                vector = embeddings[0].values

                pinecone_index.upsert(
                    vectors=[{
                        "id": session_id,
                        "values": vector,
                        "metadata": {
                            "timestamp": timestamp,
                            "transcript": full_interview_text,
                            "candidate_name": candidate_name,
                            "job_title": job_title,
                        }
                    }]
                )
            except Exception as e:
                print(f"[Pinecone] Failed to save session: {e}")

if __name__ == "__main__":
    import threading
    import webbrowser

    def open_browser():
        webbrowser.open("http://127.0.0.1:8008")

    threading.Timer(1.5, open_browser).start()
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=False)