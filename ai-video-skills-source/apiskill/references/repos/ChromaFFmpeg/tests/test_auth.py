"""
Every route except /health, /, and the /files, /store, /static mounts depends
on verify_api_key (app/auth.py). These tests pin down that boundary using
GET /folders as a representative protected endpoint.
"""


def test_missing_api_key_header_is_rejected(client):
    resp = client.get("/folders")
    assert resp.status_code == 422
    assert "detail" in resp.json()


def test_wrong_api_key_is_rejected(client):
    resp = client.get("/folders", headers={"X-API-Key": "not-the-real-key"})
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"] == "Invalid API key"


def test_correct_api_key_is_accepted(client, auth_headers):
    resp = client.get("/folders", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "folders" in body and "count" in body
