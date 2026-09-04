from app.utils.folders import sanitize_name


def test_sanitize_name_strips_unsafe_characters():
    result = sanitize_name("../../etc/passwd")
    assert "/" not in result
    assert ".." not in result
    assert result == "______etc_passwd"


def test_sanitize_name_keeps_alnum_hyphen_underscore():
    assert sanitize_name("My-Project_01") == "My-Project_01"


def test_sanitize_name_truncates_to_64_chars():
    assert len(sanitize_name("a" * 100)) == 64


def test_folder_lifecycle_via_api(client, auth_headers):
    # Doesn't exist yet
    resp = client.get("/folders/lifecycle-test", headers=auth_headers)
    assert resp.status_code == 404

    # Create
    resp = client.post("/folders", json={"name": "lifecycle-test"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"name": "lifecycle-test", "created": True}

    # Now listed and empty
    resp = client.get("/folders/lifecycle-test", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["folder"] == "lifecycle-test"
    assert body["files"] == []

    resp = client.get("/folders", headers=auth_headers)
    assert any(f["name"] == "lifecycle-test" for f in resp.json()["folders"])

    # Delete
    resp = client.delete("/folders/lifecycle-test", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"deleted": "lifecycle-test"}

    resp = client.get("/folders/lifecycle-test", headers=auth_headers)
    assert resp.status_code == 404


def test_create_folder_sanitizes_traversal_attempt(client, auth_headers):
    resp = client.post("/folders", json={"name": "../../etc"}, headers=auth_headers)
    assert resp.status_code == 200
    assert "/" not in resp.json()["name"]
    assert ".." not in resp.json()["name"]


def test_delete_folder_file_rejects_path_traversal(client, auth_headers):
    client.post("/folders", json={"name": "traversal-test"}, headers=auth_headers)
    resp = client.delete("/folders/traversal-test/../../etc/passwd", headers=auth_headers)
    assert resp.status_code in (400, 404)
