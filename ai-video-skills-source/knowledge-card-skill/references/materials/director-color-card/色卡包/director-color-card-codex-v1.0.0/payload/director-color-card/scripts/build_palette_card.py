import argparse
from pathlib import Path

from palette_core import build_director_card, build_scene_card, verify_output


def main() -> int:
    parser = argparse.ArgumentParser(description="Build deterministic film/scene color palette cards.")
    sub = parser.add_subparsers(dest="mode", required=True)

    scene = sub.add_parser("scene", help="Build from 1–3 user-provided scene images")
    scene.add_argument("images", nargs="+", type=Path)
    scene.add_argument("--output-dir", required=True, type=Path)
    scene.add_argument("--title", default="场景综合色彩分析卡")
    scene.add_argument("--colors", type=int, default=8, choices=range(2, 11))

    director = sub.add_parser("director", help="Build from a sourced real-film-frame manifest")
    director.add_argument("--manifest", required=True, type=Path)
    director.add_argument("--output-dir", required=True, type=Path)
    director.add_argument("--template", default="auto", choices=("auto", "light", "dark"))
    director.add_argument("--colors", type=int, default=8, choices=range(2, 11))
    director.add_argument("--preview", action="store_true", help="Allow fewer than 4 films/4 frames for layout preview only")
    args = parser.parse_args()

    if args.mode == "scene":
        result = build_scene_card(args.images, args.output_dir, args.title, args.colors)
        strict = True
    else:
        result = build_director_card(args.manifest, args.output_dir, args.template, not args.preview, args.colors)
        strict = not args.preview
    report = verify_output(args.output_dir, strict=strict)
    if not report["ok"]:
        for error in report["errors"]:
            print(f"ERROR: {error}")
        return 2
    for label, path in result.items():
        print(f"{label.upper()}: {path}")
    print(f"PASS: template={report['template']} size={report['size'][0]}x{report['size'][1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
