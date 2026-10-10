import json
from pathlib import Path

ROOT      = Path(__file__).parent.parent
DATA_DIR  = ROOT / 'src' / 'data'
CHARS_DIR = ROOT / 'assets' / 'audio' / 'chars'
WORDS_DIR = ROOT / 'assets' / 'audio' / 'words'

def to_char_hex(char: str) -> str:
    return f'{ord(char):04x}'

def to_word_hex(word: str) -> str:
    return '_'.join(f'{ord(c):04x}' for c in word)

with open(DATA_DIR / 'hanzi600.json', encoding='utf-8') as f:
    chars = json.load(f)
with open(DATA_DIR / 'hanzi-pictured.json', encoding='utf-8') as f:
    pictured = json.load(f)

all_chars = {item['char'] for item in chars} | {item['char'] for item in pictured}

lines_char = [
    '/* eslint-disable */',
    '// 本文件由 scripts/gen_audio_index.py 自动生成，请勿手改。',
    '// 采用 c_<hex>.mp3 的 ASCII 命名，确保 Android AAPT2 资源安全，杜绝重名死锁。',
    '',
    'export const CHAR_AUDIO: Record<string, number> = {'
]

for char in sorted(all_chars):
    filename = f'c_{to_char_hex(char)}.mp3'
    mp3 = CHARS_DIR / filename
    if mp3.exists() and mp3.stat().st_size > 0:
        lines_char.append(f"  '{char}': require('../../assets/audio/chars/{filename}'),")

lines_char.append('};')
lines_char.append('')
lines_char.append('export function audioOf(char: string): number | undefined {')
lines_char.append('  return CHAR_AUDIO[char];')
lines_char.append('}')
lines_char.append('')

(DATA_DIR / 'char-audio.ts').write_text('\n'.join(lines_char), encoding='utf-8')

with open(DATA_DIR / 'words.json', encoding='utf-8') as f:
    words = json.load(f)

lines_word = [
    '/* eslint-disable */',
    '// 本文件由 scripts/gen_audio_index.py 自动生成，请勿手改。',
    '// 采用 w_<hex>.mp3 的 ASCII 命名，确保 Android AAPT2 资源安全，杜绝重名死锁。',
    '',
    'export const WORD_AUDIO: Record<string, number> = {'
]

for item in words:
    word = item['word']
    filename = f'w_{to_word_hex(word)}.mp3'
    mp3  = WORDS_DIR / filename
    if mp3.exists() and mp3.stat().st_size > 0:
        lines_word.append(f"  '{word}': require('../../assets/audio/words/{filename}'),")

lines_word.append('};')
lines_word.append('')
lines_word.append('export function wordAudioOf(word: string): number | undefined {')
lines_word.append('  return WORD_AUDIO[word];')
lines_word.append('}')
lines_word.append('')

(DATA_DIR / 'word-audio.ts').write_text('\n'.join(lines_word), encoding='utf-8')
print('Index scripts updated!')
