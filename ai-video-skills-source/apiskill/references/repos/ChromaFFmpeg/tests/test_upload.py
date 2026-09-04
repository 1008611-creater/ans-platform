def test_upload_video_defaults_to_upload_folder(client, auth_headers):
    resp = client.post(
        "/upload",
        headers=auth_headers,
        files={"file": ("clip.mp4", b"not-real-video-bytes", "video/mp4")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["folder"] == "upload"
    assert body["filename"].endswith(".mp4")
    assert body["size_bytes"] == len(b"not-real-video-bytes")
    assert "/store/upload/" in body["url"]


def test_upload_audio_defaults_to_audio_folder(client, auth_headers):
    resp = client.post(
        "/upload",
        headers=auth_headers,
        files={"file": ("track.mp3", b"not-real-audio-bytes", "audio/mpeg")},
    )
    assert resp.status_code == 200
    assert resp.json()["folder"] == "audio"


def test_upload_folder_override(client, auth_headers):
    resp = client.post(
        "/upload",
        headers=auth_headers,
        data={"folder": "my-project"},
        files={"file": ("photo.jpg", b"not-real-image-bytes", "image/jpeg")},
    )
    assert resp.status_code == 200
    assert resp.json()["folder"] == "my-project"


def test_upload_filenames_are_randomized_not_original(client, auth_headers):
    resp = client.post(
        "/upload",
        headers=auth_headers,
        files={"file": ("secret-original-name.jpg", b"data", "image/jpeg")},
    )
    filename = resp.json()["filename"]
    assert filename != "secret-original-name.jpg"
    assert filename.endswith(".jpg")


def test_upload_requires_api_key(client):
    resp = client.post("/upload", files={"file": ("clip.mp4", b"data", "video/mp4")})
    assert resp.status_code == 422
