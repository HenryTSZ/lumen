#!/usr/bin/env python3
"""
生成 src/renderer/data/emoji.ts —— 完全离线的 emoji 数据集。

数据来源（仅构建期使用，运行时不联网）：
  * Unicode emoji-test.txt  —— 完整 emoji 列表 + 英文名称 + 分组
  * CLDR  annotations/zh.xml —— 官方简体中文名称与关键词

输出格式刻意压缩：每行是一个四元组 [字符, 中文名, 关键词串, 分组]，
  运行时由 provider 展开成索引，避免上千个对象的 JSON 冗余。
"""
import os
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = "/tmp/.lumen-emoji"
OUT = os.path.join(ROOT, "src/renderer/data/emoji.ts")

SOURCES = {
    "emoji-test.txt": "https://www.unicode.org/Public/emoji/15.1/emoji-test.txt",
    "zh.xml": "https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotations/zh.xml",
}

GROUPS = {
    "Smileys & Emotion": "笑脸与情感",
    "People & Body": "人物与身体",
    "Animals & Nature": "动物与自然",
    "Food & Drink": "食物与饮品",
    "Travel & Places": "旅行与地点",
    "Activities": "活动",
    "Objects": "物品",
    "Symbols": "符号",
    "Flags": "旗帜",
}

HOT = [
    "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔", "😅",
    "😭", "😡", "👍", "👎", "👌", "🙏", "👏", "💪", "🤝", "✌️",
    "❤️", "🔥", "✨", "⭐", "🎉", "🎊", "💯", "✅", "❌", "⚠️",
    "🚀", "💡", "📌", "📎", "📝", "📊", "📈", "📉", "💰", "🎯",
    "🐛", "🔧", "🛠️", "⚡", "🌟", "🍺", "☕", "🐶", "🐱", "🌈",
]


def fetch(name: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print(f"下载 {name} …", file=sys.stderr)
        data = urllib.request.urlopen(SOURCES[name], timeout=60).read()
        with open(path, "wb") as fh:
            fh.write(data)
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def load_annotations() -> dict:
    """CLDR 中文标注：cp -> (主名称, [关键词])"""
    root = ET.fromstring(fetch("zh.xml"))
    table = {}
    for node in root.iter("annotation"):
        cp = node.get("cp")
        if not cp:
            continue
        parts = [p.strip() for p in (node.text or "").split("|") if p.strip()]
        if not parts:
            continue
        kind = node.get("type")
        name, keywords = table.get(cp, ("", []))
        if kind == "tts":
            name = parts[0]
        elif not name:
            name = parts[0]
        merged = [p for p in (keywords + ([] if kind == "tts" else parts)) if p]
        seen, keywords = set(), []
        for word in merged:
            if word not in seen:
                seen.add(word)
                keywords.append(word)
        table[cp] = (name, keywords[:4])
    return table


def parse_emoji(annotations: dict) -> list:
    rows = []
    group = ""
    group_index = {name: str(i) for i, name in enumerate(GROUPS.values())}
    for line in fetch("emoji-test.txt").splitlines():
        if line.startswith("# group:"):
            group = group_index.get(GROUPS.get(line.split(":", 1)[1].strip(), ""), "")
            continue
        if not line.strip() or line.startswith("#"):
            continue
        body, _, raw_name = line.partition("#")
        status = body.split(";")[1].strip() if ";" in body else ""
        if status != "fully-qualified":
            continue
        cps = body.split(";")[0].strip()
        # 名称字段形如 "😀 E0.6 grinning face"，先去掉 emoji 本身再去掉版本前缀
        tokens = raw_name.split()
        if len(tokens) >= 2 and re.match(r"^E\d+(\.\d+)?$", tokens[1]):
            name = " ".join(tokens[2:])
        else:
            name = " ".join(tokens[1:] if tokens else [])
        if not name or "skin tone" in name:
            continue
        char = "".join(chr(int(cp, 16)) for cp in cps.split())
        zh_name, zh_keys = annotations.get(char, ("", []))
        if not zh_name:
            zh_name, zh_keys = annotations.get(char.rstrip("️"), ("", []))
        if not zh_name:
            zh_name = name
        english = [
            w
            for w in re.split(r"[^a-z0-9]+", name.lower())
            if w and w not in {"with", "and", "of", "the", "a", "in", "on", "or", "for"}
        ][:5]
        keywords = []
        for word in english + zh_keys:
            if word not in keywords:
                keywords.append(word)
        rows.append([char, zh_name, " ".join(keywords), group])
    return rows




def main() -> None:
    annotations = load_annotations()
    rows = parse_emoji(annotations)
    print(f"共 {len(rows)} 条 emoji", file=sys.stderr)

    seen, unique = set(), []
    for row in rows:
        if row[0] in seen:
            continue
        seen.add(row[0])
        unique.append(row)
    hot = [e for e in HOT if e in seen]

    # 单个模板字符串承载全部数据：行内 \n 分隔、列间 \t 分隔。
    # 相比 1898 个数组字面量，少了全部引号与逗号，体积省约 20KB，运行时一次 split 也就 1ms。
    body = "\n".join("\t".join(row) for row in unique)

    lines = [
        "/**",
        " * 离线 emoji 数据集，由 `python3 scripts/gen-emoji.py` 生成，请勿手改。",
        " * 来源：Unicode emoji-test.txt（15.1）+ CLDR zh annotations。",
        " *",
        " * 为控制体积，全部数据压在一个字符串里：行间 \\n、列间 \\t。",
        " * 列含义：字符 / 中文名 / 搜索关键词（空格分隔）/ 分组下标",
        " */",
        "",
        "export const EMOJI_DATA = `" + body.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$") + "`",
        "",
        "export type EmojiRow = readonly [string, string, string, string]",
        "",
        "let cache: EmojiRow[] | null = null",
        "",
        "/** 首次使用时才解析，避免拖慢启动 */",
        "export function emojiRows(): EmojiRow[] {",
        "  if (!cache) {",
        "    cache = EMOJI_DATA.split('\\n').map((line) => line.split('\\t') as unknown as EmojiRow)",
        "  }",
        "  return cache",
        "}",
        "",
    ]
    lines.append("/** 分组编号 → 分组名，行内第 4 项是它的下标 */")
    lines.append("export const EMOJI_GROUPS: string[] = " + repr(list(GROUPS.values())).replace("'", "'"))
    lines.append("")
    lines.append("/** 空查询时优先展示的高频 emoji */")
    lines.append("export const HOT_EMOJI: string[] = " + repr(hot).replace("'", "'"))
    lines.append("")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print(f"已写入 {OUT}（{os.path.getsize(OUT) / 1024:.1f} KB）", file=sys.stderr)


if __name__ == "__main__":
    import sys

    main()
