#!/usr/bin/env python3
"""
Builds the HyperFrames HTML/GSAP stage for the ANS (AI Never Stops) 16:9 launch video.
Strictly implements:
- `hyperframes-creative/frame-presets/claude/FRAME.md` + `oil-ui` Warm Editorial Swiss Grid
  (Ground `#FAF9F5`, Tile `#EFE9DE`, Ink `#141413`, Terracotta Coral `#D97757`, ANS Mint `#10B981`).
- ZERO dark text-table overlays (`#ov-eng-pipeline` etc. completely replaced by visual cards,
  real cropped UI focal images, 3D Little Dino renders, and SVG animated diagrams).
- 10+ authentic `hyperframes-animation` techniques across 8 scenes (81.483s):
  1. `split-tilt-cards` (3D book-open `rotateY(±12deg)` comparison cards + counter-phase float)
  2. `kinetic-beat-slam` (percussive display headlines with blur-to-sharp slam)
  3. `css-marker-patterns` (Highlight sweep `#FDD835`, Sketchout cross-hatch `X`, Circle, 12-line Burst)
  4. `cut-catalog` Velocity-Matched Seam Cuts (`Zoom-Through`, `Cut the Curve`, `Inverse Zoom-Through`)
  5. `3d-page-scroll` (tilted 3D browser card `perspective(1400px) rotateY(-9deg) rotateX(5deg)` scrolling)
  6. `center-outward-expansion` + `svg-path-draw` (4 visual picture cards bursting from Mint Dino hub)
  7. `depth-of-field-blur` (selective rack-focus via `--dof` custom property + Z-space pop)
  8. `counting-dynamic-scale` + `stat-bars-and-fills` (`tabular-nums` dynamic fontSize growth + SVG rings)
  9. `ai-tracking-box` (Yellow `#FACC15` L-bracket corner markers tracking the 3D Little Dino on sine paths)
  10. `physics-press-reaction` (synchronized cursor + button spring press & ripple burst)
"""
import json
from pathlib import Path

BASE_DIR = Path("/Users/eeo/Downloads/ans/Easel/outputs/ans_preflight_verify/video_day01_indie_site")
STAGE_DIR = BASE_DIR / "hyperframes_stage"
CLAUSES_JSON = BASE_DIR / "clauses_timeline.json"


def build_stage():
    with open(CLAUSES_JSON, "r", encoding="utf-8") as f:
        timeline_data = json.load(f)

    total_dur = timeline_data["total_duration"]  # 81.483
    subtitles = timeline_data["subtitles"]

    subs_js = json.dumps(subtitles, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080, initial-scale=1.0" />
<title>ANS · AI Never Stops — HyperFrames Editorial Stage</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,700;1,500&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;800;900&family=Noto+Serif+SC:wght@600;700;900&display=swap');

  :root {{
    --cream: #FAF9F5;
    --tile: #EFE9DE;
    --tile-strong: #E5DEC9;
    --ink: #141413;
    --ink-muted: #57544E;
    --coral: #D97757;
    --mint: #10B981;
    --mint-soft: #9BE0C5;
    --mint-bg: #ECFDF5;
    --navy: #181715;
    --navy-elev: #252320;
    --yellow-hl: #FDD835;
    --detect-yellow: #FACC15;
    --hairline: 1px solid rgba(20, 20, 19, 0.12);
    --hairline-strong: 1px solid rgba(20, 20, 19, 0.22);
    --shadow-soft: 0 14px 38px rgba(20, 20, 19, 0.08), 0 3px 10px rgba(20, 20, 19, 0.04);
    --shadow-elev: 0 28px 68px rgba(20, 20, 19, 0.16), 0 6px 20px rgba(20, 20, 19, 0.08);
    --font-sans: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-serif: 'EB Garamond', 'Noto Serif SC', Georgia, serif;
    --font-mono: 'JetBrains Mono', monospace;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    user-select: none;
    -webkit-font-smoothing: antialiased;
  }}

  html, body {{
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: var(--cream);
    font-family: var(--font-sans);
    color: var(--ink);
  }}

  #root-stage {{
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background:
      radial-gradient(circle at 14% 16%, rgba(217, 119, 87, 0.07) 0%, transparent 42%),
      radial-gradient(circle at 86% 82%, rgba(16, 185, 129, 0.08) 0%, transparent 45%),
      var(--cream);
  }}

  /* Architectural Editorial Grid Lines */
  .editorial-grid {{
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgba(20, 20, 19, 0.045) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(20, 20, 19, 0.045) 1px, transparent 1px);
    background-size: 120px 120px;
    z-index: 1;
  }}

  /* Top Editorial Header Bar (Claude Frame Preset Chrome) */
  #top-chrome {{
    position: absolute;
    top: 28px;
    left: 64px;
    right: 64px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 90;
    padding: 0 24px;
    background: rgba(250, 249, 245, 0.88);
    backdrop-filter: blur(12px);
    border: var(--hairline);
    border-radius: 999px;
    box-shadow: 0 4px 16px rgba(20, 20, 19, 0.04);
  }}
  .chrome-left {{
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--ink);
  }}
  .spike-mark {{
    color: var(--coral);
    font-size: 24px;
    line-height: 1;
  }}
  .chrome-pill {{
    padding: 4px 14px;
    border-radius: 999px;
    background: var(--tile);
    border: var(--hairline);
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-muted);
  }}
  .chrome-chapters {{
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .ch-tab {{
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink-muted);
    background: transparent;
    transition: none;
  }}
  .ch-tab.active {{
    background: var(--ink);
    color: var(--cream);
  }}
  .chrome-right {{
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    color: var(--mint);
  }}
  .live-dot {{
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--mint);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
  }}

  /* Scene Containers */
  .hf-scene {{
    position: absolute;
    inset: 0;
    width: 1920px;
    height: 1080px;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    will-change: transform, opacity, filter;
  }}

  /* Shared Editorial Kicker & Headline Ramp */
  .kicker-row {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 18px;
    background: var(--tile);
    border: var(--hairline);
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 19px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink);
  }}
  .kicker-row .k-spike {{
    color: var(--coral);
    font-size: 22px;
  }}
  .scene-header {{
    position: absolute;
    top: 98px;
    left: 72px;
    right: 72px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    z-index: 20;
  }}
  .scene-header.center {{
    align-items: center;
    text-align: center;
  }}
  .display-title {{
    font-family: var(--font-sans);
    font-size: 62px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.025em;
    color: var(--ink);
  }}
  .display-title .serif-em {{
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 700;
    color: var(--coral);
  }}

  /* CSS Marker Patterns (from css-marker-patterns.md) */
  .mh-highlight-wrap {{
    position: relative;
    display: inline-block;
    padding: 0 8px;
  }}
  .mh-highlight-bar {{
    position: absolute;
    top: 8%;
    left: -4px;
    right: -4px;
    bottom: 4%;
    background: var(--yellow-hl);
    opacity: 0.55;
    transform: scaleX(0) skewX(-4deg);
    transform-origin: left center;
    border-radius: 6px;
    z-index: 0;
  }}
  .mh-highlight-bar.mint {{
    background: var(--mint-soft);
    opacity: 0.65;
  }}
  .mh-highlight-text {{
    position: relative;
    z-index: 1;
  }}

  .mh-circle-wrap {{
    position: relative;
    display: inline-block;
    padding: 0 10px;
  }}
  .mh-circle-ring {{
    position: absolute;
    top: 50%;
    left: 50%;
    width: 116%;
    height: 138%;
    transform: translate(-50%, -50%) rotate(-2.5deg) scale(0);
    border: 4px solid var(--coral);
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
  }}

  /* ==========================================================================
     SCENE 1 (0.00s - 9.76s): split-tilt-cards + kinetic-beat-slam + sketchout
     ========================================================================== */
  #scene-1 {{
    perspective: 1600px;
  }}
  .s1-split-stage {{
    position: absolute;
    top: 256px;
    left: 72px;
    right: 72px;
    height: 670px;
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 54px;
    transform-style: preserve-3d;
  }}
  .tilt-compare-card {{
    width: 840px;
    height: 650px;
    border-radius: 28px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transform-style: preserve-3d;
    will-change: transform, opacity, filter;
    position: relative;
    overflow: hidden;
  }}
  .tilt-left-bad {{
    background: #F2EFE9;
    border: 2px solid rgba(20, 20, 19, 0.16);
    box-shadow: -24px 28px 64px rgba(20, 20, 19, 0.12);
  }}
  .tilt-right-good {{
    background: #FFFFFF;
    border: 2px solid var(--mint);
    box-shadow: 24px 28px 68px rgba(16, 185, 129, 0.18), 0 0 0 1px rgba(16, 185, 129, 0.2);
  }}
  .card-top-bar {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }}
  .card-badge {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 800;
  }}
  .card-badge.bad {{
    background: rgba(229, 57, 53, 0.12);
    color: #C62828;
    border: 1px solid rgba(229, 57, 53, 0.3);
  }}
  .card-badge.good {{
    background: var(--mint-bg);
    color: #047857;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }}
  .card-big-title {{
    font-size: 46px;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }}
  /* Left Card Visual: Messy Chat Bubbles Graphic */
  .chat-mess-graphic {{
    position: relative;
    flex: 1;
    margin-top: 18px;
    background: #E7E2D8;
    border-radius: 20px;
    border: var(--hairline);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
  }}
  .chat-bubble-row {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .chat-bubble-row.right {{
    justify-content: flex-end;
  }}
  .chat-av {{
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #C5BEB0;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 20px;
    color: #57544E;
  }}
  .chat-bub {{
    padding: 16px 24px;
    border-radius: 18px;
    background: #FAF9F5;
    border: var(--hairline);
    font-size: 24px;
    font-weight: 700;
    color: #6E6A63;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }}
  .chat-bub.err {{
    background: #FDECEA;
    color: #B71C1C;
    border-color: rgba(183, 28, 28, 0.25);
  }}
  /* Red Sketchout Cross-hatch over Left Card */
  .sketchout-stamp {{
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    display: grid;
    place-items: center;
  }}
  .sketch-line {{
    position: absolute;
    width: 92%;
    height: 8px;
    background: #E53935;
    border-radius: 4px;
    transform-origin: left center;
  }}
  .sketch-line.fwd {{
    transform: rotate(-16deg) scaleX(0);
  }}
  .sketch-line.bwd {{
    transform: rotate(16deg) scaleX(0);
  }}
  .sketch-stamp-pill {{
    padding: 12px 28px;
    background: #E53935;
    color: #FFF;
    font-size: 32px;
    font-weight: 900;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(229, 57, 53, 0.4);
    transform: rotate(-6deg) scale(0);
    opacity: 0;
  }}

  /* Right Card Visual: Real ANS Production System Visual Collage */
  .ans-good-visual {{
    position: relative;
    flex: 1;
    margin-top: 18px;
    border-radius: 20px;
    overflow: hidden;
    background: var(--cream);
    border: var(--hairline);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
  }}
  .ans-hero-crop {{
    width: 100%;
    height: 230px;
    object-fit: cover;
    object-position: center top;
    border-radius: 14px;
    border: var(--hairline);
  }}
  .ans-mini-thumbs {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    flex: 1;
  }}
  .ans-mini-thumb {{
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    border: var(--hairline);
    background: #FFF;
  }}
  .ans-mini-thumb img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
  }}
  .ans-mini-label {{
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    padding: 5px 10px;
    background: rgba(20, 20, 19, 0.84);
    color: #FFF;
    font-size: 16px;
    font-weight: 800;
    border-radius: 8px;
    text-align: center;
  }}

  /* ==========================================================================
     SCENE 2 (9.76s - 17.86s): 3d-page-scroll + center-outward-expansion
     ========================================================================== */
  #scene-2 {{
    perspective: 1500px;
  }}
  .s2-browser-3d-wrap {{
    position: absolute;
    left: 50%;
    top: 53%;
    width: 1500px;
    height: 820px;
    transform: translate(-50%, -50%) perspective(1400px) rotateY(-9deg) rotateX(5deg);
    transform-style: preserve-3d;
    border-radius: 24px;
    background: #FFFFFF;
    border: var(--hairline-strong);
    box-shadow: 42px 34px 84px rgba(20, 20, 19, 0.22);
    overflow: hidden;
    --dof: 0px;
    filter: blur(var(--dof));
    will-change: transform, filter, opacity;
  }}
  .browser-top-bar {{
    height: 54px;
    background: #F3EFE6;
    border-bottom: var(--hairline);
    display: flex;
    align-items: center;
    padding: 0 22px;
    gap: 14px;
    position: relative;
    z-index: 5;
  }}
  .b-dots {{
    display: flex;
    gap: 8px;
  }}
  .b-dots i {{
    width: 13px;
    height: 13px;
    border-radius: 50%;
    display: block;
  }}
  .b-url {{
    margin-left: 16px;
    padding: 6px 24px;
    background: #FAF9F5;
    border: var(--hairline);
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
  }}
  .s2-scroll-Viewport {{
    position: relative;
    width: 100%;
    height: 766px;
    overflow: hidden;
  }}
  .s2-scroll-content {{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    will-change: transform;
  }}
  .s2-scroll-content img {{
    display: block;
    width: 100%;
    height: auto;
  }}

  /* Constellation Outward Burst Overlay (Phase B of Scene 2) */
  .s2-burst-layer {{
    position: absolute;
    inset: 0;
    z-index: 25;
    pointer-events: none;
  }}
  .s2-svg-connectors {{
    position: absolute;
    inset: 0;
    width: 1920px;
    height: 1080px;
    z-index: 1;
  }}
  .s2-svg-connectors path {{
    fill: none;
    stroke: var(--coral);
    stroke-width: 5;
    stroke-linecap: round;
  }}
  .s2-center-hub {{
    position: absolute;
    left: 50%;
    top: 54%;
    transform: translate(-50%, -50%) scale(0);
    width: 230px;
    height: 230px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 4px solid var(--mint);
    box-shadow: 0 24px 60px rgba(16, 185, 129, 0.28);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }}
  .s2-center-hub img {{
    width: 136px;
    height: 136px;
    object-fit: contain;
  }}
  .s2-center-hub span {{
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 900;
    color: var(--ink);
    margin-top: 2px;
  }}
  .burst-pic-card {{
    position: absolute;
    left: 50%;
    top: 54%;
    width: 430px;
    height: 290px;
    background: #FFFFFF;
    border: 2px solid rgba(20, 20, 19, 0.14);
    border-radius: 24px;
    box-shadow: var(--shadow-elev);
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 4;
    will-change: transform, opacity;
  }}
  .burst-pic-card img {{
    width: 100%;
    height: 200px;
    object-fit: cover;
    object-position: center top;
    border-radius: 16px;
    border: var(--hairline);
  }}
  .burst-card-foot {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px 0;
  }}
  .burst-card-num {{
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 800;
    color: var(--coral);
    white-space: nowrap;
  }}
  .burst-card-title {{
    font-size: 25px;
    font-weight: 900;
    color: var(--ink);
    white-space: nowrap;
  }}

  /* ==========================================================================
     SCENE 3 (17.86s - 28.41s): Visual 3-Station Pipeline + svg-path-draw
     ========================================================================== */
  .s3-pipeline-stage {{
    position: absolute;
    top: 250px;
    left: 64px;
    right: 64px;
    height: 680px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 15;
  }}
  .s3-pipe-svg {{
    position: absolute;
    inset: 0;
    width: 1792px;
    height: 680px;
    pointer-events: none;
    z-index: 1;
  }}
  .s3-pipe-svg path.pipe-bg {{
    fill: none;
    stroke: rgba(20, 20, 19, 0.1);
    stroke-width: 8;
    stroke-dasharray: 14 10;
  }}
  .s3-pipe-svg path.pipe-draw {{
    fill: none;
    stroke: var(--mint);
    stroke-width: 8;
    stroke-linecap: round;
  }}
  .station-card {{
    position: relative;
    width: 536px;
    height: 620px;
    background: #FFFFFF;
    border: 2px solid rgba(20, 20, 19, 0.14);
    border-radius: 28px;
    box-shadow: var(--shadow-elev);
    padding: 26px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 5;
    will-change: transform, opacity;
  }}
  .station-card.st-navy {{
    background: var(--navy);
    color: var(--cream);
    border-color: rgba(250, 249, 245, 0.18);
  }}
  .st-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
  .st-step-pill {{
    padding: 6px 16px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 800;
    background: var(--coral);
    color: #FFF;
  }}
  .st-step-pill.mint {{
    background: var(--mint);
  }}
  .st-visual-box {{
    width: 100%;
    height: 360px;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    border: var(--hairline);
    background: var(--tile);
  }}
  .st-visual-box img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }}
  /* Station 1 Code + Dynamic Scale Metric Visual */
  .code-visual-box {{
    background: var(--navy-elev);
    border: 1px solid rgba(250, 249, 245, 0.14);
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .code-lines {{
    font-family: var(--font-mono);
    font-size: 21px;
    line-height: 1.55;
    color: var(--cream);
  }}
  .code-lines .c-kw {{ color: var(--coral); font-weight: 700; }}
  .code-lines .c-str {{ color: #5DB8A6; }}
  .code-lines .c-num {{ color: #E8A55A; font-weight: 700; }}
  .st1-metric-row {{
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(250, 249, 245, 0.14);
  }}
  .st1-counter {{
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 48px;
    line-height: 1;
    color: var(--mint-soft);
    font-variant-numeric: tabular-nums;
  }}
  .st1-counter-unit {{
    font-family: var(--font-sans);
    font-size: 26px;
    font-weight: 800;
    color: var(--cream);
  }}
  .st-title {{
    font-size: 38px;
    font-weight: 900;
    letter-spacing: -0.02em;
  }}
  .st-sub {{
    font-size: 23px;
    font-weight: 600;
    opacity: 0.82;
  }}

  /* ==========================================================================
     SCENE 4 (28.41s - 36.58s): depth-of-field-blur Rack Focus + 3 Visual Badges
     ========================================================================== */
  .s4-bg-layer {{
    position: absolute;
    inset: 96px 64px 110px 64px;
    border-radius: 26px;
    overflow: hidden;
    border: var(--hairline-strong);
    box-shadow: var(--shadow-soft);
    --dof: 0px;
    filter: blur(var(--dof));
    will-change: filter, opacity, transform;
  }}
  .s4-bg-layer img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }}
  .s4-focal-stage {{
    position: absolute;
    inset: 0;
    z-index: 25;
    display: grid;
    place-items: center;
    pointer-events: none;
  }}
  .s4-hero-card {{
    position: relative;
    width: 680px;
    height: 640px;
    background: #FFFFFF;
    border-radius: 28px;
    border: 3px solid var(--mint);
    box-shadow: 0 36px 90px rgba(20, 20, 19, 0.28);
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    will-change: transform, opacity;
  }}
  .s4-hero-card img {{
    width: 100%;
    height: 500px;
    object-fit: cover;
    object-position: center top;
    border-radius: 18px;
  }}
  .s4-hero-bar {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
  }}
  .s4-hero-name {{
    font-size: 28px;
    font-weight: 900;
    color: var(--ink);
    white-space: nowrap;
  }}
  .s4-cta-btn {{
    padding: 12px 26px;
    border-radius: 999px;
    background: var(--mint);
    color: #FFFFFF;
    font-size: 22px;
    font-weight: 900;
    white-space: nowrap;
    box-shadow: 0 10px 24px rgba(16, 185, 129, 0.35);
    will-change: transform;
  }}
  .s4-spec-callout {{
    position: absolute;
    width: 420px;
    background: #FFFFFF;
    border: 2px solid var(--ink);
    border-radius: 22px;
    padding: 18px 22px;
    box-shadow: var(--shadow-elev);
    display: flex;
    align-items: center;
    gap: 18px;
    will-change: transform, opacity;
  }}
  .s4-spec-icon {{
    width: 72px;
    height: 72px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 30px;
    font-weight: 900;
    flex-shrink: 0;
  }}
  .s4-spec-text h4 {{
    font-size: 28px;
    font-weight: 900;
    color: var(--ink);
  }}
  .s4-spec-text p {{
    font-size: 20px;
    font-weight: 700;
    color: var(--ink-muted);
    margin-top: 4px;
  }}

  /* ==========================================================================
     SCENE 5 (36.58s - 46.84s): Visual De-AI Split-Tilt Cards
     ========================================================================== */
  #scene-5 {{
    perspective: 1600px;
  }}
  .plastic-ui-mockup {{
    flex: 1;
    margin-top: 16px;
    border-radius: 20px;
    background: linear-gradient(135deg, #3B0764 0%, #1E1B4B 50%, #701A75 100%);
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    border: 2px solid #D946EF;
    box-shadow: inset 0 0 40px rgba(217, 70, 239, 0.45);
  }}
  .plastic-glow-orb {{
    position: absolute;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(236,72,153,0.6) 0%, transparent 70%);
    top: -40px;
    right: -40px;
  }}
  .plastic-fake-hero {{
    padding: 22px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #F5D0FE;
  }}
  .plastic-fake-hero h3 {{
    font-size: 34px;
    font-weight: 900;
    background: linear-gradient(90deg, #F472B6, #60A5FA, #C084FC);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}
  .plastic-fake-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }}
  .plastic-fake-box {{
    height: 130px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(168,85,247,0.35), rgba(59,130,246,0.25));
    border: 1px solid #A855F7;
    display: grid;
    place-items: center;
    color: #E9D5FF;
    font-size: 22px;
    font-weight: 800;
  }}
  .plastic-fake-btn {{
    height: 64px;
    border-radius: 999px;
    background: linear-gradient(90deg, #EC4899, #8B5CF6, #06B6D4);
    display: grid;
    place-items: center;
    color: #FFF;
    font-size: 26px;
    font-weight: 900;
    box-shadow: 0 0 28px rgba(236, 72, 153, 0.8);
  }}

  /* ==========================================================================
     SCENE 6 (46.84s - 57.15s): counting-dynamic-scale + Prompt Transformer
     ========================================================================== */
  .s6-main-grid {{
    position: absolute;
    top: 248px;
    left: 72px;
    right: 72px;
    height: 680px;
    display: grid;
    grid-template-columns: 820px 1fr;
    gap: 48px;
    align-items: stretch;
  }}
  .s6-stats-col {{
    display: flex;
    flex-direction: column;
    gap: 28px;
  }}
  .s6-stat-card {{
    flex: 1;
    background: #FFFFFF;
    border: 2px solid rgba(20, 20, 19, 0.14);
    border-radius: 26px;
    padding: 28px 34px;
    box-shadow: var(--shadow-elev);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }}
  .s6-stat-left {{
    display: flex;
    flex-direction: column;
    gap: 8px;
  }}
  .s6-num-wrap {{
    display: flex;
    align-items: baseline;
    gap: 8px;
    height: 116px;
  }}
  .s6-dynamic-num {{
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 52px;
    line-height: 1;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }}
  .s6-num-suffix {{
    font-family: var(--font-mono);
    font-size: 42px;
    font-weight: 800;
    color: var(--coral);
  }}
  .s6-stat-label {{
    font-size: 32px;
    font-weight: 900;
    color: var(--ink);
  }}
  .s6-ring-wrap {{
    position: relative;
    width: 148px;
    height: 148px;
    flex-shrink: 0;
  }}
  .s6-ring-svg {{
    width: 148px;
    height: 148px;
    transform: rotate(-90deg);
  }}
  .s6-ring-bg {{
    fill: none;
    stroke: var(--tile);
    stroke-width: 12;
  }}
  .s6-ring-fg {{
    fill: none;
    stroke: var(--mint);
    stroke-width: 12;
    stroke-linecap: round;
  }}
  .s6-ring-fg.coral {{
    stroke: var(--coral);
  }}

  /* Right Column of Scene 6: Visual Prompt Transformer */
  .s6-transformer-card {{
    background: #FFFFFF;
    border: 2px solid rgba(20, 20, 19, 0.16);
    border-radius: 28px;
    padding: 28px;
    box-shadow: var(--shadow-elev);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }}
  .s6-trans-top {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }}
  .s6-plain-bubble {{
    flex: 1;
    padding: 18px 22px;
    border-radius: 18px;
    background: var(--tile);
    border: var(--hairline);
    font-size: 25px;
    font-weight: 800;
    color: var(--ink);
  }}
  .s6-magic-btn {{
    padding: 18px 28px;
    border-radius: 18px;
    background: var(--coral);
    color: #FFFFFF;
    font-size: 24px;
    font-weight: 900;
    box-shadow: 0 12px 28px rgba(217, 119, 87, 0.35);
    will-change: transform;
    white-space: nowrap;
  }}
  .s6-visual-result {{
    position: relative;
    height: 490px;
    border-radius: 20px;
    overflow: hidden;
    border: 2px solid var(--mint);
    background: #FFFFFF;
  }}
  .s6-visual-result img {{
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center top;
    padding: 8px;
  }}
  .s6-spec-overlay-pills {{
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }}
  .s6-spec-pill {{
    padding: 8px 18px;
    border-radius: 999px;
    background: rgba(20, 20, 19, 0.88);
    color: #FFFFFF;
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 700;
    border: 1px solid rgba(255,255,255,0.2);
  }}

  /* ==========================================================================
     SCENE 7 (57.15s - 67.84s): Pure 3D Little Dino Stage + ai-tracking-box
     ========================================================================== */
  .s7-stage-wrap {{
    position: absolute;
    top: 224px;
    left: 72px;
    width: 1180px;
    height: 710px;
    border-radius: 28px;
    overflow: hidden;
    border: 3px solid var(--ink);
    box-shadow: var(--shadow-elev);
    background: #3E4532;
  }}
  .s7-stage-img {{
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }}
  /* AI Tracking Box (from ai-tracking-box.md) */
  .ai-track-box {{
    position: absolute;
    width: 340px;
    height: 360px;
    left: 420px;
    top: 130px;
    pointer-events: none;
    z-index: 20;
    will-change: transform, width, height;
  }}
  .ai-corner {{
    position: absolute;
    width: 42px;
    height: 42px;
  }}
  .ai-corner.tl {{
    top: -6px; left: -6px;
    border-top: 6px solid var(--detect-yellow);
    border-left: 6px solid var(--detect-yellow);
  }}
  .ai-corner.tr {{
    top: -6px; right: -6px;
    border-top: 6px solid var(--detect-yellow);
    border-right: 6px solid var(--detect-yellow);
  }}
  .ai-corner.bl {{
    bottom: -6px; left: -6px;
    border-bottom: 6px solid var(--detect-yellow);
    border-left: 6px solid var(--detect-yellow);
  }}
  .ai-corner.br {{
    bottom: -6px; right: -6px;
    border-bottom: 6px solid var(--detect-yellow);
    border-right: 6px solid var(--detect-yellow);
  }}
  .ai-track-label {{
    position: absolute;
    top: -50px;
    left: -6px;
    padding: 7px 16px;
    background: var(--detect-yellow);
    color: #0B0D1F;
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 1px;
    border-radius: 8px;
    white-space: nowrap;
    box-shadow: 0 6px 18px rgba(0,0,0,0.28);
  }}
  .s7-right-cards {{
    position: absolute;
    top: 224px;
    right: 72px;
    width: 550px;
    height: 710px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
  }}
  .s7-feat-card {{
    flex: 1;
    background: #FFFFFF;
    border: 2px solid rgba(20, 20, 19, 0.14);
    border-radius: 24px;
    padding: 24px 28px;
    box-shadow: var(--shadow-soft);
    display: flex;
    align-items: center;
    gap: 22px;
    will-change: transform, opacity;
  }}
  .s7-feat-badge {{
    width: 78px;
    height: 78px;
    border-radius: 20px;
    background: var(--mint-bg);
    border: 2px solid var(--mint);
    display: grid;
    place-items: center;
    font-size: 36px;
    flex-shrink: 0;
  }}
  .s7-feat-copy h4 {{
    font-size: 31px;
    font-weight: 900;
    color: var(--ink);
  }}
  .s7-feat-copy p {{
    font-size: 21px;
    font-weight: 600;
    color: var(--ink-muted);
    margin-top: 6px;
  }}

  /* ==========================================================================
     SCENE 8 (67.84s - 81.483s): 100% Sample Verification + CTA Morph Finale
     ========================================================================== */
  .s8-verify-layer {{
    position: absolute;
    inset: 0;
    z-index: 15;
  }}
  .s8-market-bg {{
    position: absolute;
    top: 230px;
    left: 72px;
    width: 1020px;
    height: 690px;
    border-radius: 26px;
    overflow: hidden;
    border: var(--hairline-strong);
    box-shadow: var(--shadow-soft);
    --dof: 0px;
    filter: blur(var(--dof));
  }}
  .s8-market-bg img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }}
  .s8-sample-focal {{
    position: absolute;
    top: 210px;
    right: 72px;
    width: 980px;
    height: 720px;
    background: #FFFFFF;
    border: 3px solid var(--mint);
    border-radius: 28px;
    box-shadow: 0 36px 90px rgba(20, 20, 19, 0.25);
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 20;
    will-change: transform, opacity;
  }}
  .s8-sample-focal img {{
    width: 100%;
    height: 550px;
    object-fit: cover;
    object-position: center top;
    border-radius: 18px;
    border: var(--hairline);
  }}
  .s8-seal-row {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
  }}
  .s8-seal-badge {{
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    border-radius: 999px;
    background: var(--mint-bg);
    border: 2px solid var(--mint);
    color: #047857;
    font-size: 28px;
    font-weight: 900;
  }}

  /* Phase B Finale Card (74.22s - 81.483s) */
  .s8-finale-layer {{
    position: absolute;
    inset: 0;
    z-index: 35;
    background:
      radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.14) 0%, transparent 55%),
      var(--cream);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 26px;
    opacity: 0;
  }}
  .finale-dino-hero {{
    width: 220px;
    height: 220px;
    object-fit: contain;
    filter: drop-shadow(0 20px 40px rgba(16, 185, 129, 0.28));
  }}
  .finale-headline {{
    font-size: 74px;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--ink);
    text-align: center;
    line-height: 1.1;
  }}
  .finale-sub {{
    font-family: var(--font-mono);
    font-size: 26px;
    font-weight: 700;
    color: var(--ink-muted);
    letter-spacing: 0.04em;
  }}
  .finale-cta-wrap {{
    position: relative;
    margin-top: 12px;
  }}
  .finale-cta-btn {{
    display: inline-flex;
    align-items: center;
    gap: 18px;
    padding: 24px 56px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--cream);
    font-family: var(--font-mono);
    font-size: 38px;
    font-weight: 900;
    border: 3px solid var(--mint);
    box-shadow: 0 24px 60px rgba(20, 20, 19, 0.26);
    will-change: transform;
  }}
  .finale-cta-btn .cta-arrow {{
    display: inline-grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--mint);
    color: #FFFFFF;
    font-size: 28px;
  }}
  /* Burst Lines around Finale CTA */
  .mh-burst-container {{
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 0;
  }}
  .mh-burst-line {{
    position: absolute;
    display: block;
    width: 6px;
    height: var(--len);
    background: var(--coral);
    left: -3px;
    top: calc(-1 * var(--len));
    transform-origin: bottom center;
    transform: rotate(var(--angle)) translateY(-95px) scaleY(0);
    border-radius: 3px;
    opacity: 0;
  }}

  /* ==========================================================================
     GLOBAL CURSOR + CLICK RIPPLE + TRANSPARENT DINO PIP + SUBTITLE BAR
     ========================================================================== */
  #global-cursor {{
    position: absolute;
    top: 0;
    left: 0;
    width: 56px;
    height: 56px;
    pointer-events: none;
    z-index: 120;
    transform-origin: 6px 6px;
    filter: drop-shadow(0 10px 18px rgba(20, 20, 19, 0.32));
    will-change: transform, opacity;
    opacity: 0;
  }}
  #click-ripple {{
    position: absolute;
    top: 0;
    left: 0;
    width: 96px;
    height: 96px;
    margin-left: -48px;
    margin-top: -48px;
    border-radius: 50%;
    border: 5px solid var(--mint);
    background: rgba(16, 185, 129, 0.22);
    pointer-events: none;
    z-index: 115;
    transform: scale(0);
    opacity: 0;
  }}

  /* Transparent Little Dino Companion in Bottom-Right (ZERO white box!) */
  #pip-dock {{
    position: absolute;
    right: 36px;
    bottom: 28px;
    width: 190px;
    height: 210px;
    z-index: 105;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    will-change: transform, opacity;
  }}
  #pip-dino-img {{
    width: 168px;
    height: 168px;
    object-fit: contain;
    filter: drop-shadow(0 14px 24px rgba(20, 20, 19, 0.22));
  }}
  .pip-tag {{
    margin-top: -8px;
    padding: 4px 14px;
    border-radius: 999px;
    background: rgba(20, 20, 19, 0.88);
    border: 1.5px solid var(--mint);
    color: var(--mint-soft);
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }}

  /* Editorial Subtitle Bar */
  #sub-bar {{
    position: absolute;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    z-index: 110;
    max-width: 1680px;
    padding: 12px 42px 16px;
    border-radius: 20px;
    background: rgba(20, 20, 19, 0.90);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(250, 249, 245, 0.18);
    box-shadow: 0 18px 42px rgba(20, 20, 19, 0.26);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }}
  #sub-text {{
    font-family: var(--font-sans);
    font-size: 29px;
    font-weight: 800;
    color: var(--cream);
    letter-spacing: 0.01em;
    line-height: 1.25;
    text-align: center;
    white-space: nowrap;
  }}
  #sub-text .sub-hl {{
    color: var(--detect-yellow);
  }}
  #sub-text .sub-mint {{
    color: var(--mint-soft);
  }}
  .sub-prog-track {{
    width: 100%;
    height: 4px;
    background: rgba(250, 249, 245, 0.16);
    border-radius: 999px;
    overflow: hidden;
  }}
  #sub-prog-fill {{
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, var(--coral), var(--mint));
  }}
</style>
</head>
<body>
<div id="root-stage" data-composition-id="main" data-start="0" data-duration="{total_dur}" data-width="1920" data-height="1080">
  <div class="editorial-grid"></div>

  <!-- Top Editorial Chrome -->
  <header id="top-chrome">
    <div class="chrome-left">
      <span class="spike-mark">✱</span>
      <span>ANS · AI NEVER STOPS</span>
      <span class="chrome-pill">ans.cauai.fun</span>
    </div>
    <div class="chrome-chapters">
      <div class="ch-tab active" id="ch-0">01 生产系统定位</div>
      <div class="ch-tab" id="ch-1">02 标准化工程管线</div>
      <div class="ch-tab" id="ch-2">03 内行审美去 AI 味</div>
      <div class="ch-tab" id="ch-3">04 3D 小恐龙与验真交付</div>
    </div>
    <div class="chrome-right">
      <span class="live-dot"></span>
      <span>DAY 01 · LAUNCH FILM</span>
    </div>
  </header>

  <!-- ========================================================================
       SCENE 1 (0.00s - 9.76s): split-tilt-cards + kinetic-beat-slam
       ======================================================================== -->
  <section class="hf-scene" id="scene-1">
    <div class="scene-header center" id="s1-header">
      <div class="kicker-row"><span class="k-spike">✱</span> PARADIGM SHIFT · 为什么 90% 的人刷 AI 只剩聊天记录？</div>
      <h1 class="display-title" id="s1-headline">
        告别碎片化聊天框，把 AI 变成
        <span class="mh-highlight-wrap">
          <span class="mh-highlight-bar" id="s1-hl-bar"></span>
          <span class="mh-highlight-text">可复现的生产系统</span>
        </span>
      </h1>
    </div>

    <div class="s1-split-stage" id="s1-split-stage">
      <!-- Left Card: Messy Chat Box -->
      <div class="tilt-compare-card tilt-left-bad" id="s1-card-left">
        <div>
          <div class="card-top-bar">
            <span class="card-badge bad">❌ 90% 普通人的用法</span>
            <span class="chrome-pill">CHAT LOGS ONLY</span>
          </div>
          <div class="card-big-title">当成一次性聊天框 · 盲盒抽卡</div>
        </div>

        <div class="chat-mess-graphic">
          <div class="chat-bubble-row">
            <div class="chat-av">问</div>
            <div class="chat-bub">“帮我写个好看的个人网站和宣传片...”</div>
          </div>
          <div class="chat-bubble-row right">
            <div class="chat-bub err">AI：好的！已生成一段通用模板代码（无法运行）</div>
          </div>
          <div class="chat-bubble-row">
            <div class="chat-av">问</div>
            <div class="chat-bub">“怎么样式全乱了？再改改字体和配色？”</div>
          </div>
          <div class="chat-bubble-row right">
            <div class="chat-bub err">AI：抱歉！重新抽卡第 18 次... 算力已耗尽 ⚠️</div>
          </div>

          <div class="sketchout-stamp">
            <span class="sketch-line fwd" id="s1-sketch-fwd"></span>
            <span class="sketch-line bwd" id="s1-sketch-bwd"></span>
            <div class="sketch-stamp-pill" id="s1-sketch-pill">❌ 只剩聊天记录 · 零作品沉淀</div>
          </div>
        </div>
      </div>

      <!-- Right Card: ANS Reproducible Production System -->
      <div class="tilt-compare-card tilt-right-good" id="s1-card-right">
        <div>
          <div class="card-top-bar">
            <span class="card-badge good">✅ ANS 创客工作流</span>
            <span class="chrome-pill">REPRODUCIBLE SYSTEM</span>
          </div>
          <div class="card-big-title">工程管线 + 内行审美 = 真作品交付</div>
        </div>

        <div class="ans-good-visual">
          <img class="ans-hero-crop" src="assets/visual_crops/crop_home_hero_bento.png" alt="ANS Home Hero" />
          <div class="ans-mini-thumbs">
            <div class="ans-mini-thumb">
              <img src="assets/live/cards/image2-library.webp" alt="Image2" />
              <div class="ans-mini-label">提示词工程库</div>
            </div>
            <div class="ans-mini-thumb">
              <img src="assets/live/cards/infinite-canvas.webp" alt="Infinite Canvas" />
              <div class="ans-mini-label">无限画布工作台</div>
            </div>
            <div class="ans-mini-thumb">
              <img src="assets/live/cards/ai-video-services.webp" alt="Video" />
              <div class="ans-mini-label">商业视频工作流</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 2 (9.76s - 17.86s): 3d-page-scroll + center-outward-expansion
       ======================================================================== -->
  <section class="hf-scene" id="scene-2">
    <div class="scene-header" id="s2-header">
      <div class="kicker-row"><span class="k-spike">✱</span> WHY ANS EXISTS · AI NEVER STOPS</div>
      <h2 class="display-title">把散乱提示词，变成 <span class="serif-em">可验证、可交付</span> 的创客空间</h2>
    </div>

    <!-- 3D Tilted Scrolling Webpage Card -->
    <div class="s2-browser-3d-wrap" id="s2-browser-card">
      <div class="browser-top-bar">
        <div class="b-dots">
          <i style="background:#FF5F56"></i>
          <i style="background:#FFBD2E"></i>
          <i style="background:#27C93F"></i>
        </div>
        <div class="b-url">https://ans.cauai.fun — AI Never Stops · 66+ 可复现项目与工作流</div>
      </div>
      <div class="s2-scroll-Viewport">
        <div class="s2-scroll-content" id="s2-scroll-content">
          <img src="assets/live/01_home_top.png" alt="ANS Home" />
          <img src="assets/live/01_explore_grid.png" alt="ANS Explore" />
        </div>
      </div>
    </div>

    <!-- Center-Outward Expansion + Self-Drawing SVG Connectors -->
    <div class="s2-burst-layer" id="s2-burst-layer">
      <svg class="s2-svg-connectors" viewBox="0 0 1920 1080">
        <path id="s2-path-1" d="M 960 583 Q 720 420 460 360" />
        <path id="s2-path-2" d="M 960 583 Q 1200 420 1460 360" />
        <path id="s2-path-3" d="M 960 583 Q 720 720 460 790" />
        <path id="s2-path-4" d="M 960 583 Q 1200 720 1460 790" />
      </svg>

      <div class="s2-center-hub" id="s2-center-hub">
        <img src="assets/dino_rgba/dino_04.png" alt="ANS Dino Hub" />
        <span>ANS CORE</span>
      </div>

      <div class="burst-pic-card" id="s2-burst-1" data-tx="-500" data-ty="-210">
        <img src="assets/visual_crops/crop_explore_single_cauai.png" alt="Pipeline" />
        <div class="burst-card-foot">
          <span class="burst-card-num">01 / PIPELINE</span>
          <span class="burst-card-title">标准化工程管线</span>
        </div>
      </div>

      <div class="burst-pic-card" id="s2-burst-2" data-tx="500" data-ty="-210">
        <img src="assets/visual_crops/crop_vibehub_bento_swiss.png" alt="Aesthetics" />
        <div class="burst-card-foot">
          <span class="burst-card-num">02 / AESTHETIC</span>
          <span class="burst-card-title">内行审美去 AI 味</span>
        </div>
      </div>

      <div class="burst-pic-card" id="s2-burst-3" data-tx="-500" data-ty="215">
        <img src="assets/visual_crops/crop_dino_3d_center.png" alt="3D Dino" />
        <div class="burst-card-foot">
          <span class="burst-card-num">03 / 3D STAGE</span>
          <span class="burst-card-title">原生 3D 小恐龙展厅</span>
        </div>
      </div>

      <div class="burst-pic-card" id="s2-burst-4" data-tx="500" data-ty="215">
        <img src="assets/visual_crops/crop_market_sample_slice.png" alt="Sample Verified" />
        <div class="burst-card-foot">
          <span class="burst-card-num">04 / VERIFIED</span>
          <span class="burst-card-title">100% 样本验真交付</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 3 (17.86s - 28.41s): 3-Station Visual Pipeline + svg-path-draw
       ======================================================================== -->
  <section class="hf-scene" id="scene-3">
    <div class="scene-header" id="s3-header">
      <div class="kicker-row"><span class="k-spike">✱</span> ADVANTAGE 01 · DETERMINISTIC PIPELINE</div>
      <h2 class="display-title">
        标准化工程管线：终结
        <span class="mh-circle-wrap">
          <span class="mh-highlight-text">盲盒式抽卡</span>
          <span class="mh-circle-ring" id="s3-circle-ring"></span>
        </span>
      </h2>
    </div>

    <div class="s3-pipeline-stage">
      <svg class="s3-pipe-svg" viewBox="0 0 1792 680">
        <path class="pipe-bg" d="M 520 340 L 640 340 M 1150 340 L 1270 340" />
        <path class="pipe-draw" id="s3-pipe-1" d="M 520 340 L 640 340" />
        <path class="pipe-draw" id="s3-pipe-2" d="M 1150 340 L 1270 340" />
      </svg>

      <!-- Station 1: Deterministic Script Engine -->
      <div class="station-card st-navy" id="s3-st-1">
        <div class="st-header">
          <span class="st-step-pill">STATION 01 · 底层脚本</span>
          <span class="chrome-pill" style="background:#252320;color:#FAF9F5;">AST + VAD + FFmpeg</span>
        </div>
        <div class="st-visual-box code-visual-box">
          <div class="code-lines">
            <div><span class="c-kw">const</span> pipeline = <span class="c-kw">await</span> ANS.stage({{</div>
            <div>&nbsp;&nbsp;astCheck: <span class="c-str">"deterministic"</span>,</div>
            <div>&nbsp;&nbsp;audioSync: <span class="c-str">"frame_exact_60fps"</span>,</div>
            <div>&nbsp;&nbsp;tokenWaste: <span class="c-num">0.00</span></div>
            <div>}});</div>
          </div>
          <div class="st1-metric-row">
            <span class="st1-counter" id="s3-counter-80">0</span>
            <span class="st1-counter-unit">% 确定性脏活自动跑通</span>
          </div>
        </div>
        <div>
          <div class="st-title">确定性脏活 ➔ 底层脚本</div>
          <div class="st-sub">排障、对齐、构建全由确定性代码接管</div>
        </div>
      </div>

      <!-- Station 2: Multi-Agent Creative Synergy -->
      <div class="station-card" id="s3-st-2">
        <div class="st-header">
          <span class="st-step-pill mint">STATION 02 · 多智能体协同</span>
          <span class="chrome-pill">MULTI-AGENT JURY</span>
        </div>
        <div class="st-visual-box">
          <img src="assets/visual_crops/crop_explore_single_cauai.png" alt="Multi-Agent Canvas" />
        </div>
        <div>
          <div class="st-title">创造性判断 ➔ 智能体协同</div>
          <div class="st-sub">主理人 + 小恐龙 Agent 分工把控审美与创意</div>
        </div>
      </div>

      <!-- Station 3: Reproducible Industrial Output -->
      <div class="station-card" id="s3-st-3">
        <div class="st-header">
          <span class="st-step-pill">STATION 03 · 稳定复现</span>
          <span class="chrome-pill">100% REPRODUCIBLE</span>
        </div>
        <div class="st-visual-box">
          <img src="assets/visual_crops/crop_explore_single_image2.png" alt="Verified Deliverable" />
        </div>
        <div>
          <div class="st-title">第一秒即知怎么跑通闭环</div>
          <div class="st-sub">告别玄学提示词，稳定产出工业级成品</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 4 (28.41s - 36.58s): depth-of-field-blur Rack Focus + 3 Spec Callouts
       ======================================================================== -->
  <section class="hf-scene" id="scene-4">
    <div class="scene-header" id="s4-header">
      <div class="kicker-row"><span class="k-spike">✱</span> TRANSPARENT WORKFLOW SPEC · 透明工程契约</div>
      <h2 class="display-title">输入要求、成本边界与真实交付物，一屏看清</h2>
    </div>

    <!-- Background Gallery that blurs on Rack Focus -->
    <div class="s4-bg-layer" id="s4-bg-layer">
      <img src="assets/live/01_explore_grid.png" alt="Explore Grid Background" />
    </div>

    <!-- Sharp Focal Workflow Card + 3 Pop-out Visual Callouts -->
    <div class="s4-focal-stage">
      <div class="s4-hero-card" id="s4-hero-card">
        <img src="assets/visual_crops/crop_explore_single_cauai.png" alt="Hero Workflow Card" />
        <div class="s4-hero-bar">
          <span class="s4-hero-name">CAUAI 无限画布 · AIGC 工作台</span>
          <div class="s4-cta-btn" id="s4-btn-try">直达体验 ↗</div>
        </div>
      </div>

      <!-- Callout 1: Input Spec -->
      <div class="s4-spec-callout" id="s4-call-1" style="left: 96px; top: 300px;">
        <div class="s4-spec-icon" style="background:#FFF3E0;color:#E65100;">①</div>
        <div class="s4-spec-text">
          <h4>输入要求清清楚楚</h4>
          <p>所需参考图、参数格式一目了然</p>
        </div>
      </div>

      <!-- Callout 2: Cost Boundary -->
      <div class="s4-spec-callout" id="s4-call-2" style="left: 96px; top: 520px;">
        <div class="s4-spec-icon" style="background:var(--mint-bg);color:#047857;">②</div>
        <div class="s4-spec-text">
          <h4>算力成本边界透明</h4>
          <p>按真实 Token 成本精算，拒绝盲盒扣费</p>
        </div>
      </div>

      <!-- Callout 3: Real Deliverable -->
      <div class="s4-spec-callout" id="s4-call-3" style="right: 96px; top: 410px;">
        <div class="s4-spec-icon" style="background:#FCE4EC;color:#C2185B;">③</div>
        <div class="s4-spec-text">
          <h4>真实交付物即点即验</h4>
          <p>源码、脚本与在线预览 100% 实测可用</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 5 (36.58s - 46.84s): Visual De-AI Split-Tilt Comparison
       ======================================================================== -->
  <section class="hf-scene" id="scene-5">
    <div class="scene-header center" id="s5-header">
      <div class="kicker-row"><span class="k-spike">✱</span> ADVANTAGE 02 · DE-AI AESTHETIC ENGINE</div>
      <h2 class="display-title">
        把内行审美编码进底层，彻底
        <span class="mh-highlight-wrap">
          <span class="mh-highlight-bar mint" id="s5-hl-bar"></span>
          <span class="mh-highlight-text">洗掉 AI 塑料味</span>
        </span>
      </h2>
    </div>

    <div class="s1-split-stage" id="s5-split-stage">
      <!-- Left Card: Garish Neon Purple-Blue AI Plastic UI -->
      <div class="tilt-compare-card tilt-left-bad" id="s5-card-left">
        <div>
          <div class="card-top-bar">
            <span class="card-badge bad">❌ 普通 AI 生成界面</span>
            <span class="chrome-pill">GENERIC AI SLOP</span>
          </div>
          <div class="card-big-title">廉价紫蓝霓虹 · 千篇一律塑料味</div>
        </div>

        <div class="plastic-ui-mockup">
          <div class="plastic-glow-orb"></div>
          <div class="plastic-fake-hero">
            <h3>🚀 赋能未来 AI 超维生态矩阵！</h3>
            <p style="margin-top:8px;font-size:20px;opacity:0.85;">一键开启智能新时代，打造全方位闭环赋能解决方案</p>
          </div>
          <div class="plastic-fake-grid">
            <div class="plastic-fake-box">🤖 智能赋能</div>
            <div class="plastic-fake-box">⚡ 生态矩阵</div>
            <div class="plastic-fake-box">🌌 赛博未来</div>
          </div>
          <div class="plastic-fake-btn">✨ 立即尊享 AI 算力赋能 ➔</div>

          <div class="sketchout-stamp">
            <span class="sketch-line fwd" id="s5-sketch-fwd"></span>
            <span class="sketch-line bwd" id="s5-sketch-bwd"></span>
            <div class="sketch-stamp-pill" id="s5-sketch-pill">❌ 缺乏设计约束 · 满屏塑料味</div>
          </div>
        </div>
      </div>

      <!-- Right Card: ANS Editorial Design System (Bento / Swiss / Editorial) -->
      <div class="tilt-compare-card tilt-right-good" id="s5-card-right">
        <div>
          <div class="card-top-bar">
            <span class="card-badge good">✅ ANS VibeHub 审美基线</span>
            <span class="chrome-pill">EDITORIAL CRAFT</span>
          </div>
          <div class="card-big-title">Bento 便当格 · 瑞士网格 · 暖白纸感</div>
        </div>

        <div class="ans-good-visual" style="padding:10px;">
          <img src="assets/visual_crops/crop_vibehub_bento_swiss.png" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" alt="VibeHub Styles" />
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 6 (46.84s - 57.15s): counting-dynamic-scale + Prompt Transformer
       ======================================================================== -->
  <section class="hf-scene" id="scene-6">
    <div class="scene-header" id="s6-header">
      <div class="kicker-row"><span class="k-spike">✱</span> VIBEHUB VISUAL DICTIONARY · 审美积木库</div>
      <h2 class="display-title">300+ 内行术语与 24 套设计规范，一键转写大师指令</h2>
    </div>

    <div class="s6-main-grid">
      <!-- Left Column: Dynamic Scale Counters + SVG Progress Rings -->
      <div class="s6-stats-col">
        <div class="s6-stat-card" id="s6-stat-1">
          <div class="s6-stat-left">
            <span class="chrome-pill">VISUAL TERMINOLOGY</span>
            <div class="s6-num-wrap">
              <span class="s6-dynamic-num" id="s6-num-300">0</span>
              <span class="s6-num-suffix">+</span>
            </div>
            <div class="s6-stat-label">内行核心术语图鉴</div>
          </div>
          <div class="s6-ring-wrap">
            <svg class="s6-ring-svg" viewBox="0 0 148 148">
              <circle class="s6-ring-bg" cx="74" cy="74" r="58" />
              <circle class="s6-ring-fg" id="s6-ring-1" cx="74" cy="74" r="58" />
            </svg>
          </div>
        </div>

        <div class="s6-stat-card" id="s6-stat-2">
          <div class="s6-stat-left">
            <span class="chrome-pill">UI STYLE BASELINES</span>
            <div class="s6-num-wrap">
              <span class="s6-dynamic-num" id="s6-num-24">0</span>
              <span class="s6-num-suffix">套</span>
            </div>
            <div class="s6-stat-label">大师级设计规范与去 AI 味准则</div>
          </div>
          <div class="s6-ring-wrap">
            <svg class="s6-ring-svg" viewBox="0 0 148 148">
              <circle class="s6-ring-bg" cx="74" cy="74" r="58" />
              <circle class="s6-ring-fg coral" id="s6-ring-2" cx="74" cy="74" r="58" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Right Column: Visual One-Click Prompt Upgrade -->
      <div class="s6-transformer-card" id="s6-trans-card">
        <div class="s6-trans-top">
          <div class="s6-plain-bubble">💬 大白话：“帮我做个干净好看的个人网站”</div>
          <div class="s6-magic-btn" id="s6-magic-btn">✨ 一键转写内行指令</div>
        </div>

        <div class="s6-visual-result" id="s6-visual-result">
          <img src="assets/visual_crops/crop_vibehub_minimal_apple.png" alt="Minimal Apple Notion Styles" />
          <div class="s6-spec-overlay-pills" id="s6-spec-pills">
            <span class="s6-spec-pill">+ Bento Grid 便当格</span>
            <span class="s6-spec-pill">+ 暖白纸感 #FAF9F5</span>
            <span class="s6-spec-pill">+ 1px 极细墨线边框</span>
            <span class="s6-spec-pill">+ 去 AI 霓虹塑料味</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 7 (57.15s - 67.84s): Pure 3D Little Dino Stage + ai-tracking-box
       ======================================================================== -->
  <section class="hf-scene" id="scene-7">
    <div class="scene-header" id="s7-header">
      <div class="kicker-row"><span class="k-spike">✱</span> ADVANTAGE 03 · NATIVE 3D DINO STAGE &amp; VERIFIED COMPUTE</div>
      <h2 class="display-title">原生 3D 小恐龙交互展厅 · 网页端零算力实时互动</h2>
    </div>

    <div class="s7-stage-wrap" id="s7-stage-wrap">
      <img class="s7-stage-img" id="s7-img-hero" src="assets/live/08_dino_3d_hero.png" alt="3D Dino Hero" />
      <img class="s7-stage-img" id="s7-img-shy" src="assets/live/10_dino_3d_interact.png" style="opacity:0;" alt="3D Dino Shy Interact" />

      <div class="ai-track-box" id="s7-track-box">
        <div class="ai-corner tl"></div>
        <div class="ai-corner tr"></div>
        <div class="ai-corner bl"></div>
        <div class="ai-corner br"></div>
        <div class="ai-track-label" id="s7-track-label">🦕 ANS_DINO_3D · WebGL 60FPS · 99%</div>
      </div>
    </div>

    <div class="s7-right-cards">
      <div class="s7-feat-card" id="s7-feat-1">
        <div class="s7-feat-badge">🟢</div>
        <div class="s7-feat-copy">
          <h4>WebGL 零算力实时渲染</h4>
          <p>纯小恐龙 3D 舞台，打开网页即享丝滑帧率</p>
        </div>
      </div>
      <div class="s7-feat-card" id="s7-feat-2">
        <div class="s7-feat-badge">🎨</div>
        <div class="s7-feat-copy">
          <h4>GLSL 7 态表情 · 戳脸互动</h4>
          <p>滚轮伴飞运镜、戳脸害羞转身与彩蛋交互</p>
        </div>
      </div>
      <div class="s7-feat-card" id="s7-feat-3">
        <div class="s7-feat-badge">⚡</div>
        <div class="s7-feat-copy">
          <h4>多模型成本透明路由</h4>
          <p>按真实算力消耗计费，每一分积分花在明处</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================
       SCENE 8 (67.84s - 81.483s): 100% Sample Verification + CTA Finale
       ======================================================================== -->
  <section class="hf-scene" id="scene-8">
    <!-- Phase A: Sample Verification (67.84s - 74.22s) -->
    <div class="s8-verify-layer" id="s8-verify-layer">
      <div class="scene-header">
        <div class="kicker-row"><span class="k-spike">✱</span> 100% SAMPLE VERIFIED · 真实样本切片验真</div>
        <h2 class="display-title">公开真实样本切片 · 100% 能交付才开放购买</h2>
      </div>

      <div class="s8-market-bg" id="s8-market-bg">
        <img src="assets/live/10_market_verified_top.png" alt="Market Verified" />
      </div>

      <div class="s8-sample-focal" id="s8-sample-focal">
        <img src="assets/visual_crops/crop_market_sample_slice.png" alt="Sample Deliverable Slice" />
        <div class="s8-seal-row">
          <div class="s8-seal-badge">✅ 官方验真交付物 Sample · 支付即秒发</div>
          <span class="chrome-pill">READY_FOR_INSTANT_DELIVERY</span>
        </div>
      </div>
    </div>

    <!-- Phase B: Finale CTA (74.22s - 81.483s) -->
    <div class="s8-finale-layer" id="s8-finale-layer">
      <div class="kicker-row"><span class="k-spike">✱</span> 28-DAY AI CHALLENGE · DAY 01</div>
      <img class="finale-dino-hero" id="finale-dino" src="assets/dino_rgba/dino_16.png" alt="ANS Mascot" />
      <h1 class="finale-headline">把脑海里的灵感，<br/>长成看得见的真作品。</h1>
      <div class="finale-sub">ANS · AI Never Stops — 工程管线 × 内行审美 × 3D 小恐龙舞台</div>

      <div class="finale-cta-wrap">
        <div class="mh-burst-container" id="finale-burst">
          <span class="mh-burst-line" style="--angle: 0deg; --len: 65px;"></span>
          <span class="mh-burst-line" style="--angle: 30deg; --len: 50px;"></span>
          <span class="mh-burst-line" style="--angle: 60deg; --len: 75px;"></span>
          <span class="mh-burst-line" style="--angle: 90deg; --len: 45px;"></span>
          <span class="mh-burst-line" style="--angle: 120deg; --len: 68px;"></span>
          <span class="mh-burst-line" style="--angle: 150deg; --len: 55px;"></span>
          <span class="mh-burst-line" style="--angle: 180deg; --len: 65px;"></span>
          <span class="mh-burst-line" style="--angle: 210deg; --len: 50px;"></span>
          <span class="mh-burst-line" style="--angle: 240deg; --len: 75px;"></span>
          <span class="mh-burst-line" style="--angle: 270deg; --len: 45px;"></span>
          <span class="mh-burst-line" style="--angle: 300deg; --len: 68px;"></span>
          <span class="mh-burst-line" style="--angle: 330deg; --len: 55px;"></span>
        </div>
        <div class="finale-cta-btn" id="finale-cta-btn">
          <span>ans.cauai.fun</span>
          <span class="cta-arrow">↗</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Global Cursor + Click Ripple -->
  <div id="click-ripple"></div>
  <svg id="global-cursor" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 4 L29 16 L18 19 L13 30 Z" fill="#141413" stroke="#FAF9F5" stroke-width="2.5" stroke-linejoin="round" />
  </svg>

  <!-- Transparent Little Dino Companion (Bottom-Right, Zero White Box!) -->
  <div id="pip-dock">
    <img id="pip-dino-img" src="assets/dino_rgba/dino_00.png" alt="Little Dino Companion" />
    <div class="pip-tag">ANS · 3D 小恐龙</div>
  </div>

  <!-- Subtitle Bar -->
  <div id="sub-bar">
    <div id="sub-text">为什么九成的人每天都在刷 AI，最后手里却只剩下一堆聊天记录？</div>
    <div class="sub-prog-track"><div id="sub-prog-fill"></div></div>
  </div>
</div>

<script src="./gsap.min.js"></script>
<script>
(function() {{
  window.__timelines = window.__timelines || {{}};
  const tl = gsap.timeline({{ paused: true }});

  const SUBTITLES = {subs_js};
  const TOTAL_DUR = {total_dur};

  // Highlight key terms inside subtitle text
  const HL_GOLD = ["90%", "九成", "可复现的生产系统", "ANS · AI Never Stops", "第一个根本优势", "第二个根本优势", "第三个根本优势", "300+ 内行术语", "24 套设计规范", "100% 验真", "100% 能交付", "ans.cauai.fun"];
  const HL_MINT = ["标准化", "工程管线", "多智能体协同", "洗掉 AI 塑料味", "大师级精准指令", "3D 小恐龙", "真实样本切片", "28 天挑战 Day 01"];

  function formatSub(txt) {{
    let out = txt;
    HL_GOLD.forEach(w => {{
      out = out.replace(w, `<span class="sub-hl">${{w}}</span>`);
    }});
    HL_MINT.forEach(w => {{
      out = out.replace(w, `<span class="sub-mint">${{w}}</span>`);
    }});
    return out;
  }}

  // Prepare SVG stroke-dasharray / stroke-dashoffset
  function prepSvgPath(sel, fallbackLen) {{
    const el = document.querySelector(sel);
    if (!el) return fallbackLen;
    const len = (el.getTotalLength && el.getTotalLength()) || fallbackLen;
    el.style.strokeDasharray = `${{len}}`;
    el.style.strokeDashoffset = `${{len}}`;
    return len;
  }}

  ["#s2-path-1", "#s2-path-2", "#s2-path-3", "#s2-path-4"].forEach(s => prepSvgPath(s, 650));
  ["#s3-pipe-1", "#s3-pipe-2"].forEach(s => prepSvgPath(s, 140));
  prepSvgPath("#s6-ring-1", 365);
  prepSvgPath("#s6-ring-2", 365);

  // Helper: Physics Press Reaction (Cursor + Target synced compression & release + ripple)
  function addPhysicsPress(targetSel, x, y, startAt) {{
    tl.to("#global-cursor", {{ opacity: 1, x: x, y: y, duration: 0.55, ease: "power2.inOut" }}, startAt - 0.58);
    tl.to([targetSel, "#global-cursor"], {{ scale: 0.90, duration: 0.14, ease: "power2.in" }}, startAt);
    tl.set("#click-ripple", {{ x: x, y: y, scale: 0.2, opacity: 0.95 }}, startAt + 0.10);
    tl.to("#click-ripple", {{ scale: 1.85, opacity: 0, duration: 0.55, ease: "power2.out" }}, startAt + 0.12);
    tl.to([targetSel, "#global-cursor"], {{ scale: 1.0, duration: 0.45, ease: "back.out(2.0)" }}, startAt + 0.14);
  }}

  // =========================================================================
  // SCENE 1 (0.00s - 9.76s): split-tilt-cards + kinetic-beat-slam + sketchout
  // =========================================================================
  gsap.set("#scene-1", {{ opacity: 1 }});
  tl.fromTo("#s1-header",
    {{ scale: 1.35, filter: "blur(14px)", opacity: 0 }},
    {{ scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.55, ease: "power4.out" }},
    0.05
  );
  // Left Card (Messy Chat) slides in from left with 3D +Y tilt
  tl.fromTo("#s1-card-left",
    {{ x: -340, rotateY: 22, opacity: 0 }},
    {{ x: 0, rotateY: 11, opacity: 1, duration: 0.75, ease: "power3.out" }},
    0.25
  );
  // Sketchout cross-hatch slashes across Left Card at 2.3s
  tl.to("#s1-sketch-fwd", {{ scaleX: 1, duration: 0.32, ease: "power2.out" }}, 2.30);
  tl.to("#s1-sketch-bwd", {{ scaleX: 1, duration: 0.32, ease: "power2.out" }}, 2.50);
  tl.fromTo("#s1-sketch-pill",
    {{ scale: 1.6, opacity: 0, rotation: -12 }},
    {{ scale: 1, opacity: 1, rotation: -6, duration: 0.4, ease: "back.out(1.8)" }},
    2.68
  );

  // Right Card (ANS Production System) slams in on c_01 (4.31s) with -Y tilt
  tl.fromTo("#s1-card-right",
    {{ x: 360, rotateY: -22, opacity: 0 }},
    {{ x: 0, rotateY: -11, opacity: 1, duration: 0.75, ease: "power3.out" }},
    4.31
  );
  // Yellow Highlighter sweeps across "可复现的生产系统"
  tl.to("#s1-hl-bar", {{ scaleX: 1, duration: 0.55, ease: "power2.out" }}, 4.95);
  // Dim left bad card slightly so right card dominates
  tl.to("#s1-card-left", {{ opacity: 0.58, filter: "grayscale(0.5)", duration: 0.5 }}, 4.80);

  // Counter-phase idle float (5.2s - 9.3s)
  tl.to("#s1-card-left", {{ y: -8, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: 1 }}, 5.20);
  tl.to("#s1-card-right", {{ y: 8, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: 1 }}, 5.20);

  // SEAM CUT 1 (9.40s -> 9.76s): Velocity-Matched Zoom-Through
  tl.to("#scene-1",
    {{ scale: 1.24, filter: "blur(16px)", opacity: 0, duration: 0.36, ease: "power3.in" }},
    9.40
  );

  // =========================================================================
  // SCENE 2 (9.76s - 17.86s): 3d-page-scroll + center-outward-expansion
  // =========================================================================
  tl.fromTo("#scene-2",
    {{ scale: 0.78, filter: "blur(16px)", opacity: 0 }},
    {{ scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.48, ease: "expo.out" }},
    9.76
  );
  // 3D Page Scroll inside tilted browser card (10.2s - 12.6s)
  tl.to("#s2-scroll-content",
    {{ y: -560, duration: 2.2, ease: "power3.out" }},
    10.20
  );

  // At c_03 (12.82s): Browser card recedes into Depth-of-Field Blur while 4 Visual Cards burst outward!
  tl.to("#s2-browser-card",
    {{ "--dof": "12px", opacity: 0.32, duration: 0.65, ease: "power2.inOut" }},
    12.82
  );
  tl.fromTo("#s2-center-hub",
    {{ xPercent: -50, yPercent: -50, scale: 0, opacity: 0 }},
    {{ xPercent: -50, yPercent: -50, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }},
    12.85
  );
  // Self-drawing SVG bezier connectors
  ["#s2-path-1", "#s2-path-2", "#s2-path-3", "#s2-path-4"].forEach((sel, idx) => {{
    tl.to(sel, {{ strokeDashoffset: 0, duration: 0.65, ease: "power2.out" }}, 13.05 + idx * 0.08);
  }});
  // 4 Burst Picture Cards (center-outward-expansion)
  ["#s2-burst-1", "#s2-burst-2", "#s2-burst-3", "#s2-burst-4"].forEach((sel, idx) => {{
    const el = document.querySelector(sel);
    const tx = Number(el.dataset.tx);
    const ty = Number(el.dataset.ty);
    tl.fromTo(el,
      {{ xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.45, opacity: 0 }},
      {{ xPercent: -50, yPercent: -50, x: tx, y: ty, scale: 1, opacity: 1, duration: 0.85, ease: "expo.out" }},
      13.10 + idx * 0.07
    );
  }});

  // SEAM CUT 2 (17.50s -> 17.86s): Cut the Curve (Whip-pan horizontal)
  tl.to("#scene-2",
    {{ x: -260, filter: "blur(12px)", opacity: 0, duration: 0.36, ease: "power4.in" }},
    17.50
  );

  // =========================================================================
  // SCENE 3 (17.86s - 28.41s): 3-Station Visual Pipeline + svg-path-draw
  // =========================================================================
  tl.fromTo("#scene-3",
    {{ x: 260, filter: "blur(12px)", opacity: 0 }},
    {{ x: 0, filter: "blur(0px)", opacity: 1, duration: 0.44, ease: "power4.out" }},
    17.86
  );
  // Hand-drawn Circle around "盲盒式抽卡"
  tl.to("#s3-circle-ring",
    {{ scale: 1, rotation: -2.5, duration: 0.55, ease: "back.out(1.7)" }},
    18.55
  );
  // Station 1 enters at 18.2s + dynamic scale counter 0 -> 80%
  tl.fromTo("#s3-st-1",
    {{ y: 70, opacity: 0, scale: 0.92 }},
    {{ y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "power3.out" }},
    18.20
  );
  const st1Count = {{ val: 0, size: 42 }};
  const elCount80 = document.getElementById("s3-counter-80");
  tl.to(st1Count, {{
    val: 80,
    size: 76,
    duration: 1.6,
    ease: "power3.out",
    onUpdate: () => {{
      elCount80.textContent = Math.round(st1Count.val);
      elCount80.style.fontSize = `${{st1Count.size}}px`;
    }}
  }}, 18.80);

  // SVG Pipe 1 draws at 22.4s -> Station 2 (Multi-Agent) enters at 22.86s (c_05)
  tl.to("#s3-pipe-1", {{ strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }}, 22.40);
  tl.fromTo("#s3-st-2",
    {{ y: 70, opacity: 0, scale: 0.92 }},
    {{ y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "power3.out" }},
    22.86
  );

  // SVG Pipe 2 draws at 24.8s -> Station 3 (Verified Output) enters at 25.2s
  tl.to("#s3-pipe-2", {{ strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }}, 24.80);
  tl.fromTo("#s3-st-3",
    {{ y: 70, opacity: 0, scale: 0.92 }},
    {{ y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "power3.out" }},
    25.20
  );

  // Cross-dissolve into Scene 4 at 28.41s
  tl.to("#scene-3", {{ opacity: 0, scale: 0.95, duration: 0.38, ease: "power2.inOut" }}, 28.10);

  // =========================================================================
  // SCENE 4 (28.41s - 36.58s): depth-of-field-blur Rack Focus + 3 Spec Callouts
  // =========================================================================
  tl.fromTo("#scene-4",
    {{ opacity: 0, scale: 1.03 }},
    {{ opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }},
    28.41
  );
  // Rack Focus: Background blurs to 12px & dims while Hero Card pops in Z-space
  tl.to("#s4-bg-layer",
    {{ "--dof": "12px", opacity: 0.36, scale: 0.98, duration: 0.7, ease: "power2.inOut" }},
    28.85
  );
  tl.fromTo("#s4-hero-card",
    {{ scale: 0.72, y: 50, opacity: 0 }},
    {{ scale: 1, y: 24, opacity: 1, duration: 0.7, ease: "back.out(1.4)" }},
    28.90
  );
  // 3 Spec Callouts pop sequentially on VO cues ("输入要求", "成本边界", "真实交付物")
  tl.fromTo("#s4-call-1",
    {{ x: -80, opacity: 0, scale: 0.85 }},
    {{ x: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }},
    29.40
  );
  tl.fromTo("#s4-call-2",
    {{ x: -80, opacity: 0, scale: 0.85 }},
    {{ x: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }},
    30.45
  );
  tl.fromTo("#s4-call-3",
    {{ x: 80, opacity: 0, scale: 0.85 }},
    {{ x: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }},
    31.50
  );
  // Cursor clicks "直达体验 ↗" with physics-press-reaction at 33.6s
  gsap.set("#global-cursor", {{ x: 1450, y: 920 }});
  addPhysicsPress("#s4-btn-try", 1185, 815, 33.60);
  tl.to("#global-cursor", {{ opacity: 0, duration: 0.3 }}, 34.60);

  // SEAM CUT 3 (36.22s -> 36.58s): Zoom-Through into Scene 5
  tl.to("#scene-4",
    {{ scale: 1.22, filter: "blur(16px)", opacity: 0, duration: 0.36, ease: "power3.in" }},
    36.22
  );

  // =========================================================================
  // SCENE 5 (36.58s - 46.84s): Visual De-AI Split-Tilt Cards
  // =========================================================================
  tl.fromTo("#scene-5",
    {{ scale: 0.78, filter: "blur(16px)", opacity: 0 }},
    {{ scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.48, ease: "expo.out" }},
    36.58
  );
  tl.to("#s5-hl-bar", {{ scaleX: 1, duration: 0.55, ease: "power2.out" }}, 37.30);

  // Left Card (Plastic AI Slop) & Right Card (ANS VibeHub) enter with 3D book-open tilt
  tl.fromTo("#s5-card-left",
    {{ x: -320, rotateY: 22, opacity: 0 }},
    {{ x: 0, rotateY: 11, opacity: 1, duration: 0.75, ease: "power3.out" }},
    36.90
  );
  tl.fromTo("#s5-card-right",
    {{ x: 320, rotateY: -22, opacity: 0 }},
    {{ x: 0, rotateY: -11, opacity: 1, duration: 0.75, ease: "power3.out" }},
    38.10
  );
  // At c_09 (41.94s): Red Sketchout slashes the Plastic AI mockup
  tl.to("#s5-sketch-fwd", {{ scaleX: 1, duration: 0.32, ease: "power2.out" }}, 42.10);
  tl.to("#s5-sketch-bwd", {{ scaleX: 1, duration: 0.32, ease: "power2.out" }}, 42.30);
  tl.fromTo("#s5-sketch-pill",
    {{ scale: 1.6, opacity: 0, rotation: -12 }},
    {{ scale: 1, opacity: 1, rotation: -6, duration: 0.4, ease: "back.out(1.8)" }},
    42.50
  );
  tl.to("#s5-card-left", {{ opacity: 0.52, duration: 0.5 }}, 42.60);

  // Transition into Scene 6 at 46.84s
  tl.to("#scene-5", {{ x: -240, opacity: 0, duration: 0.38, ease: "power3.in" }}, 46.46);

  // =========================================================================
  // SCENE 6 (46.84s - 57.15s): counting-dynamic-scale + Prompt Transformer
  // =========================================================================
  tl.fromTo("#scene-6",
    {{ x: 240, opacity: 0 }},
    {{ x: 0, opacity: 1, duration: 0.45, ease: "power3.out" }},
    46.84
  );
  // Dynamic Scale Counters (300+ & 24套) + SVG Ring Draws
  const c300 = {{ val: 0, size: 48 }};
  const c24 = {{ val: 0, size: 48 }};
  const el300 = document.getElementById("s6-num-300");
  const el24 = document.getElementById("s6-num-24");

  tl.to(c300, {{
    val: 300,
    size: 102,
    duration: 1.8,
    ease: "power3.out",
    onUpdate: () => {{
      el300.textContent = Math.round(c300.val);
      el300.style.fontSize = `${{c300.size}}px`;
    }}
  }}, 47.20);
  tl.to("#s6-ring-1", {{ strokeDashoffset: 35, duration: 1.8, ease: "power3.out" }}, 47.20);

  tl.to(c24, {{
    val: 24,
    size: 102,
    duration: 1.8,
    ease: "power3.out",
    onUpdate: () => {{
      el24.textContent = Math.round(c24.val);
      el24.style.fontSize = `${{c24.size}}px`;
    }}
  }}, 47.50);
  tl.to("#s6-ring-2", {{ strokeDashoffset: 55, duration: 1.8, ease: "power3.out" }}, 47.50);

  // Right Column Prompt Transformer enters at 48.2s, then clicked at 52.8s (c_11)
  tl.fromTo("#s6-trans-card",
    {{ y: 50, opacity: 0 }},
    {{ y: 0, opacity: 1, duration: 0.65, ease: "power3.out" }},
    48.20
  );
  gsap.set("#s6-spec-pills .s6-spec-pill", {{ y: 24, opacity: 0 }});
  gsap.set("#global-cursor", {{ x: 1750, y: 520 }});
  addPhysicsPress("#s6-magic-btn", 1640, 315, 52.85);
  tl.to("#s6-spec-pills .s6-spec-pill",
    {{ y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "back.out(1.6)" }},
    53.15
  );
  tl.to("#global-cursor", {{ opacity: 0, duration: 0.3 }}, 54.20);

  // SEAM CUT 4 (56.78s -> 57.15s): Inverse Zoom-Through into Scene 7
  tl.to("#scene-6",
    {{ scale: 0.80, filter: "blur(14px)", opacity: 0, duration: 0.37, ease: "power3.in" }},
    56.78
  );
  // Hide bottom-right PiP dino during Scene 7 & 8 Finale so there's no double dino
  tl.to("#pip-dock", {{ opacity: 0, scale: 0.8, duration: 0.35 }}, 56.85);

  // =========================================================================
  // SCENE 7 (57.15s - 67.84s): Pure 3D Little Dino Stage + ai-tracking-box
  // =========================================================================
  tl.fromTo("#scene-7",
    {{ scale: 1.22, filter: "blur(14px)", opacity: 0 }},
    {{ scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.48, ease: "expo.out" }},
    57.15
  );
  // AI Tracking Box snaps onto 3D Little Dino
  const trackBox = document.getElementById("s7-track-box");
  const trackLbl = document.getElementById("s7-track-label");
  tl.fromTo(trackBox,
    {{ scale: 0.65, opacity: 0 }},
    {{ scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.6)" }},
    57.65
  );
  // Continuous deterministic sine tracking across 58.15s - 67.5s
  const trackState = {{ p: 0 }};
  tl.to(trackState, {{
    p: Math.PI * 4,
    duration: 9.3,
    ease: "none",
    onUpdate: () => {{
      const dx = Math.cos(trackState.p) * 18;
      const dy = Math.sin(trackState.p * 1.3) * 12;
      const w = 340 + Math.sin(trackState.p * 2.1) * 18;
      const h = 360 + Math.cos(trackState.p * 2.1) * 16;
      trackBox.style.width = `${{w}}px`;
      trackBox.style.height = `${{h}}px`;
      trackBox.style.left = `${{420 + dx - (w - 340)/2}}px`;
      trackBox.style.top = `${{130 + dy - (h - 360)/2}}px`;
      const conf = Math.round(98 + Math.sin(trackState.p * 3.7));
      trackLbl.textContent = `🦕 ANS_DINO_3D · WebGL 60FPS · ${{conf}}%`;
    }}
  }}, 58.15);

  // 3 Right Feature Cards enter staggered
  ["#s7-feat-1", "#s7-feat-2", "#s7-feat-3"].forEach((sel, idx) => {{
    tl.fromTo(sel,
      {{ x: 80, opacity: 0 }},
      {{ x: 0, opacity: 1, duration: 0.55, ease: "power3.out" }},
      58.0 + idx * 0.35
    );
  }});

  // Cursor clicks 3D Little Dino's cheek at 63.1s -> crossfades to shy turn bubble!
  gsap.set("#global-cursor", {{ x: 980, y: 780 }}, 62.30);
  addPhysicsPress("#s7-stage-wrap", 640, 520, 63.10);
  tl.to("#s7-img-shy", {{ opacity: 1, duration: 0.45, ease: "power2.out" }}, 63.25);
  tl.to("#global-cursor", {{ opacity: 0, duration: 0.3 }}, 64.20);

  // Transition into Scene 8 at 67.84s
  tl.to("#scene-7", {{ opacity: 0, scale: 0.96, duration: 0.38, ease: "power2.inOut" }}, 67.48);

  // =========================================================================
  // SCENE 8 (67.84s - 81.483s): Sample Verification + CTA Finale
  // =========================================================================
  tl.fromTo("#scene-8",
    {{ opacity: 0, scale: 1.03 }},
    {{ opacity: 1, scale: 1, duration: 0.42, ease: "power2.out" }},
    67.84
  );
  // Rack Focus on Market Sample Verification Slice
  tl.to("#s8-market-bg",
    {{ "--dof": "10px", opacity: 0.45, duration: 0.65, ease: "power2.inOut" }},
    68.30
  );
  tl.fromTo("#s8-sample-focal",
    {{ x: 120, scale: 0.88, opacity: 0 }},
    {{ x: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.4)" }},
    68.35
  );

  // At c_15 (74.22s): Morph/Fade into Finale CTA Stage
  tl.to("#s8-verify-layer", {{ opacity: 0, scale: 0.94, duration: 0.45, ease: "power2.inOut" }}, 74.10);
  tl.fromTo("#s8-finale-layer",
    {{ opacity: 0, scale: 1.06 }},
    {{ opacity: 1, scale: 1, duration: 0.55, ease: "expo.out" }},
    74.22
  );
  tl.fromTo("#finale-dino",
    {{ y: 30, scale: 0.8, opacity: 0 }},
    {{ y: 0, scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.8)" }},
    74.40
  );

  // Cursor approaches "ans.cauai.fun" CTA button & clicks at 76.5s with 12-line Burst!
  gsap.set("#global-cursor", {{ x: 1380, y: 980 }}, 75.70);
  addPhysicsPress("#finale-cta-btn", 960, 865, 76.50);
  document.querySelectorAll("#finale-burst .mh-burst-line").forEach((line, idx) => {{
    const angle = line.style.getPropertyValue("--angle") || `${{idx * 30}}deg`;
    tl.fromTo(line,
      {{ transform: `rotate(${{angle}}) translateY(-95px) scaleY(0)`, opacity: 0 }},
      {{ transform: `rotate(${{angle}}) translateY(-115px) scaleY(1)`, opacity: 1, duration: 0.45, ease: "power2.out" }},
      76.64 + idx * 0.015
    );
    tl.to(line,
      {{ opacity: 0, duration: 0.6, ease: "power1.out" }},
      77.45
    );
  }});

  // =========================================================================
  // CONTINUOUS MASTER DRIVER (Subtitles, Chapter Tabs, PiP Dino Animation)
  // =========================================================================
  const subTextEl = document.getElementById("sub-text");
  const subProgEl = document.getElementById("sub-prog-fill");
  const pipImgEl = document.getElementById("pip-dino-img");
  const pipDockEl = document.getElementById("pip-dock");
  const chTabs = [
    document.getElementById("ch-0"),
    document.getElementById("ch-1"),
    document.getElementById("ch-2"),
    document.getElementById("ch-3")
  ];

  const driver = {{ t: 0 }};
  tl.to(driver, {{
    t: TOTAL_DUR,
    duration: TOTAL_DUR,
    ease: "none",
    onUpdate: () => {{
      const cur = driver.t;

      // 1. Update Active Chapter Pill
      let activeCh = 0;
      if (cur >= 57.15) activeCh = 3;
      else if (cur >= 36.58) activeCh = 2;
      else if (cur >= 17.86) activeCh = 1;
      chTabs.forEach((tab, i) => {{
        if (i === activeCh) tab.classList.add("active");
        else tab.classList.remove("active");
      }});

      // 2. Update Subtitle & Progress Fill
      let matched = null;
      for (let i = 0; i < SUBTITLES.length; i++) {{
        const [s, e, text] = SUBTITLES[i];
        if (cur >= s && cur <= e) {{
          matched = [s, e, text];
          break;
        }}
      }}
      if (matched) {{
        const [s, e, text] = matched;
        subTextEl.innerHTML = formatSub(text);
        const pct = Math.max(0, Math.min(100, ((cur - s) / Math.max(0.1, e - s)) * 100));
        subProgEl.style.width = `${{pct.toFixed(1)}}%`;
      }}

      // 3. Animate Transparent Little Dino Companion in Bottom-Right (0s - 56.85s)
      if (cur < 56.85) {{
        const frameIdx = Math.floor(cur * 12) % 24;
        const padIdx = String(frameIdx).padStart(2, "0");
        pipImgEl.src = `assets/dino_rgba/dino_${{padIdx}}.png`;
        const bobY = Math.sin(cur * 3.2) * 6;
        pipDockEl.style.transform = `translateY(${{bobY.toFixed(1)}}px)`;
      }}
    }}
  }}, 0);

  window.__timelines["main"] = tl;
  window.__seekTo = function(sec) {{
    tl.seek(sec, false);
  }};
}})();
</script>
</body>
</html>
"""
    out_file = STAGE_DIR / "index.html"
    out_file.write_text(html, encoding="utf-8")
    print(f"Wrote HyperFrames stage to {out_file} ({len(html)} bytes)")


if __name__ == "__main__":
    build_stage()
