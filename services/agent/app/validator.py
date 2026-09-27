from dataclasses import dataclass


@dataclass(frozen=True)
class Verdict:
    passed: bool
    score: float
    notes: str


def validate_delivery(expected: str, delivered: str) -> Verdict:
    """Pure validator logic: deterministic and independently testable."""
    expected_tokens = set(expected.lower().split())
    delivered_tokens = set(delivered.lower().split())
    if not expected_tokens:
        return Verdict(False, 0.0, "Empty specification")
    score = len(expected_tokens & delivered_tokens) / len(expected_tokens)
    passed = score >= 0.7
    notes = "Specification satisfied" if passed else f"Coverage {score:.0%} below 70% floor"
    return Verdict(passed, score, notes)
