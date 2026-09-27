from app.validator import validate_delivery


def test_validator_accepts_matching_delivery() -> None:
    verdict = validate_delivery("fresh weather forecast", "fresh weather forecast")
    assert verdict.passed is True


def test_validator_rejects_garbage_delivery() -> None:
    verdict = validate_delivery("fresh weather forecast", "unrelated output")
    assert verdict.passed is False
