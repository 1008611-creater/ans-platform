FIXED_CONSTRAINTS = """【强制约束】
生成模型固定为：seedance2.5,不可使用其他版本/模型
视频时长：严格等于 30 秒，正负误差不超过1秒，分段/秒数需精准匹配
画面参考：100%严格遵循我提供的图片内容、构图、角色、服饰、场景与风格，不得擅自改动、增删或替换任何关键元素
台词/字幕：逐字完全按照我给出的台词/图片中的文字呈现，顺序、措辞、标点、停顿均不得自行修改、增删、改写或扩写
无额外创作：不得自行添加未指定的情节、画面、台词、转场或特效；仅按要求内容精准生成"""


def build_provider_prompt(user_prompt: str, aspect_ratio: str) -> str:
    return f"{FIXED_CONSTRAINTS}\n画面比例：严格为 {aspect_ratio}，不得变形、裁切或改为其他比例。\n\n【用户提示词】\n{user_prompt}"
