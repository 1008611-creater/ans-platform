"""Timecode parsing and validation utilities."""

import re
from typing import Union


def parse_timecode(time_input: Union[float, str]) -> float:
    """Parse timecode from string (HH:MM:SS.sss) or float to seconds."""
    if isinstance(time_input, (int, float)):
        return float(time_input)
    
    if isinstance(time_input, str):
        # Handle HH:MM:SS.sss format
        timecode_pattern = r'^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$'
        match = re.match(timecode_pattern, time_input)
        
        if match:
            hours = int(match.group(1))
            minutes = int(match.group(2))
            seconds = float(match.group(3))
            
            total_seconds = hours * 3600 + minutes * 60 + seconds
            return total_seconds
        
        # Try to parse as float string
        try:
            return float(time_input)
        except ValueError:
            raise ValueError(f"Invalid timecode format: {time_input}")
    
    raise ValueError(f"Invalid timecode type: {type(time_input)}")


def clamp_timecode(time_seconds: float, duration_seconds: float) -> float:
    """Clamp timecode to valid range [0, duration]."""
    return max(0.0, min(time_seconds, duration_seconds))


def validate_time_range(start: Union[float, str], end: Union[float, str], duration: float) -> tuple[float, float]:
    """Validate and clamp time range to video duration."""
    start_sec = parse_timecode(start)
    end_sec = parse_timecode(end)
    
    # Clamp to valid range
    start_sec = clamp_timecode(start_sec, duration)
    end_sec = clamp_timecode(end_sec, duration)
    
    # Ensure start < end
    if start_sec >= end_sec:
        raise ValueError("Start time must be less than end time")
    
    return start_sec, end_sec


def format_timecode(seconds: float) -> str:
    """Format seconds as HH:MM:SS.sss timecode."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
