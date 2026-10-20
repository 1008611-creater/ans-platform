# 小恐龙心情/互动台词英文草稿（评审用 · 未落库）

> **状态**：草稿。没有改任何代码。
> **怎么审**：直接在本 PR 的 diff 里改英文；或回复「同意」+ 要改的条目；或回复「保持中文」。
> **来源**：`src/components/mascot/companion-sanctuary-presets.ts` 的 `SHOWCASE_MOOD_PRESETS`。

## 这批是什么

3D 近景舞台里小恐龙**气泡台词**：每个心情/互动预设一行主台词（`text`）+ 一行状态小标（`sub`）。
共 **41 个预设 × 2 行 = 82 条**，目前**只有中文**（该文件里 `whip`/`feed` 的长台词、`QUEST_THOUGHTS` 都已经是 zh/en 成对，不在本表内）。

预览里能看到的场景：`mood`（巡航/思考/兴奋/打盹）、`macro`（近景特写）、`hover`（鼠标摸头）、`click`（被戳）、`whip`（抽屁股）、`feed`（投喂盲盒夜宵）。

| key | 中文 text | 建议英文 text | 中文 sub | 建议英文 sub |
|---|---|---|---|---|
| `happy_smile` | 咻~ 正在全天候巡航守护灵感中 | Zwoosh~ patrolling 24/7 to guard your ideas | 💡 灵感雷达在线 | 💡 Idea radar online |
| `curious_tilt` | 歪头看看，这个工作流能抄作业！ | Tilting my head — hey, this workflow is copy-paste worthy! | ✨ 发现可复用模板 | ✨ Reusable template spotted |
| `starry_excited` | 哇！这个页面有点意思 | Ooh! This page looks interesting | 🦖 ANS 随身搭子在线 | 🦖 Your ANS sidekick is online |
| `cozy_chill` | 在右下角偷个小懒，没被发现吧~ | Sneaking a tiny break in the corner, nobody noticed~ | 🪢 待命随时开工 | 🪢 Standing by, ready to work |
| `cheerful_wave` | 嗨！AI Never Stops 灵感不停歇 | Hi! AI Never Stops — neither do the ideas | 🎯 算力与灵感在线 | 🎯 Compute and ideas online |
| `focused_think` | 帮你盯着呢，绝不让收藏夹吃灰！ | I'm watching it for you — no bookmark will gather dust! | 🔍 边看项目边动手 | 🔍 Browsing and building together |
| `sleepy_stretch` | 伸个懒腰，偷偷打个小盹~ | Big stretch, sneaking a tiny nap~ | 💫 满血能量蓄力中 | 💫 Recharging to full |
| `aha_spark` | 叮！刚帮你抓到一个新灵感 | Ding! Just caught a fresh idea for you | 🚀 3D 伴宠实时在线 | 🚀 3D companion live |
| `macro0` | 贴脸杀！近景镜头前逮住你啦~ | Close-up attack! Caught you in front of the lens~ | ✨ 近景互动台已就绪 | ✨ Close-up stage ready |
| `macro1` | 近景特写营业中！小腮红好看吗 | Serving close-up looks! Do you like my blush? | 💖 3D 特写镜头营业中 | 💖 3D close-up mode |
| `macro2` | 凑近镜头碎碎念：一起拆解项目！ | Muttering at the lens: let's break this project down! | 🦖 干活动力拉满 | 🦖 Full working power |
| `macro3` | 离镜头这么近有点小害羞嘿嘿~ | So close to the lens… a little shy, hehe~ | 🌟 近景特写模式 | 🌟 Close-up camera mode |
| `hover0` | 哇！被你的鼠标摸头啦，好舒服~ | Ooh! You patted my head with the cursor, so nice~ | ✨ 好感度 +10 | ✨ Affection +10 |
| `hover1` | 别挠痒痒哈哈！尾巴都摇飞啦 | Don't tickle me, haha! My tail is wagging off! | 🎯 开心摇尾中 | 🎯 Happily wagging |
| `hover2` | 捕捉到野生鼠标！要一起造物吗 | Wild cursor captured! Want to build something together? | 🔥 随时准备开工 | 🔥 Ready to start |
| `hover3` | 蹭蹭鼠标指针~ 灵感全都传给你 | Nuzzling the pointer~ passing all my ideas to you | ✨ 灵感传输 +100% | ✨ Idea transfer +100% |
| `hover4` | 盯——正顺着网线看你的鼠标呢！ | Staring—following your cursor through the cable! | 🦖 视线锁定中 | 🦖 Sightline locked |
| `click0` | 耶！戳中小肚子啦，开心蹦两下！ | Yay! You poked my tummy, bouncing twice! | 💖 软萌指数拉满 | 💖 Softness maxed |
| `click1` | 哎呀被戳脸蛋了，害羞偷看你~ | Ah, my cheek! Peeking at you shyly~ | ✨ 脸颊微红中 | ✨ Cheeks blushing |
| `click2` | 近景训龙互动台已就绪！ | Close-up dragon training is ready! | 🚀 特写机位已锁定 | 🚀 Camera locked on |
| `click3` | 嗷呜一口吃掉拖延症！马上开工 | Chomp — procrastination eaten! Starting now | 🎉 满血状态待命中 | 🎉 Ready at full power |
| `click4` | 收到！打工人打工魂，随时肝代码 | Roger! Worker's soul, ready to grind code anytime | 💡 算力与灵感在线 | 💡 Compute and ideas online |
| `click5` | 贴贴成功！给你表演空中伸懒腰~ | Cuddle success! Watch me stretch in mid-air~ | 🌟 元气补充完毕 | 🌟 Energy restored |
| `whip0` | 嗷呜！已经在光速敲代码改Bug了！ | Ow! Already coding at light speed and fixing bugs! | ⚡ 手速飙升 300% | ⚡ Hand speed +300% |
| `whip1` | 这份方案我今晚通宵肝完还不行吗！ | I'll pull an all-nighter on this plan, alright?! | 🔥 含泪推进进度 +25% | 🔥 Pushing progress +25% |
| `whip2` | 马上把 3D 渲染优化到 120 帧！ | Optimising 3D rendering to 120 fps right now! | 💻 打工魂彻底觉醒 | 💻 Worker soul fully awake |
| `whip3` | 这就去把 PR 合并、测试跑通！ | Off to merge the PR and get the tests green! | 📈 疯狂搬砖模式 | 📈 Bricklaying frenzy mode |
| `whip4` | 正在疯狂输出十万行神级代码！ | Blasting out a hundred thousand lines of elite code! | 🚀 搬砖效率拉满 | 🚀 Bricklaying efficiency maxed |
| `whip5` | 已经在全天候巡视 ANS 展厅啦！ | Already patrolling the ANS halls around the clock! | 🛠️ 正在全力加速中 | 🛠️ Accelerating at full speed |
| `whip6` | 直接打通任督二脉，需求瞬间清空！ | Clearing all blockages — the backlog is empty! | ✨ 今日提交量破纪录 | ✨ Record commits today |
| `whip7` | 这就去帮你把作品集擦得锃亮！ | Off to polish your portfolio until it gleams! | 💪 绝不拖延一秒钟 | 💪 Zero procrastination |
| `feed0` | 吨吨吨！冰美式注入，再肝十个通宵！ | Chug chug! Iced americano injected — ten more all-nighters! | ⚡ 咖啡因过载 · 亢奋中 | ⚡ Caffeine overload · hyped |
| `feed1` | 斯哈斯哈！折耳根配变态辣太上头啦！ | Hiss hiss! Fish mint with extra-hot chili — so addictive! | 🌶️ 味蕾核爆 · 红温喷火 | 🌶️ Taste buds nuked · breathing fire |
| `feed2` | 咔哧咔哧！顺手把 Bug 消化成新特性！ | Crunch crunch! Turning bugs into features on the way! | ✨ Bug 吞噬者 · 嘎嘣脆 | ✨ Bug devourer · extra crispy |
| `feed3` | 嗝…这大饼太干，差点把 CPU 干烧了！ | Burp… that pie was so dry it almost cooked my CPU! | 🛡️ 画饼防御力 +50 | 🛡️ Pie-resistance +50 |
| `feed4` | 吸溜吸溜…真香！臭到极致就是香！ | Slurp slurp… delicious! Smelly to the extreme is flavour! | 💨 真香定律虽迟但到 | 💨 Deliciousness arrived late but arrived |
| `feed5` | 喝完感觉头顶背刺都长高了两厘米！ | After that drink my back spikes grew two centimetres! | 🌿 发量王者申请出战 | 🌿 Hair-volume champion reporting |
| `feed6` | 滋滋滋——满血 800W 算力注入！ | Bzzt—full 800W of compute injected! | 🚀 脑回路突破 240Hz | 🚀 Brain clock past 240Hz |
| `feed7` | 嘶——酸得五官乱飞！咱 ANS 最酷！ | Yikes—so sour my face flew apart! ANS is the coolest! | ✨ 酸爽提神醒脑 | ✨ Sour-bright and awake |
| `feed8` | 呜呼！吃到黄金脆皮炸鸡桶啦！ | Woohoo! Got the golden crispy fried chicken bucket! | 💖 幸福感直接拉爆 | 💖 Happiness maxed out |
| `feed9` | 咕噜吐泡泡～智商重新占领高地！ | Gurgle bubble~ IQ retaking the high ground! | 🫧 人间清醒龙上线 | 🫧 Sober dragon online |

## 语气约定

- 保留"陪着你干活的小恐龙"人设：元气、偶尔撒娇、被抽会嘴硬；
- 主台词是**气泡里的一句话**（短、口语、可朗读），`sub` 是**状态小标**（更短，允许像游戏 HUD）；
- emoji 位置保持和中文一致（英文里放句尾）；
- 中文梗（折耳根、任督二脉、画饼）用**功能等价**的英文表达，不逐字直译。

## 落地方式（批准后，纯机械）

1. `ShowcaseMoodPreset` 增加可选 `textEn` / `subEn`；
2. 舞台按 `locale` 选择：`isZh ? preset.text : preset.textEn ?? preset.text`（`sub` 同理）；
3. 加一条 parity 断言：41 个预设必须**同时**有 `textEn` 与 `subEn`，且英文不含中文字符 —— 防"只翻一半"。

## 与此前两份草稿的关系

- 目录（族群/衣橱）115 条：`docs/i18n/agent-catalog-en-draft.md`；
- 工作模式 128 条：`docs/i18n/workbench-i18n-draft.md`；
- 本表 82 条：3D 舞台气泡台词。三块合起来 = Agent 界面剩余的全部"用户可见、只有中文"的文案。
