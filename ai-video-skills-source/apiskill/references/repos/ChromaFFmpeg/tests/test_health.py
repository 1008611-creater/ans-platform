def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_health_requires_no_api_key(client):
    """/health is intentionally unauthenticated so it works as a Docker healthcheck."""
    resp = client.get("/health", headers={})
    assert resp.status_code == 200
