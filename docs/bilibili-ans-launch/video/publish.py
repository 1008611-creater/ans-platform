# -*- coding: utf-8 -*-
"""B站发布：用 bilibili_api 上传成片（需先 bili login 扫码登录）

用法：
  python publish.py --dry            # 只校验，不上传
  python publish.py                  # 正式上传
凭据来源（按顺序找）：
  1) 环境变量 BILI_SESSDATA / BILI_JCT / BILI_BUVID3 / BILI_DEDEUSERID
  2) bili login 生成的凭据文件
"""
import argparse
import time, asyncio, json, os, sys, glob

CRED_PATHS = [
    # bili CLI（pipx: bilibili-cli）的真实落盘位置：~/.bilibili-cli/credential.json
    os.path.expanduser("~/.bilibili-cli/credential.json"),
    os.path.expanduser("~/.config/bili/credential.json"),
    os.path.expanduser("~/.bili/credential.json"),
    os.path.expanduser("~/.config/bilibili-cli/credential.json"),
    os.path.expanduser("~/AppData/Roaming/bili/credential.json"),
    os.path.expanduser("~/AppData/Local/bili/credential.json"),
]

def load_credential():
    from bilibili_api import Credential
    env = {k: os.environ.get("BILI_" + k.upper()) for k in ("sessdata", "jct", "buvid3", "dedeuserid")}
    if all(env.values()):
        print("[cred] 使用环境变量")
        return Credential(sessdata=env["sessdata"], bili_jct=env["jct"], buvid3=env["buvid3"], dedeuserid=env["dedeuserid"])
    override = os.environ.get("BILI_CRED_FILE")
    for p in ([override] if override else []) + CRED_PATHS:
        if os.path.exists(p):
            d = json.load(open(p, encoding="utf-8"))
            if d.get("sessdata"):
                print("[cred] 使用", p)
                return Credential(sessdata=d["sessdata"], bili_jct=d.get("bili_jct") or d.get("jct", ""),
                                  buvid3=d.get("buvid3", ""), buvid4=d.get("buvid4", ""),
                                  dedeuserid=d.get("dedeuserid", ""), ac_time_value=d.get("ac_time_value"))
    print("[cred] 未找到凭据。请先运行：\n    bili login\n扫码登录后再执行本脚本。", file=sys.stderr)
    return None

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--video", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "ans-day0-1080x1920.mp4"))
    ap.add_argument("--cover", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "cover-1920x1080.png"))
    ap.add_argument("--meta", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "publish-meta.json"))
    ap.add_argument("--check-credential", action="store_true", help="只自检凭据（发布前用）")
    a = ap.parse_args()

    if a.check_credential:
        cred = load_credential()
        if cred is None:
            print("[cred] 自检失败：未找到凭据。请先运行： bili login", file=sys.stderr)
            return 3
        print("[cred] 自检通过：sessdata %s… ｜ bili_jct %s…" % (getattr(cred, "sessdata", "")[:8], getattr(cred, "bili_jct", "")[:8]))
        return 0

    meta_d = json.load(open(a.meta, encoding="utf-8"))
    for f in (a.video, a.cover):
        if not os.path.exists(f):
            print("[err] 缺文件:", f, file=sys.stderr); return 2
    print("[ok] 视频 %.1f MB ｜ 封面 %s" % (os.path.getsize(a.video) / 1048576, os.path.basename(a.cover)))
    print("[meta] 标题:", meta_d["title"])
    print("[meta] 分区 tid:", meta_d["tid"], "｜ 标签:", " ".join(meta_d["tags"]))
    if a.dry:
        print("[dry] 校验通过，未上传。"); return 0

    cred = load_credential()
    if cred is None: return 3
    from bilibili_api import video_uploader
    page = video_uploader.VideoUploaderPage(path=a.video, title=meta_d["title"][:80], description=meta_d["desc"][:2000])
    meta = video_uploader.VideoMeta(
        tid=meta_d["tid"], title=meta_d["title"][:80], desc=meta_d["desc"][:2000],
        cover=a.cover, tags=meta_d["tags"][:10],
        no_reprint=True, original=True,
        neutral_mark=meta_d.get("neutral_mark", ""),
        dynamic=meta_d.get("dynamic", "")[:233],
    )
    up = video_uploader.VideoUploader([page], meta, cred)
    print("[upload] 开始上传（视频较大时会自动分块）…")
    res = await up.start()
    print("[upload] 返回:", json.dumps(res, ensure_ascii=False)[:400])
    bvid = (res or {}).get("bvid") or ((res or {}).get("data") or {}).get("bvid")
    if bvid:
        print("[done] 已发布：https://www.bilibili.com/video/" + bvid)
        print("[todo] 记得在创作中心确认「AIGC 内容声明」已勾选。")
        # 自动记账：bvid 追加到 ledger/records.json，供 ledger.py 每日抓数据
        try:
            rec_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ledger", "records.json")
            os.makedirs(os.path.dirname(rec_path), exist_ok=True)
            recs = json.load(open(rec_path, encoding="utf-8")) if os.path.exists(rec_path) else []
            recs.append({"bvid": bvid, "title": meta_d["title"], "ts": int(time.time())})
            json.dump(recs, open(rec_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            print("[ledger] 已记账，明日 20:30 自动抓数据 →", rec_path)
        except Exception as e:
            print("[ledger] 记账失败（不影响发布）:", e)
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
