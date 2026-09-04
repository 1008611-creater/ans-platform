# 本机 Python 解释器选择（防「py 用不了」）

## 问题现象

OpenLux 生图脚本（`~/.workbuddy/skills/openlux-image-gen/scripts/generate_image.py`）等 Python 脚本跑不起来，报错：

```
No module named 'gettext'
```

或后续报 `No module named 'random'`。这不是脚本问题，是**解释器问题**。

## 根因

本机托管 Python（WorkBuddy 自带的精简版）：

```
/c/Users/lsb/.workbuddy/binaries/python/versions/3.13.12/python
```

**缺标准库**（gettext、random 等都没打包），只够跑框架内部逻辑，不能跑业务脚本。人物图当时能跑是因为用的别的解释器，别被误导。

## 正确解释器

本机系统安装的完整版 Python：

```
/c/Users/lsb/AppData/Local/Programs/Python/Python312/python.exe
```

标准库齐全，且已装 `requests`（生图脚本依赖）。

## 验证命令（开工前先探测）

```bash
# 托管 Python（应能跑通才算可用，跑不通就别用）
/c/Users/lsb/.workbuddy/binaries/python/versions/3.13.12/python -c "import sys,gettext,random; print(sys.version)" 2>&1 | head -3

# 系统 Python312（推荐，直接用它）
/c/Users/lsb/AppData/Local/Programs/Python/Python312/python.exe -c "import sys,gettext,random,requests; print(sys.version)" 2>&1 | head -3
```

也可以用本 skill 自带的 `scripts/check_python.py` 一键探测：

```bash
/c/Users/lsb/AppData/Local/Programs/Python/Python312/python.exe \
  "C:/Users/lsb/.workbuddy/skills/project-drive-archive/scripts/check_python.py"
```

## 结论

- 跑业务脚本（生图、PDF、上传等）**一律用系统 Python312**，不要用托管 Python
- 如果连系统 Python312 都缺依赖（如 requests），先 `pip install requests` 再跑
- 每次在新线程开工涉及 Python 脚本时，先跑 check_python.py 确认，别等脚本报错才发现

## 其它环境坑（一并记录）

| 坑 | 现象 | 解法 |
|---|---|---|
| 托管 Python 缺标准库 | `No module named 'gettext'` | 用系统 Python312 |
| 中文路径 curl -T | 上传打不开文件 | cd 进目录用相对文件名 |
| 生图脚本格式 | 提示词文件 `^Prompt:` 后取内容 | `sed -n '/^Prompt:/,$p' file | tail -n +2` |
