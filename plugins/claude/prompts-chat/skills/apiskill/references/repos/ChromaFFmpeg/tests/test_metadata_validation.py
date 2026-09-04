"""
Regression tests for the POST /metadata scheme boundary.

req.url is passed straight into the ffprobe subprocess rather than through
the httpx downloader, so ffmpeg's own protocol handlers (file:, concat:,
subfile:, etc.) must never be reachable through this field. See
app/routes/metadata.py: MetadataRequest._require_http_scheme.
"""
import pytest

from app.routes.metadata import MetadataRequest


@pytest.mark.parametrize("bad_url", [
    "file:///etc/passwd",
    "concat:/a|/b",
    "/etc/passwd",
    "ftp://example.com/video.mp4",
    "subfile,,start,0,end,100,,:/etc/passwd",
])
def test_non_http_scheme_is_rejected(client, auth_headers, bad_url):
    resp = client.post("/metadata", json={"url": bad_url}, headers=auth_headers)
    assert resp.status_code == 422


def test_missing_url_field_is_rejected(client, auth_headers):
    resp = client.post("/metadata", json={}, headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.parametrize("good_url", [
    "http://example.com/video.mp4",
    "https://example.com/video.mp4",
])
def test_http_and_https_schemes_pass_validation(good_url):
    """
    Model-level check only — going through the live endpoint would shell out to
    the real ffprobe binary against a real network URL, which is neither
    hermetic nor something this test suite should depend on.
    """
    req = MetadataRequest(url=good_url)
    assert req.url == good_url
