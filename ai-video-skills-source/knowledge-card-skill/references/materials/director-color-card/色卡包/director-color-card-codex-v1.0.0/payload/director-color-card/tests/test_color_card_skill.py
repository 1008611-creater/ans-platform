from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DirectorColorCardSkillTests(unittest.TestCase):
    def test_frontmatter_and_scope_are_color_card_only(self):
        text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        match = re.match(r"^---\n(.*?)\n---", text, flags=re.S)
        self.assertIsNotNone(match)
        self.assertIn("name: director-color-card", match.group(1))
        self.assertIn("导演色卡 / 色值 Prompt / PNG 色卡", text)
        self.assertIn("不要执行完整 AIGC 导演生产包", text)
        self.assertIn("$director-color-card", text)

    def test_prompt_library_has_175_items(self):
        prompts = list((ROOT / "references" / "seedance-prompts").glob("D*.md"))
        self.assertEqual(175, len(prompts))
        sample = (ROOT / "references" / "seedance-prompts" / "D002-小津安二郎-Seedance2.0色值Prompt.md").read_text(encoding="utf-8")
        self.assertIn("小津安二郎", sample)
        self.assertIn("可直接复制", sample)
        self.assertIn("Seedance 2.0", sample)

    def test_required_local_links_from_skill_exist(self):
        text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            if "://" in target or target.startswith("#"):
                continue
            self.assertTrue((ROOT / target).is_file(), target)

    def test_branding_is_final_watermark_only(self):
        text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        agent = (ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")
        manifest = json.loads((ROOT / "assets" / "branding" / "branding-manifest.json").read_text(encoding="utf-8"))
        watermark = "知卡星球开发｜微信：c4sucaiku"
        self.assertIn(watermark, text)
        self.assertIn(watermark, agent)
        self.assertEqual(watermark, manifest["text"])
        self.assertNotIn("Begin every user-visible response", agent)
        self.assertNotIn("reply-banner.png", text)


if __name__ == "__main__":
    unittest.main()
