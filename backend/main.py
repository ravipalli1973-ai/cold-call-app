import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL or SUPABASE_KEY is missing from .env")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
ai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

app = FastAPI(title="Cold Call Copilot Backend")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class StartCallRequest(BaseModel):
    prospect_name: Optional[str] = "Prospect"
    company_name: Optional[str] = "Company"

class StageRecordRequest(BaseModel):
    stage_number: int
    stage_name: str
    stage_outcome: str
    prospect_verbatim: str

class EndCallRequest(BaseModel):
    final_outcome: str

# Endpoints
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Cold Call Backend is healthy"}

@app.post("/calls/start")
def start_call(req: StartCallRequest):
    res = supabase.table("calls").insert({
        "prospect_name": req.prospect_name,
        "company_name": req.company_name,
        "highest_stage_reached": 1
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to initialize call")
    return res.data[0]

@app.post("/calls/{call_id}/stage")
def save_stage(call_id: str, req: StageRecordRequest):
    stage_res = supabase.table("call_stages").insert({
        "call_id": call_id,
        "stage_number": req.stage_number,
        "stage_name": req.stage_name,
        "stage_outcome": req.stage_outcome,
        "prospect_verbatim": req.prospect_verbatim
    }).execute()

    supabase.table("calls").update({
        "highest_stage_reached": req.stage_number
    }).eq("id", call_id).execute()

    return {"status": "recorded", "data": stage_res.data}

@app.post("/calls/{call_id}/end")
def end_call(call_id: str, req: EndCallRequest):
    stages = supabase.table("call_stages").select("*").eq("call_id", call_id).order("stage_number").execute().data

    summary = f"Call ended with status: {req.final_outcome}"
    if ai_client:
        if stages:
            formatted_notes = "\n".join([
                f"Stage {s['stage_number']} ({s['stage_name']}): Outcome='{s.get('stage_outcome', '')}', Verbatim='{s.get('prospect_verbatim', '')}'"
                for s in stages
            ])
            prompt = (
                f"Live cold call notes:\n{formatted_notes}\n\n"
                f"Final Outcome: {req.final_outcome}\n\n"
                "Generate a crisp 2-sentence CRM recap: Sentence 1 states what happened and the prospect's stance. "
                "Sentence 2 states the immediate next action."
            )
        else:
            prompt = (
                f"A cold call concluded early with outcome: {req.final_outcome}.\n\n"
                "Provide a 1-sentence CRM logging note and recommended next follow-up action."
            )

        candidate_models = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-2.5-pro"]
        
        for model_name in candidate_models:
            try:
                ai_res = ai_client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if ai_res and ai_res.text:
                    summary = ai_res.text.strip()
                    break
            except Exception:
                continue
        else:
            summary = f"Call completed ({req.final_outcome}). Follow-up required based on stage notes."

    update_res = supabase.table("calls").update({
        "final_outcome": req.final_outcome,
        "ai_summary": summary
    }).eq("id", call_id).execute()

    return {"status": "ended", "ai_summary": summary, "call": update_res.data}

@app.get("/calls")
def list_calls():
    res = supabase.table("calls").select("*, call_stages(*)").order("created_at", desc=True).execute()
    return res.data