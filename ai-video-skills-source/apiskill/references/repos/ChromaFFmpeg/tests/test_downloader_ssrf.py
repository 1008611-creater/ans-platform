"""
Regression tests for the SSRF/size-cap boundary in app/utils/downloader.py.

No real network calls: socket.getaddrinfo is monkeypatched so these stay
hermetic and fast, the same way the rest of the suite avoids depending on
live network access or a real ffmpeg binary. Async calls are driven with
asyncio.run() rather than pytest-asyncio, to avoid adding that dependency
for a handful of tests.
"""
import asyncio
import socket

import pytest
from fastapi import HTTPException

from app.utils.downloader import _assert_url_is_fetchable, _is_private_or_reserved


@pytest.mark.parametrize("ip,expected", [
    ("10.0.0.5", True),
    ("172.16.0.1", True),
    ("192.168.1.1", True),
    ("127.0.0.1", True),
    ("169.254.169.254", True),   # cloud metadata endpoint (AWS/GCP/Azure) — link-local
    ("::1", True),
    ("0.0.0.0", True),
    ("8.8.8.8", False),
    ("93.184.216.34", False),    # example.com-class public address
])
def test_is_private_or_reserved(ip, expected):
    assert _is_private_or_reserved(ip) is expected


def _fake_getaddrinfo(ip_str):
    def _inner(host, port):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip_str, 0))]
    return _inner


def test_rejects_hostname_resolving_to_private_ip(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo("169.254.169.254"))
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_assert_url_is_fetchable("http://metadata.internal/latest/meta-data/"))
    assert exc_info.value.status_code == 400
    assert "private/internal" in exc_info.value.detail["error"]


def test_allows_hostname_resolving_to_public_ip(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo("93.184.216.34"))
    asyncio.run(_assert_url_is_fetchable("https://example.com/video.mp4"))  # must not raise


def test_rejects_non_http_scheme():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_assert_url_is_fetchable("file:///etc/passwd"))
    assert exc_info.value.status_code == 400


def test_rejects_dns_resolution_failure(monkeypatch):
    def _raise(host, port):
        raise socket.gaierror("Name or service not known")
    monkeypatch.setattr(socket, "getaddrinfo", _raise)
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_assert_url_is_fetchable("http://this-host-does-not-exist.invalid/x"))
    assert exc_info.value.status_code == 400


def test_allow_private_network_urls_bypasses_the_check(monkeypatch):
    import app.utils.downloader as downloader_module

    monkeypatch.setattr(downloader_module, "ALLOW_PRIVATE_NETWORK_URLS", True)
    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo("127.0.0.1"))
    asyncio.run(_assert_url_is_fetchable("http://internal-media-server.local/x"))  # must not raise
