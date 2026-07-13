import os
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env before imports
load_dotenv()

from app.processors.extract import extract_text
from app.processors.analyze import analyze_report, check_drug_interactions

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="MediCare AI Service", version="1.0.0")

# Setup CORS
allowed_origins = [
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class InteractionsRequest(BaseModel):
    existingMedications: List[str]
    newMedication: str

# Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint to verify service is running."""
    from app.processors.analyze import GROQ_MODEL, groq_client
    return {
        "status": "ok", 
        "model": GROQ_MODEL,
        "provider": "groq" if groq_client else "gemini",
        "api_key_configured": bool(groq_client) or bool(os.environ.get("GEMINI_API_KEY"))
    }

@app.post("/process/extract")
async def process_extract(
    file: UploadFile = File(...),
    file_type: str = Form("pdf"),
    language: str = Form("English")
):
    """Extract text from uploaded medical report file."""
    try:
        content = await file.read()
        extracted_text = extract_text(content, file.content_type or file_type)
        return {"rawText": extracted_text, "charCount": len(extracted_text)}
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@app.post("/process/analyze")
async def process_analyze(
    file: UploadFile = File(...),
    file_type: str = Form("pdf"),
    language: str = Form("English")
):
    """Full pipeline: Extract text and analyze with AI."""
    try:
        content = await file.read()
        extracted_text = extract_text(content, file.filename.split('.')[-1].lower() if '.' in file.filename else file_type)
        
        mime_type = file.content_type or ("application/pdf" if file_type == "pdf" else "image/png")
        analysis = await analyze_report(extracted_text, language, content, mime_type)
        # Combine extracted text with the analysis results
        analysis["rawText"] = extracted_text
        return analysis
        
    except Exception as e:
        logger.error(f"Analyze error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/process/interactions")
async def process_interactions(request: InteractionsRequest):
    """Check for drug interactions between existing meds and a new one."""
    try:
        interactions = await check_drug_interactions(
            request.existingMedications, 
            request.newMedication
        )
        return {"interactions": interactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interaction check failed: {str(e)}")

@app.post("/process/qa")
async def process_qa(
    report_text: str = Form(...),
    question: str = Form(...),
    language: str = Form("English")
):
    """Answer a user's question based on their medical report."""
    try:
        from app.processors.analyze import answer_question
        answer = await answer_question(report_text, question, language)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"QA error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"QA failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
