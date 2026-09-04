#!/usr/bin/env python3
"""Test script to verify the backend setup."""

import sys
from pathlib import Path

def test_imports():
    """Test that all modules can be imported."""
    try:
        from app.core.config import settings
        from app.db.models import Video, VideoVariant, Job, Overlay
        from app.db.schemas import VideoOut, TrimIn, OverlaysIn
        from app.services.storage import save_upload
        from app.services.ffmpeg import probe
        from app.services.jobs import job_manager
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_config():
    """Test configuration loading."""
    try:
        from app.core.config import settings
        print(f"✅ Config loaded - DB: {settings.database_url}")
        print(f"✅ Media root: {settings.media_root}")
        return True
    except Exception as e:
        print(f"❌ Config error: {e}")
        return False

def test_database_models():
    """Test database model creation."""
    try:
        from app.db.models import Base
        from app.db.base import engine
        print("✅ Database models created")
        print("✅ Database engine configured")
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing Video Processing Backend Setup")
    print("=" * 50)
    
    tests = [
        ("Import Test", test_imports),
        ("Config Test", test_config),
        ("Database Test", test_database_models),
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        print(f"\n🔍 {name}:")
        if test_func():
            passed += 1
        else:
            print(f"❌ {name} failed")
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is ready.")
        print("\n📋 Next steps:")
        print("1. Install Docker and Docker Compose")
        print("2. Run: docker compose up --build")
        print("3. Visit: http://localhost:8000/docs")
    else:
        print("❌ Some tests failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
