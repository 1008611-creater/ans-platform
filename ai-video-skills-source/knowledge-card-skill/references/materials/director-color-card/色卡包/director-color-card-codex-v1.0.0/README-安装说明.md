# director-color-card Codex 色卡包

版本：1.0.0

这是一个专门做导演色卡的轻量 Codex Skill 包，和“完整 AIGC 导演生产包”拆开使用。

## 它能做什么

- 查询 175 位导演的色值 Prompt。
- 输出可直接复制到 Seedance 2.0 的色彩提示词。
- 根据上传图片生成 HEX 色卡。
- 根据真实电影截图素材生成 PNG 色卡。
- 交付 `palette-card.png`、`palette-card.html`、`palette-data.json`、`color-prompt.md`、`sources.md` 五件套。

## 最简单用法

```text
$director-color-card 导演名 + 你要的结果
```

常用示例：

```text
$director-color-card 小津安二郎，只给我可直接复制到 Seedance 2.0 的色值 Prompt
```

```text
$director-color-card 诺兰，生成 PNG 色卡和 Seedance 2.0 Prompt
```

```text
$director-color-card 根据我上传的图片取色，生成 HEX 色卡和 Seedance 2.0 Prompt
```

```text
$director-color-card 给我 175 位导演全部 Seedance 色值 Prompt
```

## Windows 安装

1. 完整解压 ZIP。
2. 打开解压后的文件夹。
3. 在文件夹里运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

4. 重新打开 Codex 或新建任务。
5. 输入 `$director-color-card ...` 使用。

## 手动安装

把安装包里的：

```text
payload\director-color-card
```

复制到：

```text
%USERPROFILE%\.codex\skills\director-color-card
```

最终结构应该是：

```text
%USERPROFILE%\.codex\skills\director-color-card\SKILL.md
```

## 运行要求

- 只要文字 Prompt：不需要额外软件。
- 根据上传图片生成 PNG 色卡：需要 Python 3.10+ 和 Pillow。
- 本包不内置电影截图。真实电影截图色卡需要用户提供有权使用的素材，或使用可记录来源的公开画面。

## 品牌水印

最终结果末尾会追加：

```text
知卡星球开发｜微信：c4sucaiku
```

水印不会写入 Seedance Prompt 代码块内部。

## 关于加密和防反扒

本地 Codex Skill 要正常工作，核心说明、索引和 Prompt 数据就必须能被智能体读取。因此“本地加密，同时禁止智能体读取数据”在原理上做不到。

当前包采用轻量保护：

- 只保留色卡相关数据，不放完整导演生产包。
- 不内置电影截图。
- 输出末尾加文字水印。
- 包内 README 明确来源和使用边界。

真正要防反扒，建议做商业版：核心 Prompt 数据放远端 API，本地 Skill 只提交导演名和需求，返回单次结果；这样本地包里不放完整数据库。
