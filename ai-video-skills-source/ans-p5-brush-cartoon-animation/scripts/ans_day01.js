// ans_day01.js: Richly layered hand-painted p5.js + p5.brush animation for
// "🟢 Day 01 / 28 · ANS (AI Never Stops) 正式上线 (https://ans.cauai.fun)"
// Starring:
//   - creator(x, y, u, o) : "我" (White crew-neck T-shirt 白体恤, head flower cluster 头上一堆花, double-bridge hollow glasses)
//   - dino(x, y, u, o)    : "小恐龙" (Ultra-Kawaii Marshmallow-Plush ANS Mascot #9BE0C5)
(() => {
  const WIPE_MINT = ['#68B896', '#9BE0C5'];
  const WIPE_GOLD = ['#E8AA38', '#9BE0C5'];
  const WIPE_ROSE = ['#E27A92', '#E8AA38'];

  // Sparkle burst helper
  function sparkle(x, y, r, k, col = PAL.cream) {
    if (k <= 0 || k >= 1) return;
    const s = r * backOut(clamp(k * 2.2)) * (1 - k * 0.55);
    paint(starPts(x, y, s, 0.28, 4, k * 1.8), {
      wash: col, washOp: Math.round(255 * (1 - k * k)), ink: PAL.ink, sw: 0.5
    });
  }

  // Hand-painted fluffy cloud helper
  function paintCloud(cx, cy, rx, ry, col = PAL.cream, seedKey = 'c') {
    boilSeed('cloud_' + seedKey);
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const up = Math.sin(a) < 0;
      const bump = up ? 1 + 0.32 * Math.abs(Math.sin(a * 3)) : 1;
      pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * (up ? bump : 0.65)]);
    }
    paint(pts, { wash: col, washOp: 235, ink: PAL.ink, sw: 0.85, curv: 0.35 });
  }

  // Hand-painted potted botanical plant helper
  function paintPlant(x, y, s, t, seedKey = 'p') {
    boilSeed('plant_' + seedKey);
    const sw = wob(t, 0.6, hash(seedKey.length) * 3) * 6 * s;
    // Leaves
    const leaves = [
      [-28, -68, 22, 42, -0.45],
      [0, -82, 24, 48, 0.05],
      [28, -65, 22, 40, 0.48]
    ];
    for (const [lx, ly, rx, ry, rot] of leaves) {
      paint(ellPts(x + lx * s + sw * 0.5, y + ly * s, rx * s, ry * s, 14, 0.8, rot), {
        wash: '#6E9F58', fill: '#3A9C98', fillOp: 70, ink: PAL.ink, sw: 0.9
      });
    }
    // Terracotta pot
    paint([[x - 28 * s, y - 42 * s], [x + 28 * s, y - 42 * s], [x + 22 * s, y], [x - 22 * s, y]], {
      wash: PAL.clay, fill: PAL.clayDk, fillOp: 80, ink: PAL.ink, sw: 1.0
    });
    paint(rrPts(x - 32 * s, y - 50 * s, 64 * s, 12 * s, 4 * s, 0.5), {
      wash: PAL.clayLt, ink: PAL.ink, sw: 0.9
    });
  }

  // Festive hanging string lights across the top of a room/stage
  function paintStringLights(y0, sag, count, t, glowCol = '#FFE066', seedKey = 'lights') {
    boilSeed('str_' + seedKey);
    const P = [];
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const x = lerp(80, W - 80, u);
      const y = y0 + Math.sin(u * Math.PI) * sag;
      P.push([x, y]);
    }
    inkLine(P, 1.1, PAL.ink, 'ink', 0.5);
    for (let i = 1; i < count; i++) {
      const [bx, by] = P[i];
      const pulseA = 0.65 + 0.35 * Math.sin(t * 5 + i * 1.4);
      glow(bx, by + 12, 42, glowCol, 0.5 * pulseA);
      paint(ellPts(bx, by + 12, 9, 12, 10), {
        wash: i % 2 ? glowCol : DINO_COLS.mint, ink: PAL.ink, sw: 0.7
      });
    }
  }

  // Hand-painted floor planks & woven rug
  function paintFloorAndRug(floorY, floorCol, floorDk, rugCol1, rugCol2, seedKey = 'fl') {
    boilSeed('floor_' + seedKey);
    paint(rectPts(-300, floorY, W + 600, H - floorY + 300, 3), {
      wash: floorCol, fill: floorDk, fillOp: 85, bleed: 0.08, tex: 0.5, ink: null
    });
    inkLine([[-300, floorY], [W * 0.5, floorY - 3], [W + 300, floorY + 2]], 1.4, PAL.ink, 'ink', 0.4);
    // Perspective plank lines
    for (let i = -3; i <= 3; i++) {
      const xTop = W / 2 + i * 260, xBot = W / 2 + i * 380;
      inkLine([[xTop, floorY + 2], [xBot, H + 40]], 0.6, mixCol(floorDk, PAL.ink, 0.35), 'inkfine', 0);
    }
    // Cozy woven studio rug under the characters
    boilSeed('rug_' + seedKey);
    paint(ellPts(W / 2, floorY + 26, 480, 44, 28, 1.5), {
      wash: rugCol1, fill: rugCol2, fillOp: 90, ink: PAL.ink, sw: 1.1
    });
    paint(ellPts(W / 2, floorY + 26, 370, 28, 22, 1.0), {
      wash: PAL.cream, ink: PAL.ink, sw: 0.7
    });
  }

  // Hand-painted comic subtitle ribbon at bottom of screen (screen space, flushed before transitions)
  function storyRibbon(tag, lineText, lt, dur) {
    boilSeed('ribbon_' + tag);
    const popK = backOut(seg(lt, 0.08, 0.36));
    const yC = 1004;
    const rw = 1520, rh = 82;
    push();
    translate(W / 2, yC);
    scale(0.92 + 0.08 * popK, popK);
    paint(rrPts(-rw / 2, -rh / 2, rw, rh, 22, 1.8), {
      wash: '#FFFDF6', washOp: 248, fill: '#F2E5CE', fillOp: 70, bleed: 0.08,
      ink: PAL.ink, sw: 1.5
    });
    paint(rrPts(-rw / 2 + 14, -rh / 2 + 12, 270, rh - 24, 15, 1.2), {
      wash: DINO_COLS.mint, washOp: 255, fill: DINO_COLS.mintDk, fillOp: 65,
      ink: PAL.ink, sw: 1.2
    });
    pop();
    if (popK > 0.25) {
      letter(tag, W / 2 - rw / 2 + 149, yC + 2, 29, PAL.ink, { screen: true, ink: false });
      letter(lineText, W / 2 + 125, yC + 2, 34, PAL.ink, { screen: true, ink: false });
    }
    flushLetters();
  }

  // ============================================================================
  // SHOT 1 (0.0s – 3.0s): 痛点暴击 — "90% 的人每天都在刷 AI，最后只剩聊天记录和收藏夹吃灰"
  // ============================================================================
  function drawDustyTower(baseX, baseY, side, t, blastK, idKey) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      boilSeed(`tower_${idKey}_${i}`);
      const w = 225 - i * 8, h = 52;
      const sway = Math.sin(t * 3.2 + i * 0.7 + side) * (4 + i * 3.5);
      const startPos = [baseX + sway + (hash(i * 11 + side) - 0.5) * 22, baseY - (i + 0.5) * (h + 6)];
      const endPos = [baseX + side * (80 + i * 18), baseY - 75 - i * 50];
      const pos = blastK > 0 ? arcPt(startPos, endPos, 80 + i * 14, easeOut(blastK)) : startPos;
      const rot = (hash(i * 7 + side) - 0.5) * 0.14 + (blastK > 0 ? side * blastK * (0.5 + i * 0.1) : sway * 0.004);
      const cols = ['#6D657C', '#867B6E', '#5D5A72', '#7E7468'];
      const c = cols[i % cols.length];
      push();
      translate(pos[0], pos[1]);
      rotate(rot);
      paint(rrPts(-w / 2, -h / 2, w, h, 10, 1.5), {
        wash: c, washOp: 255, fill: '#322C3E', fillOp: 100, bleed: 0.1, tex: 0.6,
        ink: PAL.ink, sw: 1.2
      });
      paint(rectPts(-w * 0.36, -h * 0.18, w * 0.72, h * 0.34, 0.8), {
        wash: '#D8CFC2', washOp: 215, ink: null
      });
      pop();
      if (i === 2) {
        const subTxt = side < 0 ? '📁 AI 教程收藏 (未看)' : '💬 历史对话 999+';
        letter(subTxt, pos[0], pos[1], 20, PAL.ink, { rot, ink: false });
      }
      if (i === 6) {
        const labelTxt = side < 0 ? '★ 99+ 收藏夹吃灰' : '一堆聊天记录吃灰';
        paint(rrPts(pos[0] - 150, pos[1] - 90, 300, 50, 12, 1.2), {
          wash: '#2B2233', ink: PAL.ink, sw: 1.2
        });
        letter(labelTxt, pos[0], pos[1] - 65, 26, PAL.ochre);
      }
    }
  }

  function shot1Bookmarks(t, lt, dur) {
    const tSweep = 1.45;
    const sweepK = seg(lt, tSweep, tSweep + 1.15);
    const shake = lt > tSweep && lt < tSweep + 0.5 ? shakeXY(t, 9 * Math.exp(-(lt - tSweep) * 6)) : [0, 0];
    camBegin(
      960 + shake[0] + 12 * Math.sin(lt * 0.9),
      kf(lt, [[0, 540], [tSweep, 525], [dur, 535]]) + shake[1],
      kf(lt, [[0, 1.0], [tSweep, 1.04], [dur, 1.01]])
    );

    // Rich Twilight Study Room Background
    boilSeed('shot1_wall');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#282538', ink: null });
    paint(ellPts(W * 0.5, H * 0.42, W * 0.68, H * 0.44, 28, 12), {
      fill: '#3D3758', fillOp: 115, bleed: 0.28, tex: 0.6, ink: null
    });

    // Arched Studio Window on Center-Left Wall (Night Moon → Golden-Mint Dawn!)
    boilSeed('shot1_window');
    const wx = 720, wy = 240, ww = 210, wh = 290;
    paint(rrPts(wx - ww / 2, wy, ww, wh, 95, 1.5), {
      wash: mixCol('#1B2042', '#7CE0C3', sweepK * 0.7),
      fill: sweepK > 0.1 ? '#FFE082' : PAL.indigo, fillOp: 95, ink: PAL.ink, sw: 1.6
    });
    // Crescent moon & stars inside window
    paint(ellPts(wx - 35, wy + 85, 28, 28, 14), { wash: '#FFE899', ink: PAL.ink, sw: 0.8 });
    paint(starPts(wx + 42, wy + 70, 11, 0.38, 4, t), { wash: PAL.cream, ink: null });
    paint(starPts(wx + 25, wy + 135, 9, 0.38, 4, -t), { wash: PAL.cream, ink: null });
    // Window muntin crossbars & sill
    inkLine([[wx, wy + 8], [wx, wy + wh - 6]], 1.4, PAL.ink, 'ink', 0);
    inkLine([[wx - ww / 2 + 6, wy + wh * 0.52], [wx + ww / 2 - 6, wy + wh * 0.52]], 1.4, PAL.ink, 'ink', 0);
    paint(rrPts(wx - ww * 0.58, wy + wh - 8, ww * 1.16, 22, 6, 1.0), { wash: '#5A4A42', ink: PAL.ink, sw: 1.2 });

    // Wooden Bookshelf on Right-Center Wall
    boilSeed('shot1_shelf');
    const sx = 1190, sy = 250, swW = 200, shH = 320;
    paint(rrPts(sx - swW / 2, sy, swW, shH, 10, 1.5), {
      wash: '#4E3E3A', fill: '#332624', fillOp: 95, ink: PAL.ink, sw: 1.4
    });
    for (let r = 0; r < 3; r++) {
      const ry = sy + 95 + r * 95;
      inkLine([[sx - swW / 2 + 8, ry], [sx + swW / 2 - 8, ry]], 1.4, PAL.ink, 'ink', 0);
      const bookCols = [PAL.rose, PAL.ochre, PAL.teal, DINO_COLS.mint, PAL.sky];
      for (let b = 0; b < 5; b++) {
        paint(rrPts(sx - 78 + b * 31, ry - 68, 26, 66, 4, 0.6), {
          wash: bookCols[(r * 2 + b) % bookCols.length], ink: PAL.ink, sw: 0.8
        });
      }
    }

    // Hanging Edison Pendant Lamp in Top Center
    boilSeed('shot1_lamp');
    inkLine([[960, -40], [960, 175]], 1.2, PAL.ink, 'ink', 0);
    paint([[925, 195], [995, 195], [975, 168], [945, 168]], { wash: '#3B4254', ink: PAL.ink, sw: 1.1 });
    glow(960, 215, 180 + 260 * sweepK, '#FFE082', 0.65 + 0.3 * sweepK);
    paint(ellPts(960, 206, 16, 18, 12), { wash: '#FFE885', ink: PAL.ink, sw: 0.9 });

    // Floor, Rug & Potted Plants
    paintFloorAndRug(855, '#383246', '#241F30', '#524868', '#3B9C98', 's1');
    paintPlant(140, 855, 1.05, t, 's1L');
    paintPlant(1780, 855, 1.05, t, 's1R');

    if (sweepK > 0.01) {
      glow(930, 590, 360 + 520 * easeOut(sweepK), DINO_COLS.mint, 0.85 * sweepK);
    }

    // Top floating context sign
    boilSeed('shot1_top');
    paint(rrPts(520, 48, 880, 72, 18, 1.8), {
      wash: '#36304A', washOp: 248, fill: PAL.indigo, fillOp: 90, ink: PAL.ink, sw: 1.4
    });
    letter('🟢 Day 01 / 28 · ANS (AI Never Stops) 正式上线', 960, 84, 32, DINO_COLS.mint);

    // Left and right dusty bookmark towers
    drawDustyTower(430, 855, -1, lt, sweepK, 'L');
    drawDustyTower(1490, 855, 1, lt, sweepK, 'R');

    // Creator ("我") in center: sleepy/buried → startled take → bright idea!
    const myMood = emotions(lt, [
      [0, 'sleepy', { emote: 'cloud' }],
      [0.7, 'dizzy'],
      [tSweep, 'surprised', { lookX: -0.7 }],
      [tSweep + 0.25, 'idea']
    ]);
    creator(1060, 855, 25, myMood);

    // ANS Little Dino ("小恐龙") leaps in from left with a glowing mint paintbrush-broom!
    const dinoEnter = easeOut(seg(lt, 0.65, tSweep));
    const dinoX = lerp(240, 755, dinoEnter);
    const dinoHop = jump(lt, 0.85, tSweep + 0.15, 2.6);
    const dinoMood = emotions(lt, [
      [0, 'determined'],
      [tSweep - 0.1, 'excited'],
      [tSweep + 0.7, 'happy']
    ]);
    dino(dinoX, 855, 24, {
      ...dinoMood,
      view: lt < tSweep + 0.25 ? 'q' : 'front',
      dy: (dinoMood.dy || 0) + dinoHop.dy,
      sq: (dinoMood.sq || 0) + dinoHop.sq,
      aR: lt > tSweep - 0.1 && lt < tSweep + 0.55 ? 0.9 + 0.45 * Math.sin((lt - tSweep) * 14) : 0.7,
      armR: (u, sw) => {
        boilSeed('dino_broom');
        paint(rectPts(0, -0.22 * u, 2.8 * u, 0.44 * u, 0.8), { wash: PAL.ochre, ink: PAL.ink, sw: sw * 0.8 });
        paint(ellPts(3.2 * u, 0, 1.15 * u, 0.85 * u, 16), {
          wash: DINO_COLS.mint, fill: PAL.cream, fillOp: 90, ink: PAL.ink, sw: sw * 0.85
        });
      }
    });

    if (sweepK > 0) {
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI * 0.85 + (i / 8) * Math.PI * 0.7;
        const dist = 150 + 340 * sweepK;
        sparkle(900 + Math.cos(ang) * dist, 600 + Math.sin(ang) * dist * 0.6, 26, sweepK * 0.8, DINO_COLS.mint);
      }
      sfx('✨ 告别收藏夹吃灰 → ans.cauai.fun', 960, 165, 36, DINO_COLS.mint, lt - tSweep, { life: 1.5, rot: -0.02 });
    }

    const eyeScreen = toScreen(1060, 855 - 8 * 25);
    camEnd();

    storyRibbon('痛点暴击', '90% 的人每天刷 AI，最后手里只剩聊天记录和收藏夹吃灰', lt, dur);

    if (lt < 0.45) iris(...eyeScreen, lerp(0, 1600, easeIn(lt / 0.45)));
    boilSeed('trans_1');
    if (lt > dur - 0.3) brushWipe((lt - (dur - 0.3)) / 0.6, WIPE_MINT);
  }

  // ============================================================================
  // SHOT 2 (3.0s – 6.0s): 第一件事 — "顶配模型直接爽玩：GPT-6-Astra · 大肥鱼 v4.1 · Opus 5.5"
  // ============================================================================
  function drawFlagshipChamber(cx, cy, title, badge, accentCol, activeK, idx, t) {
    boilSeed('chamber_' + idx);
    const w = 320, h = 355;
    const bounce = activeK > 0 ? spring(activeK, 0.05, 5, 16) * 12 : 0;
    const y0 = cy - h + bounce;

    if (activeK > 0.05) {
      glow(cx, cy - h * 0.55, 220 * activeK, accentCol, 0.85 * activeK);
    }

    paint(rrPts(cx - w / 2, y0, w, h, 34, 2.0), {
      wash: activeK > 0.1 ? mixCol('#FFFDF6', accentCol, 0.25 * activeK) : '#EAE2D3',
      washOp: 248,
      fill: activeK > 0.1 ? accentCol : '#C9BFA8',
      fillOp: activeK > 0.1 ? 120 : 65,
      bleed: 0.18, tex: 0.55, ink: PAL.ink, sw: 1.5
    });

    paint(rrPts(cx - w * 0.36, y0 - 24, w * 0.72, 28, 10, 1.2), {
      wash: '#3B4254', ink: PAL.ink, sw: 1.2
    });
    paint(ellPts(cx, y0 - 40, 16, 16, 12), {
      wash: activeK > 0.2 ? accentCol : '#8A8E9E', ink: PAL.ink, sw: 1.0
    });

    const coreR = (50 + 12 * activeK) * (1 + 0.06 * Math.sin(t * 10 + idx));
    paint(starPts(cx, y0 + 112, coreR, 0.45, 5, t * (activeK > 0.2 ? 2.5 : 0.3)), {
      wash: activeK > 0.2 ? PAL.cream : '#B8B0A0',
      fill: accentCol, fillOp: 130 * activeK, ink: PAL.ink, sw: 1.2
    });

    paint(rrPts(cx - 110, y0 + 192, 220, 26, 10, 1.0), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.0
    });
    const fillW = Math.max(24, 212 * easeOut(activeK));
    paint(rrPts(cx - 106, y0 + 196, fillW, 18, 8, 0.8), {
      wash: activeK > 0.1 ? accentCol : '#7A7485', ink: null
    });

    paint(rrPts(cx - w * 0.54, cy - 66 + bounce, w * 1.08, 66, 14, 1.5), {
      wash: '#2F3648', fill: PAL.ink, fillOp: 80, ink: PAL.ink, sw: 1.4
    });

    letter(title, cx, cy - 33 + bounce, 29, PAL.cream);
    letter(activeK > 0.3 ? `⚡ ${badge} · 满血 100%` : badge, cx, y0 + 254, 23, PAL.ink, { ink: false });

    if (activeK > 0.15 && activeK < 0.95) {
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k - 1.5) * 0.65;
        sparkle(cx + Math.cos(a) * 165 * activeK, y0 + 100 + Math.sin(a) * 115 * activeK, 20, activeK, accentCol);
      }
    }
  }

  function shot2Models(t, lt, dur) {
    const tPull = 0.7;
    const shake = lt > tPull && lt < tPull + 0.5 ? shakeXY(t, 7 * Math.exp(-(lt - tPull) * 6)) : [0, 0];
    camBegin(
      960 + shake[0] + 12 * Math.sin(lt * 0.7),
      kf(lt, [[0, 535], [tPull, 520], [dur, 530]]) + shake[1],
      kf(lt, [[0, 0.98], [tPull + 0.3, 1.02], [dur, 1.0]])
    );

    // Rich Inventor Workshop Environment
    boilSeed('shot2_bg');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#F6EFE0', ink: null });
    // Soft architectural wainscot wall & skylight clouds
    paint(ellPts(W * 0.5, 220, 820, 210, 28, 10), {
      fill: '#BFE8F5', fillOp: 110, bleed: 0.28, tex: 0.55, ink: null
    });
    paintCloud(260 + Math.sin(t * 0.4) * 20, 175, 110, 42, '#FFFFFF', 's2c1');
    paintCloud(1660 - Math.sin(t * 0.4) * 20, 165, 120, 45, '#FFFFFF', 's2c2');
    // Wainscot wooden lower wall panel
    boilSeed('shot2_wainscot');
    paint(rectPts(-200, 620, W + 400, 245, 2), {
      wash: '#E5D8C1', fill: '#CBB898', fillOp: 70, ink: PAL.ink, sw: 1.1
    });
    paintFloorAndRug(865, '#D8C5A8', '#B89F7D', '#68B896', '#3A9C98', 's2');
    paintStringLights(95, 55, 10, t, '#FFE066', 's2');
    paintPlant(135, 865, 1.1, t, 's2L');
    paintPlant(1785, 865, 1.1, t, 's2R');

    // Braided Power Cables connecting Master Switch to the 3 Chambers
    boilSeed('shot2_cables');
    inkLine([[960, 840], [640, 740], [420, 575]], 2.2, '#2B2233', 'ink', 0.5);
    inkLine([[960, 840], [960, 575]], 2.2, '#2B2233', 'ink', 0.3);
    inkLine([[960, 840], [1280, 740], [1500, 575]], 2.2, '#2B2233', 'ink', 0.5);

    // Top workshop header sign
    boilSeed('shot2_header');
    paint(rrPts(520, 44, 880, 70, 18, 1.5), {
      wash: '#2B2233', washOp: 248, ink: PAL.ink, sw: 1.3
    });
    letter('第一件：顶配旗舰模型 · 一站满血直连爽玩', 960, 79, 32, DINO_COLS.mint);

    // Three Flagship Model Chambers
    const k1 = seg(lt, tPull, tPull + 0.65);
    const k2 = seg(lt, tPull + 0.22, tPull + 0.85);
    const k3 = seg(lt, tPull + 0.44, tPull + 1.05);
    drawFlagshipChamber(420, 575, 'GPT-6-Astra', '旗舰推理王', '#56B4E9', k1, 0, t);
    drawFlagshipChamber(960, 575, '大肥鱼 v4.1-1017', '中文与创意王', '#E8AA38', k2, 1, t);
    drawFlagshipChamber(1500, 575, 'Opus 5.5', '全栈工程王', '#E27A92', k3, 2, t);

    // Foreground Master Power Switch
    boilSeed('master_switch');
    const swX = 960, swY = 865;
    const leverAng = lerp(-0.55, 0.55, backOut(seg(lt, tPull - 0.15, tPull + 0.25)));
    push();
    translate(swX, swY - 25);
    rotate(leverAng);
    paint(rectPts(-9, -95, 18, 95, 1.0), { wash: '#3B4254', ink: PAL.ink, sw: 1.2 });
    paint(ellPts(0, -105, 28, 28, 16), { wash: '#E23E36', fill: PAL.ochre, fillOp: 80, ink: PAL.ink, sw: 1.3 });
    pop();
    paint(rrPts(swX - 85, swY - 46, 170, 52, 14, 1.2), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 80, ink: PAL.ink, sw: 1.3
    });
    letter('MAX 满血总闸', swX, swY - 20, 22, PAL.ink, { ink: false });

    // Creator ("我") on left-center pulling the lever & cheering
    const myHop = jump(lt, tPull - 0.15, tPull + 0.35, 2.0);
    const myMood = emotions(lt, [
      [0, 'determined'],
      [tPull + 0.1, 'excited'],
      [tPull + 1.1, 'happy']
    ]);
    creator(670, 868, 22, {
      ...myMood,
      dy: (myMood.dy || 0) + myHop.dy,
      sq: (myMood.sq || 0) + myHop.sq,
      aR: lt > tPull ? 1.3 : 0.8
    });

    // Little Dino ("小恐龙") on right-center cheering with starstruck eyes!
    const dinoHop = jump(lt, tPull, tPull + 0.5, 2.4);
    const dinoMood = emotions(lt, [
      [0, 'happy'],
      [tPull + 0.15, 'starstruck'],
      [tPull + 1.2, 'excited']
    ]);
    dino(1250, 868, 22, {
      ...dinoMood,
      flip: true,
      dy: (dinoMood.dy || 0) + dinoHop.dy,
      sq: (dinoMood.sq || 0) + dinoHop.sq
    });

    camEnd();
    storyRibbon('01 · 顶配模型', '一站体验满血 GPT-6-Astra、大肥鱼 v4.1-1017、Opus 5.5 旗舰模型', lt, dur);

    boilSeed('trans_2');
    if (lt < 0.3) brushWipe(0.5 + lt / 0.6, WIPE_MINT);
    if (lt > dur - 0.3) brushWipe((lt - (dur - 0.3)) / 0.6, WIPE_GOLD);
  }

  // ============================================================================
  // SHOT 3 (6.0s – 9.0s): 第二件事 — "最快时间上手顶级 AI 项目，免翻教程配环境，直接出成品"
  // ============================================================================
  function drawProjectCard(x, y, title, sub, col, popK, rot) {
    if (popK <= 0.02) return;
    boilSeed('proj_' + title);
    const s = backOut(popK);
    push();
    translate(x, y);
    rotate(rot);
    scale(s);
    glow(0, 0, 140, col, 0.55 * popK);
    paint(rrPts(-160, -105, 320, 210, 20, 1.8), {
      wash: '#FFFDF7', washOp: 252, fill: col, fillOp: 55, bleed: 0.12,
      ink: PAL.ink, sw: 1.5
    });
    paint(rrPts(-142, -88, 284, 42, 10, 1.0), {
      wash: col, washOp: 255, ink: PAL.ink, sw: 1.0
    });
    paint(starPts(-98, 18, 34, 0.45, 5, 0.2), {
      wash: PAL.ochre, fill: PAL.cream, fillOp: 80, ink: PAL.ink, sw: 0.9
    });
    paint(rrPts(-45, -8, 175, 52, 10, 0.8), {
      wash: '#2B2233', ink: PAL.ink, sw: 0.9
    });
    pop();
    if (popK > 0.3) {
      letter(title, x, y - 66, 26, PAL.ink, { rot, ink: false });
      letter(sub, x + 42, y + 18, 24, DINO_COLS.mint, { rot });
      letter('✓ 成品已生成', x, y + 72, 22, PAL.sap, { rot, ink: false });
    }
  }

  function shot3Projects(t, lt, dur) {
    const tPress = 0.65;
    const shake = lt > tPress && lt < tPress + 0.4 ? shakeXY(t, 7 * Math.exp(-(lt - tPress) * 6)) : [0, 0];
    camBegin(
      960 + shake[0] + 12 * Math.sin(lt * 0.75),
      535 + shake[1],
      kf(lt, [[0, 1.0], [tPress + 0.2, 1.03], [dur, 1.0]])
    );

    // Rich Sunlit Art Studio with Panoramic Window & Pegboard Wall
    boilSeed('shot3_bg');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#F5EDE0', ink: null });
    // Arched studio window on left-center showing blue sky & green hills outside
    paint(rrPts(420, 155, 380, 340, 40, 1.5), {
      wash: '#B8E3F8', fill: PAL.sky, fillOp: 90, ink: PAL.ink, sw: 1.5
    });
    paint(ellPts(610, 495, 210, 95, 22, 1.5), { wash: '#78B86A', ink: PAL.ink, sw: 1.0 });
    paintCloud(540, 240, 75, 28, '#FFFFFF', 's3w');
    inkLine([[610, 160], [610, 490]], 1.4, PAL.ink, 'ink', 0);
    inkLine([[425, 325], [795, 325]], 1.4, PAL.ink, 'ink', 0);

    // Wooden Pegboard on Right-Center Wall
    boilSeed('shot3_pegboard');
    paint(rrPts(920, 175, 420, 260, 16, 1.5), {
      wash: '#E2CFAF', fill: '#C8B08A', fillOp: 80, ink: PAL.ink, sw: 1.3
    });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        paint(ellPts(965 + c * 64, 215 + r * 72, 5, 5, 8), { wash: PAL.ink, ink: null });
      }
    }

    paintFloorAndRug(865, '#D8C5A8', '#B89F7D', '#E8AA38', '#E27A92', 's3');
    paintStringLights(90, 50, 10, t, '#9BE0C5', 's3');
    paintPlant(1790, 865, 1.15, t, 's3R');

    // Top banner
    boilSeed('shot3_header');
    paint(rrPts(490, 44, 940, 70, 18, 1.5), {
      wash: '#2B2233', washOp: 248, ink: PAL.ink, sw: 1.3
    });
    letter('第二件：免翻教程配环境 · 全网最火 AI 玩法最快跑出成品', 960, 79, 30, PAL.ochre);

    // Left: Tangled "✗ 配环境报错" wire monster kicked into the left corner!
    boilSeed('wire_monster');
    const kickK = easeOut(seg(lt, 0.3, 1.1));
    const wx = lerp(310, 175, kickK), wy = lerp(680, 470, kickK) - 70 * Math.sin(kickK * Math.PI);
    push();
    translate(wx, wy);
    rotate(-kickK * 0.45);
    paint(ellPts(0, 0, 115, 88, 22, 5), {
      wash: '#6C667A', fill: '#3B3548', fillOp: 120, ink: PAL.ink, sw: 1.3
    });
    for (let i = 0; i < 6; i++) {
      inkLine([[-75 + i * 24, -45], [20 - i * 16, 55], [65 - i * 20, -25]], 1.4, PAL.ink, 'ink', 0.7);
    }
    pop();
    paint(rrPts(wx - 115, wy - 135, 230, 46, 10, 1.0), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.1
    });
    letter('✗ 免翻教程配环境', wx, wy - 112, 23, '#FF6B6B');

    // Center: Hand-painted "ANS 一键造物机"
    boilSeed('maker_machine');
    const mX = 790, mY = 865;
    const mSq = spring(lt, tPress, 6, 18) * 0.14;
    push();
    translate(mX, mY);
    scale(1 + mSq, 1 - mSq);
    paint(rrPts(-170, -250, 340, 250, 28, 2.0), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 95, bleed: 0.12, tex: 0.55,
      ink: PAL.ink, sw: 1.6
    });
    paint(rrPts(-125, -205, 250, 115, 16, 1.2), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.3
    });
    const btnDrop = lt > tPress ? 22 * easeOut(seg(lt, tPress, tPress + 0.15)) * (1 - 0.5 * seg(lt, tPress + 0.2, tPress + 0.6)) : 0;
    paint(rectPts(-35, -285 + btnDrop, 70, 40, 1.0), { wash: '#3B4254', ink: PAL.ink, sw: 1.2 });
    paint(ellPts(0, -295 + btnDrop, 72, 28, 20), {
      wash: '#E23E36', fill: PAL.ochre, fillOp: 85, ink: PAL.ink, sw: 1.4
    });
    paint([[165, -180], [235, -215], [235, -95], [165, -130]], {
      wash: PAL.ochre, fill: '#C88520', fillOp: 85, ink: PAL.ink, sw: 1.4
    });
    pop();
    letter('ANS 一键跑通', mX, mY - 148, 30, DINO_COLS.mint);
    letter('最快出自己成品', mX, mY - 52, 24, PAL.ink, { ink: false });

    // Three Finished Project Cards popping out of the chute on arcs!
    const chute = [mX + 220, mY - 155];
    const cards = [
      { title: '3D 个人作品集', sub: '一键同款上线', col: '#9BE0C5', target: [1260, 290], t0: tPress + 0.08, rot: -0.04 },
      { title: '4K 漫剧与视频', sub: '分镜直出成片', col: '#FFE082', target: [1610, 460], t0: tPress + 0.28, rot: 0.05 },
      { title: 'CAUAI 无限画布', sub: '多节点工作流', col: '#F4A6B8', target: [1345, 650], t0: tPress + 0.48, rot: -0.03 }
    ];
    for (const c of cards) {
      const fk = easeOut(seg(lt, c.t0, c.t0 + 0.55));
      if (fk > 0) {
        const pt = arcPt(chute, c.target, 140, fk);
        drawProjectCard(pt[0], pt[1], c.title, c.sub, c.col, fk, c.rot);
      }
    }

    // Little Dino ("小恐龙") on left celebrating
    dino(345, 865, 23, {
      ...emotions(lt, [[0, 'determined'], [tPress, 'excited'], [tPress + 0.7, 'happy']]),
      aR: 1.25
    });

    // Creator ("我") beside the machine pressing the button & cheering
    const myJump = jump(lt, tPress - 0.12, tPress + 0.35, 2.2);
    const myMood = emotions(lt, [[0, 'idea'], [tPress, 'excited'], [tPress + 0.8, 'happy']]);
    creator(565, 865, 23, {
      ...myMood,
      dy: (myMood.dy || 0) + myJump.dy,
      sq: (myMood.sq || 0) + myJump.sq,
      aR: lt > tPress - 0.1 && lt < tPress + 0.35 ? 1.45 : 1.05
    });

    camEnd();
    storyRibbon('02 · 一键成品', '不用到处翻教程配环境，全网最火硬核 AI 玩法最快速度跑出成品', lt, dur);

    boilSeed('trans_3');
    if (lt < 0.3) brushWipe(0.5 + lt / 0.6, WIPE_GOLD);
    if (lt > dur - 0.3) brushWipe((lt - (dur - 0.3)) / 0.6, WIPE_ROSE);
  }

  // ============================================================================
  // SHOT 4 (9.0s – 11.8s): 第三件事 — "注册即送算力福利，进来就有免费额度，直接开造，不玩套路"
  // ============================================================================
  function shot4Credits(t, lt, dur) {
    const tGift = 0.55;
    camBegin(
      960 + 10 * Math.sin(lt * 0.8),
      kf(lt, [[0, 540], [tGift + 0.4, 525], [dur, 530]]),
      kf(lt, [[0, 1.0], [tGift + 0.5, 1.04], [dur, 1.02]])
    );

    // Rich Outdoor Pastel Meadow & Cloud Carnival Scene!
    boilSeed('shot4_sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#DDF2FA', ink: null });
    paint(ellPts(W * 0.5, 340, 950, 320, 30, 12), {
      fill: '#FFE8A3', fillOp: 110, bleed: 0.3, tex: 0.55, ink: null
    });
    paintCloud(250 + Math.sin(t * 0.5) * 25, 210, 130, 48, '#FFFDF7', 's4c1');
    paintCloud(1670 - Math.sin(t * 0.5) * 25, 195, 140, 52, '#FFFDF7', 's4c2');
    paintCloud(460, 340, 95, 36, '#FFFDF7', 's4c3');
    paintCloud(1480, 330, 100, 38, '#FFFDF7', 's4c4');

    // Rolling Green Hills in Midground
    boilSeed('shot4_hills');
    paint(ellPts(380, 920, 720, 240, 36, 2), {
      wash: '#88C978', fill: '#5E9E54', fillOp: 85, bleed: 0.1, ink: PAL.ink, sw: 1.2
    });
    paint(ellPts(1540, 920, 720, 240, 36, 2), {
      wash: '#7CC070', fill: '#52924A', fillOp: 85, bleed: 0.1, ink: PAL.ink, sw: 1.2
    });

    paintFloorAndRug(865, '#C8E6B2', '#95C47C', '#E23E36', '#E8AA38', 's4');
    paintStringLights(105, 65, 12, t, '#FFE066', 's4');

    // Top banner
    boilSeed('shot4_header');
    paint(rrPts(490, 44, 940, 70, 18, 1.5), {
      wash: '#2B2233', washOp: 248, ink: PAL.ink, sw: 1.3
    });
    letter('第三件：注册即送免费算力福利 · 进来直接开造 · 0套路', 960, 79, 30, '#FFE066');

    // Giant glowing arched ANS Portal Door in center background
    boilSeed('ans_door');
    glow(960, 510, 480, '#FFD96A', 0.85);
    paint(rrPts(680, 165, 560, 700, 240, 2.2), {
      wash: '#2B2233', fill: PAL.indigo, fillOp: 95, ink: PAL.ink, sw: 1.8
    });
    paint(rrPts(720, 205, 480, 660, 210, 1.8), {
      wash: '#FFF6D6', fill: PAL.ochre, fillOp: 110, bleed: 0.25, tex: 0.55, ink: PAL.ink, sw: 1.3
    });

    // Floating Golden Compute Coins & Sparkles around the arch
    for (let i = 0; i < 8; i++) {
      boilSeed('coin_' + i);
      const ang = -Math.PI * 0.88 + (i / 7) * Math.PI * 0.76;
      const rad = 430 + 35 * Math.sin(t * 3 + i);
      const cx = 960 + Math.cos(ang) * rad * 1.25;
      const cy = 540 + Math.sin(ang) * rad * 0.68;
      paint(ellPts(cx, cy, 28, 28, 16, 1.0), {
        wash: '#FFD95A', fill: PAL.ochre, fillOp: 100, ink: PAL.ink, sw: 1.0
      });
      paint(starPts(cx, cy, 15, 0.4, 4, t * 2 + i), { wash: PAL.cream, ink: null });
    }

    // Little Dino ("小恐龙") on right, flanking the golden ticket!
    const dinoWalk = stroll(lt, 0, tGift, 1460, 1310, 26);
    const dinoMood = emotions(lt, [[0, 'happy'], [tGift, 'love'], [tGift + 0.8, 'excited']]);
    dino(dinoWalk.x, 865, 26, {
      ...dinoMood,
      flip: true,
      walk: dinoWalk.walk,
      dy: (dinoMood.dy || 0) + dinoWalk.dy,
      aL: 1.15,
      aR: 1.05
    });

    // Creator ("我") on left, flanking the golden ticket and cheering!
    const myWalk = stroll(lt, 0, tGift, 460, 610, 26);
    const myMood = emotions(lt, [[0, 'surprised'], [tGift + 0.1, 'starstruck'], [tGift + 0.85, 'laugh']]);
    creator(myWalk.x, 865, 25, {
      ...myMood,
      walk: myWalk.walk,
      dy: (myMood.dy || 0) + myWalk.dy,
      aR: 1.15
    });

    // Giant Glowing "🎁 FREE 免费算力券" Floating in the center arch at y = 435!
    boilSeed('gift_ticket');
    const tkK = backOut(seg(lt, 0.2, tGift + 0.25));
    const tkX = 960, tkY = 435 + Math.sin(t * 5) * 8;
    push();
    translate(tkX, tkY);
    rotate(-0.03 + 0.02 * Math.sin(t * 4));
    scale(tkK);
    glow(0, 0, 250, '#FFD96A', 0.9);
    paint(rrPts(-245, -108, 490, 216, 24, 2.0), {
      wash: '#FFE47A', washOp: 255, fill: PAL.ochre, fillOp: 110, bleed: 0.15, tex: 0.5,
      ink: PAL.ink, sw: 1.8
    });
    paint(rrPts(-225, -88, 450, 176, 16, 1.2), {
      wash: '#FFFDF4', washOp: 248, ink: PAL.ink, sw: 1.1
    });
    paint(rrPts(-205, -70, 130, 140, 14, 1.0), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 80, ink: PAL.ink, sw: 1.2
    });
    paint(starPts(-140, 0, 44, 0.42, 5, t * 2), { wash: '#FFE47A', ink: PAL.ink, sw: 1.0 });
    pop();
    if (tkK > 0.3) {
      letter('🎁 注册即送算力', tkX + 76, tkY - 32, 35, PAL.ink, { ink: false });
      letter('免费额度 · 0套路直接开造', tkX + 76, tkY + 30, 24, '#D8394E', { ink: false });
    }

    camEnd();
    storyRibbon('03 · 算力福利', '注册即送免费算力额度，进来就能直接开造，不玩任何套路', lt, dur);

    boilSeed('trans_4');
    if (lt < 0.3) brushWipe(0.5 + lt / 0.6, WIPE_ROSE);
    if (lt > dur - 0.3) brushWipe((lt - (dur - 0.3)) / 0.6, WIPE_MINT);
  }

  // ============================================================================
  // SHOT 5 (11.8s – 15.0s): 终章立 Flag — "28 天挑战：要么每日真改进，要么 Full Reset 全员认罚发算力！"
  // ============================================================================
  function shot5Flag(t, lt, dur) {
    const tPlant = 0.65;
    const tIris = dur - 0.55;
    const shake = lt > tPlant && lt < tPlant + 0.45 ? shakeXY(t, 9 * Math.exp(-(lt - tPlant) * 6)) : [0, 0];
    camBegin(
      960 + shake[0] + 10 * Math.sin(lt * 0.7),
      kf(lt, [[0, 540], [tPlant + 0.2, 515], [dur, 505]]) + shake[1],
      kf(lt, [[0, 0.98], [tPlant + 0.3, 1.03], [dur, 1.06]])
    );

    // Rich Sunrise Celebration Horizon & Layered Mountains
    boilSeed('shot5_sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#FFF4DC', ink: null });
    paint(ellPts(W * 0.5, 420, 1050, 380, 30, 12), {
      fill: '#FFD599', fillOp: 120, bleed: 0.3, tex: 0.55, ink: null
    });
    paint(ellPts(W * 0.5, 180, 750, 220, 26, 10), {
      fill: '#B5EDD8', fillOp: 110, bleed: 0.28, tex: 0.5, ink: null
    });
    // Distant sunrise hills behind stage
    boilSeed('shot5_hills');
    paint(ellPts(960, 910, 980, 210, 36, 2), {
      wash: '#9BD6B8', fill: '#6AB092', fillOp: 80, ink: PAL.ink, sw: 1.1
    });
    paintCloud(220, 185, 115, 42, '#FFFFFF', 's5c1');
    paintCloud(1700, 185, 115, 42, '#FFFFFF', 's5c2');

    paintFloorAndRug(865, '#DFCFAF', '#BFA882', '#9BE0C5', '#E8AA38', 's5');
    paintStringLights(98, 55, 12, t, '#FFE066', 's5');

    // Top Hero Brand Sign: ANS · AI Never Stops (ans.cauai.fun)
    boilSeed('shot5_brand');
    glow(960, 110, 360, DINO_COLS.mint, 0.75);
    paint(rrPts(470, 38, 980, 92, 24, 1.8), {
      wash: '#2B2233', washOp: 250, fill: PAL.indigo, fillOp: 90, ink: PAL.ink, sw: 1.6
    });
    letter('ANS · AI Never Stops   |   ans.cauai.fun', 960, 84, 38, DINO_COLS.mint);

    // LEFT BOARD: Option A — "28-Day Daily Meaningful Upgrade Calendar"
    boilSeed('board_calendar');
    paint(rrPts(120, 260, 450, 430, 24, 2.0), {
      wash: '#FFFDF5', washOp: 250, fill: '#CDEFE1', fillOp: 85, bleed: 0.15,
      ink: PAL.ink, sw: 1.6
    });
    paint(rrPts(145, 285, 400, 68, 14, 1.2), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 80, ink: PAL.ink, sw: 1.2
    });
    letter('① 每日上线真改进', 345, 319, 30, PAL.ink, { ink: false });
    letter('清晰有感 · 切中需求', 345, 388, 24, PAL.teal, { ink: false });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        const dIdx = r * 7 + c;
        const gx = 162 + c * 53, gy = 425 + r * 56;
        const isDay1 = dIdx === 0;
        paint(rrPts(gx, gy, 44, 44, 8, 0.6), {
          wash: isDay1 ? '#FFE066' : '#E8E0D0',
          fill: isDay1 ? DINO_COLS.mint : null,
          fillOp: 120,
          ink: PAL.ink, sw: isDay1 ? 1.3 : 0.7
        });
      }
    }
    letter('✓ Day 01 已打卡!', 345, 660, 25, PAL.sap, { ink: false });

    // RIGHT BOARD: Option B — "⚡ FULL RESET 全员额度重置认罚拉闸"
    boilSeed('board_reset');
    paint(rrPts(1350, 260, 450, 430, 24, 2.0), {
      wash: '#FFFDF5', washOp: 250, fill: '#FFD8CC', fillOp: 90, bleed: 0.15,
      ink: PAL.ink, sw: 1.6
    });
    paint(rrPts(1375, 285, 400, 68, 14, 1.2), {
      wash: '#E23E36', fill: PAL.ochre, fillOp: 70, ink: PAL.ink, sw: 1.2
    });
    letter('② 否则 Full Reset', 1575, 319, 30, PAL.cream);
    letter('全员额度重置 · 认罚发算力', 1575, 388, 24, '#D8394E', { ink: false });
    paint(rrPts(1435, 425, 280, 195, 20, 1.4), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.4
    });
    paint(ellPts(1575, 522, 86, 78, 24, 1.2), {
      wash: '#FFE066', fill: '#E23E36', fillOp: 95, ink: PAL.ink, sw: 1.5
    });
    letter('FULL RESET', 1575, 522, 22, PAL.ink, { ink: false });
    letter('绝不鸽 · 每天二选一', 1575, 655, 24, PAL.ink, { ink: false });

    // CENTER: The Giant "🟢 Day 01 / 28" Flag planted by Creator ("我") & Little Dino ("小恐龙")!
    boilSeed('center_flag');
    const flagDrop = easeOut(seg(lt, 0.1, tPlant));
    const flagBounce = spring(lt, tPlant, 6, 18) * 18;
    const poleX = 960, poleBottom = lerp(220, 865, flagDrop) + flagBounce;
    const poleTop = poleBottom - 640;

    if (lt >= tPlant) {
      glow(poleX, poleTop + 130, 340, '#FFE066', 0.85);
      for (let i = 0; i < 8; i++) {
        const q = seg(lt - tPlant, i * 0.04, 0.65 + i * 0.04);
        const a = -Math.PI * 0.9 + (i / 7) * Math.PI * 0.8;
        sparkle(poleX + Math.cos(a) * 260 * q, poleTop + 120 + Math.sin(a) * 180 * q, 26, q, '#FFE066');
      }
    }

    paint(rectPts(poleX - 9, poleTop, 18, poleBottom - poleTop, 1.2), {
      wash: PAL.ochre, ink: PAL.ink, sw: 1.3
    });
    paint(ellPts(poleX, poleTop - 12, 22, 22, 14), {
      wash: '#FFE066', ink: PAL.ink, sw: 1.2
    });
    if (flagDrop > 0.85) {
      paint(rrPts(poleX - 95, 835, 190, 38, 12, 1.2), {
        wash: '#3B4254', ink: PAL.ink, sw: 1.3
      });
    }

    const wave = Math.sin(t * 7) * 14;
    const flagPts = [
      [poleX + 10, poleTop + 15],
      [poleX + 190, poleTop + 5 + wave],
      [poleX + 355, poleTop + 30 - wave * 0.7],
      [poleX + 320, poleTop + 110],
      [poleX + 360, poleTop + 185 + wave * 0.8],
      [poleX + 185, poleTop + 195 - wave],
      [poleX + 10, poleTop + 180]
    ];
    paint(flagPts, {
      wash: DINO_COLS.mint, washOp: 255, fill: '#FFE066', fillOp: 85, bleed: 0.15, tex: 0.55,
      ink: PAL.ink, sw: 1.6, curv: 0.25
    });
    letter('🟢 Day 01 / 28', poleX + 185, poleTop + 78, 34, PAL.ink, { ink: false });
    letter('让改进开始吧！', poleX + 185, poleTop + 138, 28, '#D8394E', { ink: false });

    // Creator ("我") on left of flagpole
    const myHop = jump(lt, 0.2, tPlant, 2.5);
    const myMood = emotions(lt, [[0, 'determined'], [tPlant, 'excited'], [tPlant + 0.75, 'happy']]);
    creator(760, 865, 25, {
      ...myMood,
      dy: (myMood.dy || 0) + myHop.dy,
      sq: (myMood.sq || 0) + myHop.sq,
      aL: lt > tPlant + 0.5 ? 1.15 + 0.45 * Math.sin(t * 12) : 0.4,
      aR: 1.25
    });

    // Little Dino ("小恐龙") on right of flagpole
    const dinoHop = jump(lt, 0.25, tPlant + 0.05, 3.0);
    const dinoMood = emotions(lt, [[0, 'excited'], [tPlant + 0.05, 'starstruck'], [tPlant + 0.8, 'love']]);
    dino(1160, 865, 25, {
      ...dinoMood,
      flip: true,
      dy: (dinoMood.dy || 0) + dinoHop.dy,
      sq: (dinoMood.sq || 0) + dinoHop.sq,
      aL: 1.25,
      aR: lt > tPlant + 0.5 ? 1.2 + 0.45 * Math.sin(t * 12 + 1) : 0.8
    });

    const centerDuo = toScreen(960, 865 - 6 * 25);
    camEnd();

    storyRibbon('28天 Flag', '要么每日上线清晰有感的真改进，要么直接 Full Reset 全员额度重置！', lt, dur);

    boilSeed('trans_5');
    if (lt < 0.3) brushWipe(0.5 + lt / 0.6, WIPE_MINT);
    if (lt > tIris) {
      const r = lerp(1600, 0, easeIn(seg(lt, tIris, dur - 0.04)));
      iris(...centerDuo, r);
    }
  }

  shots([
    [0.0, shot1Bookmarks],
    [3.0, shot2Models],
    [6.0, shot3Projects],
    [9.0, shot4Credits],
    [11.8, shot5Flag]
  ]);
})();
