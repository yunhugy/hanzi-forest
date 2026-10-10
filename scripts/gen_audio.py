"""
汉字小森林 · 音频包批量生成脚本（含自动重试）
  音色：zh-CN-XiaoyiNeural（微软晓伊，温柔女声，适合儿童）
  语速：-10%（比正常稍慢，让孩子听清每个字）
  输出：
    assets/audio/chars/<char>.mp3  ── 612 个单字
    assets/audio/words/<word>.mp3  ── 192 个词语
    src/data/audio-manifest.json   ── 前端用的清单
"""

import asyncio, json, os, sys, time
from pathlib import Path

import edge_tts

VOICE   = "zh-CN-XiaoyiNeural"
RATE    = "-10%"
RETRIES = 3       # 超时失败时最多重试次数
CONCURRENCY = 4   # 并发限制（低一点更稳定）

ROOT      = Path(__file__).parent.parent
CHARS_DIR = ROOT / "assets" / "audio" / "chars"
WORDS_DIR = ROOT / "assets" / "audio" / "words"
DATA_DIR  = ROOT / "src" / "data"

CHARS_DIR.mkdir(parents=True, exist_ok=True)
WORDS_DIR.mkdir(parents=True, exist_ok=True)

sem = asyncio.Semaphore(CONCURRENCY)

async def synth(text: str, path: Path) -> bool:
    """合成单条，已有且非空文件跳过。含重试逻辑。"""
    if path.exists() and path.stat().st_size > 0:
        return False
    for attempt in range(1, RETRIES + 1):
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE)
            await comm.save(str(path))
            return True
        except Exception as e:
            if attempt == RETRIES:
                print(f"  ⚠️  [{attempt}/{RETRIES}] {text} 最终失败: {e}", flush=True)
                return False
            wait = attempt * 2
            print(f"  🔄  [{attempt}/{RETRIES}] {text} 重试（等 {wait}s）: {e}", flush=True)
            await asyncio.sleep(wait)
    return False

async def main():
    with open(DATA_DIR / "hanzi600.json", encoding="utf-8") as f:
        chars = json.load(f)
    with open(DATA_DIR / "words.json", encoding="utf-8") as f:
        words = json.load(f)

    total   = len(chars) + len(words)
    done    = 0
    new_gen = 0
    t0      = time.time()

    print(f"▶ 共 {len(chars)} 个单字 + {len(words)} 个词语 = {total} 条", flush=True)
    print(f"  音色：{VOICE}  语速：{RATE}", flush=True)
    print("─" * 50, flush=True)

    manifest_chars: dict[str, str] = {}
    manifest_words: dict[str, str] = {}

    async def do_char(item):
        nonlocal done, new_gen
        char = item["char"]
        out  = CHARS_DIR / f"{char}.mp3"
        async with sem:
            is_new = await synth(char, out)
        done += 1
        if is_new:
            new_gen += 1
        if done % 50 == 0 or done == total:
            print(f"  [{done}/{total}] 新生成 {new_gen} 条，耗时 {time.time()-t0:.0f}s", flush=True)
        return char, f"chars/{char}.mp3"

    async def do_word(item):
        nonlocal done, new_gen
        word = item["word"]
        out  = WORDS_DIR / f"{word}.mp3"
        async with sem:
            is_new = await synth(word, out)
        done += 1
        if is_new:
            new_gen += 1
        if done % 50 == 0 or done == total:
            print(f"  [{done}/{total}] 新生成 {new_gen} 条，耗时 {time.time()-t0:.0f}s", flush=True)
        return word, f"words/{word}.mp3"

    print("【单字】", flush=True)
    results = await asyncio.gather(*[do_char(c) for c in chars])
    for k, v in results:
        manifest_chars[k] = v

    print("【词语】", flush=True)
    results = await asyncio.gather(*[do_word(w) for w in words])
    for k, v in results:
        manifest_words[k] = v

    # ─── 生成清单 ───
    manifest = {"chars": manifest_chars, "words": manifest_words}
    mp = DATA_DIR / "audio-manifest.json"
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # ─── 统计 ───
    char_files = list(CHARS_DIR.glob("*.mp3"))
    word_files = list(WORDS_DIR.glob("*.mp3"))
    char_size  = sum(f.stat().st_size for f in char_files)
    word_size  = sum(f.stat().st_size for f in word_files)

    elapsed = time.time() - t0
    print("─" * 50, flush=True)
    print(f"✅ 完成！新生成 {new_gen} 条，共耗时 {elapsed:.0f}s", flush=True)
    print(f"   chars/  {char_size/1024/1024:.1f} MB（{len(char_files)} 文件）", flush=True)
    print(f"   words/  {word_size/1024/1024:.1f} MB（{len(word_files)} 文件）", flush=True)
    print(f"   总计    {(char_size+word_size)/1024/1024:.1f} MB", flush=True)

    # ─── 哪些字还缺 ───
    expected_chars = {item["char"] for item in chars}
    expected_words = {item["word"] for item in words}
    missing_chars = expected_chars - {f.stem for f in char_files if f.stat().st_size > 0}
    missing_words = expected_words - {f.stem for f in word_files if f.stat().st_size > 0}
    if missing_chars:
        print(f"   ⚠️  仍缺 {len(missing_chars)} 个单字：{sorted(missing_chars)[:20]}...", flush=True)
    if missing_words:
        print(f"   ⚠️  仍缺 {len(missing_words)} 个词语：{sorted(missing_words)[:10]}...", flush=True)
    if not missing_chars and not missing_words:
        print("   🎉 全部生成完毕，零缺漏！", flush=True)

asyncio.run(main())
