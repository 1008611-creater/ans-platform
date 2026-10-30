"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BUILTIN_MEME_STICKERS,
  MOOD_DIMENSION_META,
  SOUL_PLUGIN_CATALOG,
   calcSpeakUpHitLine,
  describeMoodTier,
  extractKeywords,
  formatTimeStamp,
  getAvailableStickers,
  isSpeakUpQuietHour,
  rollSpeakUpDice,
  runBiliSubagentScan,
  type MemeEmotionBucket,
  type MemeStickerItem,
  type SoulPluginId,
} from "@/domain/mascot/soul-plugins";
import {
  getServerSoulPluginsSnapshot,
  getSoulPluginsSnapshot,
  settleSoulTurn,
  subscribeSoulPluginsStore,
  toggleSoulPlugin,
  writeSoulPluginsState,
} from "@/lib/mascot/soul-store";
import { writePixelState } from "@/lib/mascot/client-store";

interface DinoSoulToolbarProps {
  onInjectAssistantMessage: (text: string, speakAloud?: boolean) => void;
  onSendUserSticker: (sticker: MemeStickerItem) => void;
  onSpeakText: (text: string) => void;
}

function DshNodeGlyph({ type }: { type: "dsh-node" | "meme-avatar" }) {
  if (type === "meme-avatar") {
    return (
      <span className="ans-soul-plugin-icon ans-soul-plugin-icon-meme" aria-hidden="true">
        <span className="ans-soul-meme-ears">🦖</span>
        <span className="ans-soul-meme-sparkle">✨</span>
      </span>
    );
  }
  return (
    <span className="ans-soul-plugin-icon" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
        <path
          d="M8.5 9.5L14 14L19.5 8.5M14 14L9 19.5M14 14L19.5 19.5"
          stroke="url(#dshGrad)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="8.5" cy="9.5" r="2.7" fill="#38bdf8" />
        <circle cx="19.5" cy="8.5" r="2.7" fill="#2563eb" />
        <circle cx="9" cy="19.5" r="2.7" fill="#0ea5e9" />
        <circle cx="19.5" cy="19.5" r="2.7" fill="#1d4ed8" />
        <defs>
          <linearGradient id="dshGrad" x1="6" y1="6" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export function DinoSoulToolbar({
  onInjectAssistantMessage,
  onSendUserSticker,
  onSpeakText,
}: DinoSoulToolbarProps) {
  const soul = useSyncExternalStore(
    subscribeSoulPluginsStore,
    getSoulPluginsSnapshot,
    getServerSoulPluginsSnapshot,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<SoulPluginId | null>("dsh-feiyu-mood");
  const [memeTrayOpen, setMemeTrayOpen] = useState(false);
  const [memeFilter, setMemeFilter] = useState<MemeEmotionBucket | "all">("all");
  const [memeSearch, setMemeSearch] = useState("");
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryIsFact, setNewMemoryIsFact] = useState(true);
  const [newStickerTitle, setNewStickerTitle] = useState("");
  const [newStickerKaomoji, setNewStickerKaomoji] = useState("(≧∇≦)ﾉ✨");

  const enabledCount = Object.values(soul.enabled).filter(Boolean).length;
  const moodTier = describeMoodTier(soul.feiyuMood.mood);
  const speakCalc = calcSpeakUpHitLine(soul.speakUp);
  const speakUpEnabled = soul.enabled["dsh-speak-up"];

  // Background local dice timer for dsh-speak-up (rolls locally without spending tokens)
  useEffect(() => {
    if (!speakUpEnabled) return;
    const intervalMs = Math.max(1, soul.speakUp.intervalMinutes) * 60_000;
    const timer = setInterval(() => {
      const current = getSoulPluginsSnapshot();
      if (!current.enabled["dsh-speak-up"]) return;
      if (isSpeakUpQuietHour(current.speakUp)) return;
      const sinceLastSpeakMin = (Date.now() - (current.speakUp.lastSpeakUpAtMs || 0)) / 60_000;
      if (sinceLastSpeakMin < current.speakUp.cooldownMinutes) return;

      const result = rollSpeakUpDice(current);
      writeSoulPluginsState(prev => ({
        ...prev,
        speakUp: result.nextSpeakUp,
      }));
      if (result.triggeredMessage) {
        onInjectAssistantMessage(
          result.triggeredMessage,
          current.enabled["dsh-tts-bridge"] && current.ttsBridge.autoRead,
        );
        settleSoulTurn("[dsh-speak-up]", result.triggeredMessage, "speak-up");
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [
    speakUpEnabled,
    soul.speakUp.intervalMinutes,
    onInjectAssistantMessage,
  ]);

  const handleManualSpeakUp = (dryRunOverride: boolean) => {
    const result = rollSpeakUpDice(soul, {
      forceHit: true,
      dryRunOverride,
    });
    writeSoulPluginsState(prev => ({
      ...prev,
      speakUp: result.nextSpeakUp,
    }));
    if (result.triggeredMessage) {
      onInjectAssistantMessage(
        result.triggeredMessage,
        soul.enabled["dsh-tts-bridge"] && soul.ttsBridge.autoRead,
      );
      settleSoulTurn("[dsh-speak-up]", result.triggeredMessage, "speak-up");
    }
  };

  const handleRunBiliScan = () => {
    const { nextBili, report } = runBiliSubagentScan(soul.biliSubagent);
    writeSoulPluginsState(prev => ({
      ...prev,
      biliSubagent: nextBili,
    }));
    if (!soul.biliSubagent.dryRun) {
      onInjectAssistantMessage(
        report.dinoShareText,
        soul.enabled["dsh-tts-bridge"] && soul.ttsBridge.autoRead,
      );
      settleSoulTurn("[dsh-bili-subagent]", report.dinoShareText, "bili-duty-scan");
    }
  };

  const handleAddMemory = () => {
    const text = newMemoryText.trim();
    if (!text) return;
    const now = Date.now();
    const stamp = formatTimeStamp(now);
    writeSoulPluginsState(prev => ({
      ...prev,
      fishMemory: {
        ...prev.fishMemory,
        items: [
          {
            id: `mem-${now}`,
            at: stamp,
            createdAtMs: now,
            text,
            keywords: extractKeywords(text),
            importance: newMemoryIsFact ? 0.92 : 0.75,
            emotion: 0.65,
            isFact: newMemoryIsFact,
            factKey: newMemoryIsFact ? "ta.手动铭记" : undefined,
            recalledCount: 0,
          },
          ...prev.fishMemory.items,
        ].slice(0, 60),
      },
    }));
    setNewMemoryText("");
  };

  const handleAddSticker = () => {
    const title = newStickerTitle.trim();
    if (!title) return;
    const sticker: MemeStickerItem = {
      id: `meme-custom-${Date.now()}`,
      packId: "learned",
      title,
      kaomoji: newStickerKaomoji.trim() || "(≧∇≦)ﾉ",
      badge: `✨ ${title}`,
      emotion: "happy",
      keywords: extractKeywords(title),
      pixelState: "emote",
      gesture3d: "celebrate",
    };
    writeSoulPluginsState(prev => ({
      ...prev,
      meme: {
        ...prev.meme,
        customStickers: [sticker, ...prev.meme.customStickers],
      },
    }));
    setNewStickerTitle("");
  };

  const visibleStickers = getAvailableStickers(soul.meme).filter(item => {
    if (memeFilter !== "all" && item.emotion !== memeFilter) return false;
    if (!memeSearch.trim()) return true;
    const q = memeSearch.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q) ||
      item.keywords.some(k => k.toLowerCase().includes(q))
    );
  });

  return (
    <div className="ans-dino-soul-bar" data-testid="dino-soul-toolbar">
      <div className="ans-dino-soul-strip">
        <button
          type="button"
          className="ans-dino-soul-chip ans-dino-soul-chip-primary"
          data-testid="dino-soul-plugins-open"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(prev => !prev)}
        >
          <span aria-hidden="true">🧩</span>
          <span>灵魂插件</span>
          <span className="ans-dino-soul-count">{enabledCount}/8</span>
        </button>

        {soul.enabled["dsh-feiyu-mood"] && (
          <button
            type="button"
            className="ans-dino-soul-chip"
            data-testid="dino-soul-mood-pill"
            title={`兔兔龙当前心情：${soul.feiyuMood.mood}/100 · ${moodTier.labelZh}（${moodTier.innerNoteZh}）`}
            onClick={() => {
              setExpandedId("dsh-feiyu-mood");
              setDrawerOpen(true);
            }}
          >
            <span aria-hidden="true">{moodTier.emoji}</span>
            <span>
              {moodTier.labelZh} {soul.feiyuMood.mood}
            </span>
          </button>
        )}

        {soul.enabled["dsh-fish-memory"] && (
          <button
            type="button"
            className="ans-dino-soul-chip"
            data-testid="dino-soul-memory-pill"
            title="点开查看带时间戳的长期记忆与召回轨迹"
            onClick={() => {
              setExpandedId("dsh-fish-memory");
              setDrawerOpen(true);
            }}
          >
            <span aria-hidden="true">🧠</span>
            <span>记忆 {soul.fishMemory.items.length}</span>
          </button>
        )}

        {soul.enabled["dsh-meme"] && (
          <button
            type="button"
            className="ans-dino-soul-chip"
            data-testid="dino-soul-meme-picker"
            aria-pressed={memeTrayOpen}
            onClick={() => setMemeTrayOpen(prev => !prev)}
          >
            <span aria-hidden="true">😊</span>
            <span>斗图</span>
          </button>
        )}

        {soul.enabled["dsh-bili-subagent"] && (
          <button
            type="button"
            className="ans-dino-soul-chip"
            data-testid="dino-soul-bili-quick"
            title="立即派子代理去刷一轮 B 站并汇报"
            onClick={handleRunBiliScan}
          >
            <span aria-hidden="true">📺</span>
            <span>刷B站</span>
          </button>
        )}

        {soul.enabled["dsh-speak-up"] && (
          <button
            type="button"
            className="ans-dino-soul-chip"
            data-testid="dino-soul-speakup-quick"
            title={`主动搭话 · 当前命中线 ${speakCalc.hitLine}%`}
            onClick={() => handleManualSpeakUp(false)}
          >
            <span aria-hidden="true">🎲</span>
            <span>搭话 {speakCalc.hitLine}%</span>
          </button>
        )}
      </div>

      {/* Inline Meme Quick-Picker Tray */}
      {memeTrayOpen && soul.enabled["dsh-meme"] && (
        <div className="ans-dino-meme-tray" data-testid="dino-soul-meme-tray">
          <div className="ans-dino-meme-tray-head">
            <input
              type="search"
              value={memeSearch}
              onChange={e => setMemeSearch(e.target.value)}
              placeholder="搜情绪或关键词（如：夸夸 / 奶茶 / 代码 / Bug）..."
              className="ans-dino-meme-search"
            />
            <div className="ans-dino-meme-filters">
              {(
                [
                  ["all", "全部"],
                  ["happy", "开心"],
                  ["shy", "贴贴"],
                  ["cheer", "打气"],
                  ["work", "搬砖"],
                  ["angry", "灭Bug"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={memeFilter === key}
                  onClick={() => setMemeFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ans-dino-meme-grid">
            {visibleStickers.map(sticker => (
              <button
                key={sticker.id}
                type="button"
                className="ans-dino-meme-card"
                data-testid={`dino-meme-send-${sticker.id}`}
                onClick={() => {
                  writePixelState(sticker.pixelState);
                  onSendUserSticker(sticker);
                  setMemeTrayOpen(false);
                }}
              >
                <span className="ans-dino-meme-kaomoji">{sticker.kaomoji}</span>
                <span className="ans-dino-meme-title">{sticker.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Full DSH Installed Soul Plugins Manager */}
      {drawerOpen && (
        <section
          className="ans-soul-plugins-Modal"
          data-testid="dino-soul-plugins-panel"
          aria-label="已安装插件"
        >
          <div className="ans-soul-plugins-top">
            <div>
              <h3 className="ans-soul-plugins-heading">已安装插件</h3>
              <p className="ans-soul-plugins-sub">
                已内化 8 款 DSH 灵魂插件至兔兔龙内置 Agent · 由你决定开启哪些模块赋予它真实情绪、时间记忆与主动陪伴
              </p>
            </div>
            <div className="ans-soul-plugins-top-actions">
              <button
                type="button"
                className="ans-soul-preset-btn"
                onClick={() =>
                  writeSoulPluginsState(prev => ({
                    ...prev,
                    enabled: {
                      "dsh-bili-subagent": true,
                      "dsh-feiyu-mood": true,
                      "dsh-fish-memory": true,
                      "dsh-meme": true,
                      "dsh-qq-bridge": true,
                      "dsh-social-bridge-plugin": true,
                      "dsh-speak-up": true,
                      "dsh-tts-bridge": true,
                    },
                  }))
                }
              >
                全开 (8/8)
              </button>
              <button
                type="button"
                className="ans-soul-preset-btn"
                onClick={() => setDrawerOpen(false)}
              >
                收起
              </button>
            </div>
          </div>

          <div className="ans-soul-plugins-list">
            {SOUL_PLUGIN_CATALOG.map(plugin => {
              const isOn = soul.enabled[plugin.id];
              const isExpanded = expandedId === plugin.id;
              return (
                <div
                  key={plugin.id}
                  className={`ans-soul-plugin-row ${isOn ? "is-enabled" : "is-disabled"}`}
                  data-testid={`soul-plugin-card-${plugin.id}`}
                >
                  <div className="ans-soul-plugin-main">
                    <DshNodeGlyph type={plugin.iconType} />
                    <div
                      className="ans-soul-plugin-copy"
                      onClick={() =>
                        setExpandedId(current => (current === plugin.id ? null : plugin.id))
                      }
                    >
                      <div className="ans-soul-plugin-title-line">
                        <span className="ans-soul-plugin-name">{plugin.displayName}</span>
                        <span className="ans-soul-plugin-badge">{plugin.badge}</span>
                        <span className="ans-soul-plugin-expand-hint">
                          {isExpanded ? "收起设置 ▴" : "控制台 ▾"}
                        </span>
                      </div>
                      <p className="ans-soul-plugin-desc">{plugin.summaryZh}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      aria-label={`切换 ${plugin.displayName}`}
                      data-testid={`soul-plugin-switch-${plugin.id}`}
                      className={`ans-soul-switch ${isOn ? "on" : "off"}`}
                      onClick={() => toggleSoulPlugin(plugin.id)}
                    >
                      <span className="ans-soul-switch-thumb" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      className="ans-soul-plugin-inspector"
                      data-testid={`soul-plugin-inspector-${plugin.id}`}
                    >
                      {/* 1. dsh-feiyu-mood Inspector */}
                      {plugin.id === "dsh-feiyu-mood" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-mood-hero">
                            <div>
                              <span className="ans-soul-mood-big">
                                {moodTier.emoji} {soul.feiyuMood.mood}
                                <small>/100 · {moodTier.labelZh}</small>
                              </span>
                              <p className="ans-soul-mood-note">
                                {moodTier.innerNoteZh}（基线 {soul.feiyuMood.baseline} · 半衰期{" "}
                                {soul.feiyuMood.decayHalfHours}h）
                              </p>
                            </div>
                            <div className="ans-soul-inline-btns">
                              <button
                                type="button"
                                onClick={() =>
                                  settleSoulTurn("兔兔龙你今天真棒超可爱！", "嘿嘿谢谢主理人夸奖！", "user")
                                }
                              >
                                💖 夸夸她 (+心情)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  writeSoulPluginsState(prev => ({
                                    ...prev,
                                    feiyuMood: {
                                      ...prev.feiyuMood,
                                      mood: prev.feiyuMood.baseline,
                                      dims: {
                                        happy: 30,
                                        calm: 45,
                                        sweet: 20,
                                        heartache: 0,
                                        worry: 0,
                                        sad: 0,
                                        jealous: 0,
                                      },
                                    },
                                  }))
                                }
                              >
                                ↺ 回到基线 70
                              </button>
                            </div>
                          </div>

                          <div className="ans-soul-dims-grid">
                            {MOOD_DIMENSION_META.map(dim => {
                              const val = soul.feiyuMood.dims[dim.key];
                              return (
                                <div key={dim.key} className="ans-soul-dim-item">
                                  <div className="ans-soul-dim-label">
                                    <span>{dim.labelZh}</span>
                                    <strong>{val}</strong>
                                  </div>
                                  <div className="ans-soul-dim-bar">
                                    <div
                                      style={{
                                        width: `${val}%`,
                                        background: dim.color,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="ans-soul-sublist">
                            <strong>最近心情时间线：</strong>
                            {soul.feiyuMood.history.slice(0, 4).map(item => (
                              <div key={item.id} className="ans-soul-sublist-row">
                                <span>{item.at}</span>
                                <strong>
                                  {item.mood} ({item.delta >= 0 ? `+${item.delta}` : item.delta})
                                </strong>
                                <span>{item.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. dsh-fish-memory Inspector */}
                      {plugin.id === "dsh-fish-memory" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-form-row">
                            <input
                              type="text"
                              value={newMemoryText}
                              onChange={e => setNewMemoryText(e.target.value)}
                              placeholder="写入一条带时间戳的记忆或偏好..."
                              className="ans-soul-input"
                            />
                            <label className="ans-soul-check">
                              <input
                                type="checkbox"
                                checked={newMemoryIsFact}
                                onChange={e => setNewMemoryIsFact(e.target.checked)}
                              />
                              永久事实
                            </label>
                            <button type="button" onClick={handleAddMemory}>
                              + 铭记
                            </button>
                          </div>
                          <div className="ans-soul-sublist">
                            {soul.fishMemory.items.slice(0, 6).map(mem => (
                              <div key={mem.id} className="ans-soul-sublist-row">
                                <span>
                                  [{mem.at}] {mem.isFact ? "📌事实" : "🫧情景"}
                                </span>
                                <span className="flex-1">{mem.text}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    writeSoulPluginsState(prev => ({
                                      ...prev,
                                      fishMemory: {
                                        ...prev.fishMemory,
                                        items: prev.fishMemory.items.filter(i => i.id !== mem.id),
                                      },
                                    }))
                                  }
                                >
                                  删除
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. dsh-meme Inspector */}
                      {plugin.id === "dsh-meme" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-form-row">
                            <span>AI 回复自动配图概率：{soul.meme.autoReplyProb}%</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={soul.meme.autoReplyProb}
                              onChange={e =>
                                writeSoulPluginsState(prev => ({
                                  ...prev,
                                  meme: {
                                    ...prev.meme,
                                    autoReplyProb: Number(e.target.value),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="ans-soul-form-row">
                            <input
                              type="text"
                              value={newStickerTitle}
                              onChange={e => setNewStickerTitle(e.target.value)}
                              placeholder="教兔兔龙新表情名（如：通宵战神）"
                              className="ans-soul-input"
                            />
                            <input
                              type="text"
                              value={newStickerKaomoji}
                              onChange={e => setNewStickerKaomoji(e.target.value)}
                              placeholder="颜文字"
                              className="ans-soul-input w-28"
                            />
                            <button type="button" onClick={handleAddSticker}>
                              + 学图
                            </button>
                          </div>
                          <div className="ans-dino-meme-grid">
                            {[...BUILTIN_MEME_STICKERS.slice(0, 4), ...soul.meme.customStickers].map(
                              st => (
                                <button
                                  key={st.id}
                                  type="button"
                                  className="ans-dino-meme-card"
                                  onClick={() => onSendUserSticker(st)}
                                >
                                  <span className="ans-dino-meme-kaomoji">{st.kaomoji}</span>
                                  <span className="ans-dino-meme-title">{st.title}</span>
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. dsh-bili-subagent Inspector */}
                      {plugin.id === "dsh-bili-subagent" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-form-row">
                            <input
                              type="text"
                              value={soul.biliSubagent.direction}
                              onChange={e =>
                                writeSoulPluginsState(prev => ({
                                  ...prev,
                                  biliSubagent: {
                                    ...prev.biliSubagent,
                                    direction: e.target.value,
                                  },
                                }))
                              }
                              className="ans-soul-input"
                              placeholder="B 站巡检方向关键词..."
                            />
                            <button
                              type="button"
                              data-testid="bili-subagent-run-now"
                              onClick={handleRunBiliScan}
                            >
                              🚀 现在跑一轮汇报
                            </button>
                          </div>
                          <div className="ans-soul-sublist">
                            {soul.biliSubagent.reports.slice(0, 2).map(rep => (
                              <div key={rep.id} className="ans-soul-bili-card">
                                <div>
                                  <strong>
                                    {rep.title} ({rep.bvid})
                                  </strong>{" "}
                                  · <small>{rep.viewsLabel}</small>
                                </div>
                                <p>{rep.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. dsh-speak-up Inspector */}
                      {plugin.id === "dsh-speak-up" && (
                        <div className="ans-soul-inspector-block">
                          <p className="ans-soul-mood-note">
                            当前时段：{speakCalc.isPeak ? "峰时 (基线 20%)" : "谷时 (基线 60%)"} ·
                            时机因子 ×{speakCalc.timingFactor} · 没中累加 +{speakCalc.bonus}% ＝{" "}
                            <strong>最终命中线 {speakCalc.hitLine}%</strong>
                          </p>
                          <div className="ans-soul-inline-btns">
                            <button type="button" onClick={() => handleManualSpeakUp(true)}>
                              🎲 演练一次 (仅记日志)
                            </button>
                            <button
                              type="button"
                              data-testid="speak-up-trigger-now"
                              onClick={() => handleManualSpeakUp(false)}
                            >
                              💬 真发一次主动搭话
                            </button>
                          </div>
                          {soul.speakUp.logs.slice(0, 3).map(log => (
                            <div key={log.id} className="ans-soul-sublist-row">
                              <span>{log.at}</span>
                              <span>{log.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 6. dsh-tts-bridge Inspector */}
                      {plugin.id === "dsh-tts-bridge" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-form-row">
                            <label className="ans-soul-check">
                              <input
                                type="checkbox"
                                checked={soul.ttsBridge.autoRead}
                                onChange={e =>
                                  writeSoulPluginsState(prev => ({
                                    ...prev,
                                    ttsBridge: {
                                      ...prev.ttsBridge,
                                      autoRead: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              回复完成后自动交由语音桥朗读
                            </label>
                          </div>
                          <div className="ans-soul-sublist">
                            {soul.ttsBridge.favorites.map(fav => (
                              <div key={fav.id} className="ans-soul-sublist-row">
                                <span className="flex-1">「{fav.text}」</span>
                                <button type="button" onClick={() => onSpeakText(fav.text)}>
                                  ▶ 朗读
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 7. dsh-qq-bridge Inspector */}
                      {plugin.id === "dsh-qq-bridge" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-form-row">
                            <input
                              type="text"
                              value={soul.qqBridge.httpUrl}
                              onChange={e =>
                                writeSoulPluginsState(prev => ({
                                  ...prev,
                                  qqBridge: { ...prev.qqBridge, httpUrl: e.target.value },
                                }))
                              }
                              className="ans-soul-input"
                              placeholder="OneBot 11 HTTP 地址 (如 http://127.0.0.1:3000)"
                            />
                            <label className="ans-soul-check">
                              <input
                                type="checkbox"
                                checked={soul.qqBridge.dryRun}
                                onChange={e =>
                                  writeSoulPluginsState(prev => ({
                                    ...prev,
                                    qqBridge: { ...prev.qqBridge, dryRun: e.target.checked },
                                  }))
                                }
                              />
                              试运行
                            </label>
                          </div>
                          <p className="ans-soul-mood-note">
                            点名后连续跟听 {soul.qqBridge.afterMentionCount} 条 /{" "}
                            {soul.qqBridge.afterMentionWindowSec} 秒 · 已支持 QQ 空间动态工具
                          </p>
                        </div>
                      )}

                      {/* 8. dsh-social-bridge-plugin Inspector */}
                      {plugin.id === "dsh-social-bridge-plugin" && (
                        <div className="ans-soul-inspector-block">
                          <div className="ans-soul-inline-btns">
                            <button
                              type="button"
                              aria-pressed={soul.socialBridge.mode === "persona"}
                              onClick={() =>
                                writeSoulPluginsState(prev => ({
                                  ...prev,
                                  socialBridge: { ...prev.socialBridge, mode: "persona" },
                                }))
                              }
                            >
                              🎭 人格聊天模式
                            </button>
                            <button
                              type="button"
                              aria-pressed={soul.socialBridge.mode === "assistant"}
                              onClick={() =>
                                writeSoulPluginsState(prev => ({
                                  ...prev,
                                  socialBridge: { ...prev.socialBridge, mode: "assistant" },
                                }))
                              }
                            >
                              🛠️ 远程助手授权模式
                            </button>
                          </div>
                          <div className="ans-soul-sublist">
                            {soul.socialBridge.members.map(m => (
                              <div key={m.id} className="ans-soul-sublist-row">
                                <strong>{m.name}：</strong>
                                <span>{m.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
