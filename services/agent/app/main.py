import os
from fastapi import FastAPI
from pydantic import BaseModel
from .validator import validate_delivery

app = FastAPI(title="Amanat Agent Service")


class ValidationRequest(BaseModel):
    expected: str
    delivered: str


@app.get("/health")
def health() -> dict[str, bool | str]:
    return {"ok": True, "service": "agent"}


@app.post("/validate")
def validate(request: ValidationRequest) -> dict[str, object]:
    verdict = validate_delivery(request.expected, request.delivered)
    return {"passed": verdict.passed, "score": verdict.score, "notes": verdict.notes}


@app.post("/run-demo")
def run_demo() -> dict[str, str]:
    return {"status": "queued", "chain": os.getenv("ACTIVE_CHAIN", "anvil")}
