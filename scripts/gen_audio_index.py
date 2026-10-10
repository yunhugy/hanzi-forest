"""
生成 src/data/char-audio.ts 和 src/data/word-audio.ts 两个 require() 映射文件。
Metro bundler 要求 require() 路径必须是静态字符串，不能动态拼接，
所以我们要生成一个大的 Record，让打包器把每个 mp3 都纳入 bundle。
"""

import json
from pathlib import Path

ROOT      = Path(__file__).parent.parent
DATA_DIR  = ROOT / "src" / "data"
CHARS_DIR = ROOT / "assets" / "audio" / "chars"
WORDS_DIR = ROOT / "assets" / "audio" / "words"

# ─── 1. char-audio.ts ───
with open(DATA_DIR / "hanzi600.json", encoding="utf-8") as f:
    chars = json.load(f)
with open(DATA_DIR / "hanzi-pictured.json", encoding="utf-8") as f:
    pictured = json.load(f)

# 所有出现在字库里的字（含看图识字）
all_chars = {item["char"] for item in chars} | {item["char"] for item in pictured}

lines_char = ["/* eslint-disable */",
              "// 本文件由 scripts/gen_audio_index.py 自动生成，请勿手改。",
              "// 音频位于 assets/audio/chars/<字>.mp3",
              "",
              "export const CHAR_AUDIO: Record<string, number> = {"]

for char in sorted(all_chars):
    mp3 = CHARS_DIR / f"{char}.mp3"
    if mp3.exists() and mp3.stat().st_size > 0:
        lines_char.append(f"  '{char}': require('../../assets/audio/chars/{char}.mp3'),")

lines_char.append("};")
lines_char.append("")
lines_char.append("/** 取某个字的本地音频资源；没有就返回 undefined，由调用方降级到系统 TTS */")
lines_char.append("export function audioOf(char: string): number | undefined {")
lines_char.append("  return CHAR_AUDIO[char];")
lines_char.append("}")
lines_char.append("")

out = DATA_DIR / "char-audio.ts"
out.write_text("\n".join(lines_char), encoding="utf-8")
print(f"✅ char-audio.ts  ({len([l for l in lines_char if 'require' in l])} 条)")

# ─── 2. word-audio.ts ───
with open(DATA_DIR / "words.json", encoding="utf-8") as f:
    words = json.load(f)

lines_word = ["/* eslint-disable */",
              "// 本文件由 scripts/gen_audio_index.py 自动生成，请勿手改。",
              "// 音频位于 assets/audio/words/<词>.mp3",
              "",
              "export const WORD_AUDIO: Record<string, number> = {"]

for item in words:
    word = item["word"]
    mp3  = WORDS_DIR / f"{word}.mp3"
    if mp3.exists() and mp3.stat().st_size > 0:
        lines_word.append(f"  '{word}': require('../../assets/audio/words/{word}.mp3'),")

lines_word.append("};")
lines_word.append("")
lines_word.append("/** 取某个词语的本地音频资源；没有就返回 undefined，由调用方降级到系统 TTS */")
lines_word.append("export function wordAudioOf(word: string): number | undefined {")
lines_word.append("  return WORD_AUDIO[word];")
lines_word.append("}")
lines_word.append("")

out = DATA_DIR / "word-audio.ts"
out.write_text("\n".join(lines_word), encoding="utf-8")
print(f"✅ word-audio.ts  ({len([l for l in lines_word if 'require' in l])} 条)")
