#!/usr/bin/env python3
"""
Opens a persistent Chromium window at Feishu Drive (https://narcb9vct6.feishu.cn/drive/home/),
waits for the user to log in (if not already logged in), and assists/automates importing
`/Users/eeo/Downloads/eeo/NB实验室_科学实验统一封面Skill矩阵与21张物化生实测汇报.docx` as a native Feishu Cloud Doc.
"""
import pathlib
import subprocess
import sys

DOCX_PATH = pathlib.Path("/Users/eeo/Downloads/eeo/NB实验室_科学实验统一封面Skill矩阵与21张物化生实测汇报.docx")
FEISHU_URL = "https://narcb9vct6.feishu.cn/drive/home/"

def main():
    print(f"Target DOCX ({round(DOCX_PATH.stat().st_size / 1024 / 1024, 2)} MB): {DOCX_PATH}")
    # Open Finder selecting the DOCX file and open Feishu Drive in default browser
    subprocess.run(["open", "-R", str(DOCX_PATH)], check=False)
    subprocess.run(["open", FEISHU_URL], check=False)
    print("Opened Feishu Drive in browser and highlighted the DOCX file in Finder for 1-click import!")

if __name__ == "__main__":
    main()
