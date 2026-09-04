#!/usr/bin/env python3
"""Test script to verify all imports work correctly."""

def test_imports():
    """Test all the imports used in the project."""
    try:
        # Core imports
        import fastapi
        from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
        from fastapi.responses import StreamingResponse
        print("✅ FastAPI imports working")
        
        # SQLAlchemy imports
        import sqlalchemy
        from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, BigInteger, Numeric, JSON, ForeignKey, Enum
        from sqlalchemy.orm import sessionmaker, relationship, Session
        from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
        from sqlalchemy.ext.declarative import declarative_base
        print("✅ SQLAlchemy imports working")
        
        # Pydantic imports
        import pydantic
        from pydantic import BaseModel, Field
        from pydantic_settings import BaseSettings
        print("✅ Pydantic imports working")
        
        # Other imports
        import alembic
        import psycopg2
        import httpx
        print("✅ Other dependencies working")
        
        # Test our app imports
        from app.core.config import settings
        from app.db.models import Video, VideoVariant, Job, Overlay
        from app.db.schemas import VideoOut, TrimIn, OverlaysIn
        print("✅ App imports working")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Other error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing all imports...")
    if test_imports():
        print("🎉 All imports successful!")
    else:
        print("❌ Some imports failed!")
