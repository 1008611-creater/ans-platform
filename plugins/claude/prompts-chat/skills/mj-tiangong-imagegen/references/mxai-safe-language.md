# MXAI 国内版安全词汇编译层

适用：国内版 MXAI / MJ 图生。目标不是规避正常内容审核，而是把无害的建筑、材质、战场和气氛描述写得更明确，减少英文多义词被误判。不得用本表掩盖真正不合规内容。

## 一、已确认的误审词

| 原词 | 风险原因 | 推荐替换 | 中文对应 |
|---|---|---|---|
| `bare rock faces` | `bare` 可能被误判为裸露 | `exposed weathered rock surfaces` / `open weathered cliff faces` | 风化岩壁 / 外露岩面 |
| `bare feet` | `bare` 可能被误判为裸露 | `clawed feet in simple dark wraps` / `dark clawed boots` | 利爪足部 / 深色简靴 |
| `bare torso` | 容易触发身体裸露联想 | `fur-covered upper body` / `armored upper body` | 毛发覆盖的上身 / 护甲上身 |
| `naked` / `nude` | 直接敏感 | 不用于本项目；按角色事实改写服装状态 | — |
| `blood-soaked` | 可能被误判为血腥 | `battle-stained` / `dark combat stains` | 战损痕迹 / 深色战斗污痕 |
| `gore` / `dismembered` / `decapitated` | 血腥肢解风险 | `battle debris` / `defeated enemy remains` / `scattered armor fragments` | 战场残骸 / 敌方败退遗留物 / 散落甲片 |
| `corpse` / `dead body` | 可能触发尸体审核 | `fallen combatant silhouette` / `battlefield remains` | 倒下的战斗身影 / 战场遗留物 |
| `kill` / `killing` | 暴力动作直白 | `combat clash` / `defeat` / `battle aftermath` | 战斗交锋 / 击退 / 战后状态 |
| `weapon pointed at face` | 暴力威胁组合 | `weapon raised in combat stance` | 武器处于战斗架势 |
| `lingerie` / `seductive` / `sexy` | 性暗示风险 | 不用于本项目；改写为服装材质、身份与姿态 | — |
| `child` + 战斗/伤痕 | 未成年与暴力组合风险 | 明确 `adult` / `成年角色`；不写未成年参战 | 成年角色 |

## 二、A06 南屿山的安全替换

原句：
```text
bare rock faces and sparse dark pine forests on the slopes
```

替换为：
```text
exposed weathered rock surfaces and sparse dark pine forests on the slopes
```

中文：
```text
山坡分布着外露的风化岩面与稀疏深色古松林
```

原句：
```text
scattered weapon debris and demon remains
```

更稳妥：
```text
scattered weapon fragments, damaged armor pieces and battlefield debris
```

中文：
```text
散落的武器残片、受损甲片与战场遗留物
```

原句：
```text
blood-soaked young soldier
```

更稳妥：
```text
battle-stained young soldier with scratched silver armor
```

中文：
```text
带有战损污痕、银甲多处划痕的年轻天兵
```

## 三、提示词输出规则

从现在起，MXAI 提示词默认双语交付：

1. **中文执行版**：优先给国内版直接粘贴，表达明确、具体、中性；
2. **English reference version**：保留对应视觉语义，方便核对国际模型语义和后续跨渠道迁移；
3. 两版只允许语言变化，不得改变主体、构图、参数、参考图职责或排除项；
4. 中文版的排除项仍放在 `--no` 后；如 MXAI 对英文 `--no` 更稳定，保留英文短词即可；
5. 不把 `bare`、`naked`、`nude`、`gore` 等高风险多义词带入新提示词；历史文件只做归档，不直接复用。

## 三之二、MXAI v8.2 英文解析器风险词（实测 bug，2026-08-24）

MXAI v8.2 会把正文中带连字符的合成词、全大写缩写误判为未知参数，直接整单失败（积分退回）。**English reference version 必须替换**，中文执行版不受影响：

| 风险写法 | 触发结果 | 替换 |
|---|---|---|
| `close-up` | 连字符被解析为参数分隔符 | `closeup` |
| `game UI` | 大写 `UI` 被解析为参数键 | `game interface` |
| `plastic CGI` | 大写 `CGI` 被解析为参数键 | `plastic 3D render` |
| `UHD / HDR / VFX / SFX / BGM` 等全大写缩写 | 被解析为参数键 | 改小写全词（`ultra high definition` 等）或删去 |

规则：
1. English reference version 编译后先扫一遍连字符与大写缩写，命中即替换；
2. 拿不准时优先用中文执行版出图（中文无此 bug）；
3. 双语对比出图时，两版都要过此检查，且除语言外其他变量冻结。

## 四、审核失败时的最小返工顺序

1. 先替换高风险多义词，不改主体与构图；
2. 再缩短 `--no`，只保留本次真正需要排除的 3–8 项；
3. 再降低过度血腥、身体暴露和武器直指等组合表达；
4. 不通过时记录触发词和渠道版本，不静默改变故事事实。
