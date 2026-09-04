# -*- coding: utf-8 -*-
"""续查已提交的 Agnes 视频任务并下载（轮询断线场景用）"""
import sys, os, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import agnes_video as av


def main():
    if len(sys.argv) < 3:
        print("用法: python agnes_resume.py <video_id> <out_dir> [model]")
        sys.exit(1)
    video_id = sys.argv[1]
    out_dir = Path(sys.argv[2])
    model = sys.argv[3] if len(sys.argv) > 3 else "agnes-video-2.5-flash"

    api_key = av.get_api_key()
    api_base, query_base = av.normalize_base(os.environ.get("AGNES_BASE_URL", av.DEFAULT_BASE))
    av.configure_proxy()

    av.log(f"[续查] video_id={video_id} model={model}")
    video_url = av.poll_task(api_key, query_base, video_id, model, timeout_s=600)
    av.log(f"[结果] {video_url}")
    out = av.download(video_url, out_dir, video_id)
    av.log(f"完成！文件：{out}")


if __name__ == "__main__":
    main()