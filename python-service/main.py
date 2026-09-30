"""
eRTMAC-NWIS Python Processing Service

Handles tasks where Python is clearly appropriate:
- Document processing (PyMuPDF)
- OCR (PaddleOCR)
- ML/Risk models (scikit-learn, LightGBM)
- SHAP explanations
- Data processing (Pandas, NumPy)

This service exposes a small, clearly defined API contract.
The Node.js backend is the primary application API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(
    title="NWIS Python Service",
    description="Document processing, ML, and analytics for eRTMAC-NWIS",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Service health check"""
    return {
        "service": "nwis-python-service",
        "status": "healthy",
        "version": "0.1.0",
        "capabilities": {
            "document_processing": True,
            "ocr": False,  # Will be enabled when PaddleOCR is configured
            "ml_risk": False,  # Will be enabled in Phase 10
            "shap": False,  # Will be enabled in Phase 11
        },
    }


@app.get("/health/capabilities")
async def capabilities():
    """List available processing capabilities"""
    return {
        "document_processing": {
            "status": "available",
            "formats": ["pdf"],
            "library": "PyMuPDF",
        },
        "ocr": {
            "status": "not_configured",
            "library": "PaddleOCR",
            "note": "Will be enabled in Phase 3",
        },
        "ml_risk_models": {
            "status": "not_configured",
            "library": "LightGBM / scikit-learn",
            "note": "Will be enabled in Phase 10",
        },
        "shap_explanations": {
            "status": "not_configured",
            "library": "SHAP",
            "note": "Will be enabled in Phase 11",
        },
    }


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_SERVICE_PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
