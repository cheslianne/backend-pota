import pytest
from pydantic import ValidationError

from src.api.schemas.users import UserCreate, UserUpdate


def account_payload():
    return {
        "first_name": "Élise",
        "last_name": "Dela Cruz",
        "username": "elise.dela-cruz",
        "email_address": "elise@example.com",
        "phone_number": "09171234567",
        "role": "Municipal Coordinator",
        "password": "Password1!",
    }


def test_account_input_allows_unicode_letters_and_common_name_punctuation():
    payload = account_payload()
    payload["first_name"] = "श्री"
    user = UserCreate(**payload)
    assert user.first_name == "श्री"
    assert user.last_name == "Dela Cruz"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("first_name", "Ana 🙂"),
        ("last_name", "Dela@Cruz"),
        ("username", "name🙂"),
        ("phone_number", "0917-123-456"),
        ("phone_number", "０９１７１２３４５６７"),
    ],
)
def test_account_input_rejects_unsupported_characters(field, value):
    payload = account_payload()
    payload[field] = value
    with pytest.raises(ValidationError):
        UserCreate(**payload)


def test_profile_update_uses_the_same_field_validation():
    assert UserUpdate(first_name="Māori").first_name == "Māori"
    with pytest.raises(ValidationError):
        UserUpdate(first_name="Name🚀")
