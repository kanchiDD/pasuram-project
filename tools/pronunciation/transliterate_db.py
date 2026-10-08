"""
transliterate_db.py

Offline converter: Tamil source tables -> text_script rows in other
scripts. Runs on your machine, NOT in the browser — users only ever
fetch finished text, so page load cost is unchanged.

Only rows whose Tamil has actually changed are re-converted (hash
comparison), so a run after a few edits takes seconds. Hand-corrected
rows (is_locked = 1) are never overwritten; if their Tamil changes
they are flagged needs_review instead.

────────────────────────────────────────────────────────────────
WORKFLOW
────────────────────────────────────────────────────────────────
  1. Export D1 to a local file:
         wrangler d1 export <DB_NAME> --output=naal.sqlite --remote
  2. Apply the schema once (first run only):
         wrangler d1 execute <DB_NAME> --remote --file=text_script_schema.sql
     ...and to your local copy so the script can read existing rows:
         sqlite3 naal.sqlite < text_script_schema.sql
  3. See what the database actually holds (converts nothing):
         python transliterate_db.py naal.sqlite --list
  4. Convert:
         python transliterate_db.py naal.sqlite --scripts te,kn,ml,deva,iast --out out.sql
     Pronunciation rules apply by themselves to the lines listed in
     phonetic_scope.txt, using the reviewed word junctions in junctions.txt.
     Keep both files next to this script (and in git). If either is missing
     the run stops, so reviewed lines are never converted back by accident.
  5. Load the result back:
         wrangler d1 execute <DB_NAME> --remote --file=out.sql

Which tables get converted is NOT a list kept in this file. Every table
and column in the database is examined, and any column found to contain
Tamil is converted. Columns holding English notes, slugs, urls, ids or
already-converted text have no Tamil in them and are passed over by
themselves, so no table can be accidentally left out.

Run --list first and read the report. Then start with ONE script and
ONE table (--only) and have someone who reads that script check the
output before doing the rest.

────────────────────────────────────────────────────────────────
SETUP
────────────────────────────────────────────────────────────────
    pip install aksharamukha

Note on accuracy: thaniyan/sloka text using the subscript-digit
convention (த₄, க₃ ...) and grantha letters carries the voicing and
aspiration information Tamil script normally drops, so it converts
faithfully. Pure Tamil verse is harder — expect a small number of
lines to need hand correction, which is what is_locked is for.
"""

import argparse
import hashlib
import os
import re
import sqlite3
import sys
import unicodedata

try:
    from aksharamukha import transliterate
except ImportError:
    print("Needs the aksharamukha package:  pip install aksharamukha", file=sys.stderr)
    sys.exit(1)


# ── Target scripts: our short code -> Aksharamukha's name ────────────
SCRIPTS = {
    "te":   "Telugu",
    "kn":   "Kannada",
    "ml":   "Malayalam",
    "deva": "Devanagari",
    "iast": "IAST",          # romanisation, useful for overseas readers
    "gu":   "Gujarati",
    "bn":   "Bengali",
}

# Source script. Tested on real pasuram AND thaniyan/sloka text (with
# grantha letters and the subscript-digit convention): "Tamil" round-trips
# at 100%, while "TamilGrantha" scored far worse. Do not change without
# re-running the self-check.
DEFAULT_SOURCE = "Tamil"


# ── What to convert ──────────────────────────────────────────────────
# Nothing is hand-listed any more. The database itself is asked what it
# holds: every table, every column, and for each column whether it
# actually contains Tamil characters. A column of English notes, an
# internal slug, a URL, an id or a column already holding Telugu simply
# has no Tamil in it and is passed over on its own — no judgement call
# and no table can be forgotten.
#
# Run with --list first to see exactly what was found before converting.

# Infrastructure and personal data. Everything else is fair game.
SKIP_TABLES = {
    "text_script",          # our own output
    "text_pair",            # overlay worker's store (legacy)

    # Personal data — never converted, and never exported either. A recital
    # plan carries a name its owner typed, so these are people's words, not
    # the corpus.
    "user_master",          # registered users
    "user_recital_item",
    "user_recital_plan",
    "ghoshti_session",      # transient session state

    # Superseded copies. They hold real Tamil, so without this the scanner
    # finds them and converts dead text into text_script rows that no reader
    # will ever see — work spent, and a second set of rows to confuse anyone
    # reading the table later.
    "author_master_backup",
    "pasuram_master_backup",
    "sattrumurai_master_backup",
    "sattrumurai_sequence_backup",
    "backup_azhwar_amsam",
    "backup_azhwar_birth",
    "backup_azhwar_divyadesam_map",
    "temp_thaniyan_update",

    # Already translated, one row per language, and served by its lang
    # column (handleIndex) — never through text_script. Converting it only
    # mistook stray Tamil letters inside the translations for Tamil text.
    "page_content_master",
}

# The FTS index's own storage (search_sugg_names_data, _idx, _content ...).
# Real tables, meaningless without the virtual table that owns them, and D1
# will not export that. Matched by prefix so a future index is covered too.
SKIP_PREFIXES = ("sqlite_", "_cf", "d1_", "search_sugg_")

# Columns never worth converting even if Tamil somehow appears in them.
SKIP_COLS = {"src_hash", "ta_hash", "audio_url", "created_at", "updated_at",
             "line1", "line2", "line3", "line4", "line5", "line6", "line7", "line8"}

# ── src_key compatibility ────────────────────────────────────────────
# The 37,448 rows already in text_script were written with these key
# columns. The declared PRIMARY KEY of a table is not always the same
# thing (fixed_text_line_master is keyed here on fixed_id|line_no, for
# instance). Pinning them guarantees a re-run UPDATES those rows rather
# than inserting a second, differently-keyed copy alongside them.
# Any table NOT listed here gets its key from the schema's PRIMARY KEY,
# falling back to rowid.
LEGACY_PK = {
    "pasuram_line_master":           ["id"],
    "thaniyan_line_master":          ["line_id"],
    "thiruvezhukootrarikkai_master": ["id"],
    "fixed_text_line_master":        ["fixed_id", "line_no"],
    "vazhi_thirunamam_line_master":  ["vazhi_id", "vazhi_group", "line_no"],
    "madal_unit_master":             ["id"],
    "section_master":                ["section_id"],
    "section_closing_master":        ["section_id"],
    "pathu_master":                  ["pathu_id"],
    "thirumozhi_master":             ["thirumozhi_id"],
    "prosody_master":                ["prosody_id"],
    "thaniyan_master":               ["thaniyan_id"],
    "madal_master":                  ["madal_id"],
    "fixed_text_master":             ["fixed_id"],
    "sattrumurai_master":            ["sattrumurai_id"],
    "thousands_master":              ["thousand_id"],
    "azhwar_master":                 ["azhwar_id"],
    "author_master":                 ["author_id"],
    "acharya_master":                ["acharya_id"],
    "global_display_master":         ["id"],
    "munnadi_pinnadi_master":        ["id"],
    "nithyanusandhanam_sequence":    ["id"],
    "recital_master":                ["recital_id"],
    "veda_master":                   ["veda_id"],
    "ui_text_master":                ["ui_key"],
}

TAMIL_RE = re.compile(r"[஀-௿]")


def has_tamil(v):
    return bool(v) and isinstance(v, str) and bool(TAMIL_RE.search(v))


def qi(name):
    """Quote an identifier, so a column called 'order' or 'group' is safe."""
    return '"' + str(name).replace('"', '""') + '"'


def discover(conn, exclude=()):
    """Ask the database what it holds.

    Returns {table: (pk_cols, [text_cols], row_count)} for every table with
    at least one column containing Tamil.
    """
    conn.create_function("has_tamil", 1, has_tamil)
    plan = {}

    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]

    for t in tables:
        if t in SKIP_TABLES or t in exclude or t.startswith(SKIP_PREFIXES):
            continue

        info = list(conn.execute(f"PRAGMA table_info({qi(t)})"))
        if not info:
            continue
        # PRAGMA table_info columns: cid, name, type, notnull, dflt_value, pk
        pk = [r[1] for r in sorted((r for r in info if r[5]), key=lambda r: r[5])]
        pk = LEGACY_PK.get(t) or pk or ["rowid"]

        text_cols = []
        for r in info:
            col = r[1]
            if col in pk or col in SKIP_COLS:
                continue
            try:
                hit = conn.execute(
                    f"SELECT 1 FROM {qi(t)} WHERE has_tamil({qi(col)}) LIMIT 1"
                ).fetchone()
            except sqlite3.OperationalError:
                continue
            if hit:
                text_cols.append(col)

        if text_cols:
            n = conn.execute(f"SELECT COUNT(*) FROM {qi(t)}").fetchone()[0]
            plan[t] = (pk, text_cols, n)

    return plan


# ── Round-trip self-check ────────────────────────────────────────────
# Convert back to Tamil and compare. Differences are auto-classified;
# only genuinely unknown ones are ever reported to a human.
SUB = "₀₁₂₃₄₅₆₇₈₉"
SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹"

# Sounds a target script cannot write apart, so a round trip through it
# merges them. Folding them here keeps the self-check about real losses.
#
#   Gujarati, Bengali  no short e/o: எ ஒ ெ ொ are written long, and come
#                      back as ஏ ஓ ே ோ.
#   Bengali            no va: வ is written ব and comes back as ப³, the
#                      same as Sanskrit ba (ப₃). And ய after a vowel is
#                      written য় and comes back as ஃய.
SHORT_EO = (("எ", "ஏ"), ("ஒ", "ஓ"), ("\u0bca", "\u0bcb"), ("\u0bc6", "\u0bc7"))
FOLD_BY_TARGET = {
    "Gujarati": SHORT_EO,
    "Bengali":  SHORT_EO + (("\u0b83ய", "ய"),),
}
FOLD_VA_AS_BA = {"Bengali"}

def _canon(s, target=None):
    """Strip differences that are notation, not sound."""
    s = unicodedata.normalize("NFC", s)
    # Before the ꞉ -> ஃ fold below, so only a real ஃ is touched.
    for a, b in FOLD_BY_TARGET.get(target, ()):
        s = s.replace(a, b)
    # The notation marks below are spelling, not sound: the vocalic
    # marker, the three apostrophes that stand in for it, and every
    # script's avagraha (which travels as a placeholder — see
    # pre_notation). Stripping them keeps this comparison about sounds.
    # "(அ)" is how the engine spells an avagraha on the way back to Tamil.
    for ch in ("\u200c", "\u200d", "\u02bc", "'", "\u2019", "\u2018", "(அ)",
               "\ue000", "\ue001",
               "\u093d", "\u0c3d", "\u0cbd", "\u0d3d", "\u0abd", "\u09bd"):
        s = s.replace(ch, "")
    for a, b in zip(SUP, SUB):            # ³ and ₃ are the same marking
        s = s.replace(a, b)
    if target in FOLD_VA_AS_BA:
        # The marking sits after the vowel sign or virama: வா -> பா₃.
        s = re.sub("வ([\u0bbe-\u0bcd]?)", "ப\\1₃", s)
    s = s.replace("ன", "ந")               # Tamil's two n-letters
    s = s.replace("ஶ", "ஸ")               # both spell śa
    # ஆய்தம் (ஃ) IS carried correctly by every target script (as visarga);
    # it merely returns in a different notation. Not an error.
    s = s.replace("\ua789", "ஃ").replace("ः", "ஃ").replace("ః", "ஃ")
    s = s.replace("ௐ", "ஓம்")             # the ōm sign and its spelling
    s = s.replace("॥", ".").replace("।", ".")
    s = s.replace("||", ".").replace("|", ".")   # the IAST stand-ins
    while ".." in s:
        s = s.replace("..", ".")
    return re.sub(r"\s+", " ", s).strip()

def roundtrip_ok(src_text, converted, source, target):
    """(ok, back_in_tamil) — ok means every sound survived."""
    try:
        back = transliterate.process(target, source, converted)
    except Exception:
        return False, "(could not convert back)"
    return _canon(src_text, target) == _canon(back, target), back


# Tamil digits easily mistyped for the letters they resemble.
TAMIL_DIGITS = {
    "\u0be7": ("௧", "க"), "\u0be8": ("௨", "உ"), "\u0be9": ("௩", "ங"),
    "\u0bea": ("௪", "ச"), "\u0beb": ("௫", "ரு"), "\u0bec": ("௬", "சு"),
    "\u0bed": ("௭", "எ"), "\u0bee": ("௮", "அ"), "\u0bef": ("௯", "கூ"),
}

def find_digit_typos(text):
    """A Tamil numeral sitting inside a word is almost always a typo."""
    hits = []
    for i, ch in enumerate(text):
        if ch in TAMIL_DIGITS:
            before = text[i - 1] if i else " "
            after = text[i + 1] if i + 1 < len(text) else " "
            if not before.isspace() or not after.isspace():
                hits.append(TAMIL_DIGITS[ch])
    return hits


def norm_hash(text):
    """Hash of the exact source string — any edit changes it."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def sql_quote(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def load_existing(conn):
    """(src_table, src_key, src_col, script) -> (src_hash, is_locked, text)"""
    out = {}
    try:
        cur = conn.execute(
            "SELECT src_table, src_key, src_col, script, src_hash, is_locked, text FROM text_script"
        )
    except sqlite3.OperationalError:
        print("  (text_script not present locally — treating every row as new)")
        return out
    for t, k, c, s, h, locked, text in cur:
        out[(t, k, c, s)] = (h, locked, text)
    return out


def convert(text, source, target):
    return transliterate.process(source, target, text)


# ── Notation Aksharamukha does not read as written ───────────────────
# Three marks in the Sanskrit notation are spelled one way for a Tamil
# reader and another way for the engine. Established by probing the real
# lines against the real engine, not by guesswork:
#
#   vocalic ṛ/ḷ   ரு' -> ருʼ (U+02BC)   gives tṛṇāya  /  तृणाय
#                 The source uses ASCII ' and, in a few rows, ’. The
#                 engine reads neither; it wants the modifier letter.
#                 Unrecognised, it emitted a literal tru'ṇāya.
#
#   visarga       :  -> ꞉ (U+A789)      gives vibhūtiḥ /  विभूतिः
#                 A colon is right on the Tamil page and meaningless to
#                 the engine. ஃ is NOT the answer: it yields correct
#                 Devanagari but IAST ḵ, because the engine reads it as
#                 the āytham — a Tamil letter with a sound — rather than
#                 as a visarga. That is also why ஃ must never be written
#                 into the source: a Tamil reader would pronounce it.
#
#   avagraha      ಽ  -> '  ... then swapped per script AFTER conversion.
#                 Aksharamukha does not recognise an avagraha in Tamil
#                 input under any spelling — all of them passed straight
#                 through, so a borrowed Devanagari ऽ turned up verbatim
#                 inside the Telugu. ASCII ' carries through cleanly and
#                 is already correct for IAST, so it serves as the
#                 placeholder and post_notation finishes the job.
#
# ORDER MATTERS. The vocalic apostrophes must be gone before the
# avagraha takes the ASCII apostrophe, or the two become one character
# and cannot be told apart again.

AVAGRAHA_SRC  = "\u0CBD"      # ಽ  borrowed from Kannada; Tamil has none
VOCALIC_MARK  = "\u02BC"      # ʼ  what the engine reads
AVAGRAHA_HOLD = "'"           # passes through the engine untouched
VISARGA_MARK  = "\uA789"      # ꞉

AVAGRAHA_OUT = {
    "te": "\u0C3D", "kn": "\u0CBD", "ml": "\u0D3D",
    "deva": "\u093D", "iast": "'",
    "gu": "\u0ABD", "bn": "\u09BD",
}

# The colon means visarga only in Sanskrit. Everywhere else it is
# ordinary punctuation and must be left alone. Add a table here if
# Sanskrit lines live in it too.
SANSKRIT_TABLES = {"thaniyan_line_master"}

# The vocalic marker is an apostrophe right after ரு / லு (ரூ / லூ):
# த்ரு'ணாய. Any OTHER apostrophe is a quotation mark — 'வரவேண்டா' — and
# must stay one. Read as the vocalic marker after a vowel sign, it changed
# the vowel (வேண்டா' came out as వేంటొ / veṇṭô). Quotation marks travel
# through the engine as private placeholders and are put back afterwards.
VOCALIC_RE = re.compile("(?<=[\u0bb0\u0bb2][\u0bc1\u0bc2])['\u2019]")
QUOTE_HOLD = (("'", "\ue000"), ("\u2019", "\ue001"))


def pre_notation(text, table):
    """Rewrite the notation into the spelling the engine understands."""
    text = VOCALIC_RE.sub(VOCALIC_MARK, text)
    for quote, hold in QUOTE_HOLD:
        text = text.replace(quote, hold)
    text = text.replace(AVAGRAHA_SRC, AVAGRAHA_HOLD)
    if table in SANSKRIT_TABLES:
        text = text.replace(":", VISARGA_MARK)
    return text


def post_notation(out, sc):
    """Give the avagraha placeholder the target script's own mark, and put
    the quotation marks back."""
    out = out.replace(AVAGRAHA_HOLD, AVAGRAHA_OUT.get(sc, AVAGRAHA_HOLD))
    for quote, hold in QUOTE_HOLD:
        out = out.replace(hold, quote)
    return out


# ── Pronunciation (the "sound rules") ───────────────────────────────
# Tamil writes k/g, c/ś/j, ṭ/ḍ, t/d and p/b with one letter each; a reader
# knows which sound from where the letter sits. The other scripts have a
# letter for each sound, so for them the choice is made here, on the Tamil,
# before conversion — and every script inherits the same choice.
#
#   doubled (க்க ச்ச …) or closing (க்)      hard       पावैक्कु
#   after ங் ஞ் ண் ந் ம் ன்                 voiced     नन्द, शिङ्गम्, ञ्ज
#   after ய் ர் ல் வ் ழ் ள்                  voiced     मल्गुम्, शॆय्दु
#   between vowels                           voiced     मदि, पोदुमिनो  (ச → ś)
#   at the start of a word                   hard       (ச → ś; after ஞ் → j;
#                                                        after a stop → c)
#   ற்ற → ट्र,  ன → न
#
# A word written joined to the one before it (எம்பாவாய்) looks like the
# middle of one word, so the junctions file marks where the new word starts:
#   எம்|பாவாய்   — one line per word, reviewed by a reader. It applies
#   wherever that whole word occurs in a line in scope (never inside a
#   longer word).
# Where a reader decided a sound the rules and junctions cannot give
# (நியதமும் → नियतमुम्), the sound words file records it for that one place:
#   8.2   நியதமும்   h   # नियतमुम्
#   pasuram.line, the word, then one letter for each க ச ட த ப of the word
#   that is not followed by ் : h hard, v voiced, s ஶ, j ஜ.
# A name with * in place of pasuram.line applies wherever it occurs (also
# inside a longer word), and a doubled ச் written just before it is dropped:
#   *   சடகோபன்   svvv   # குருகூர்ச் சடகோபன் → कुरुगूर् शडगोबन्
# After ஃ the next k/c/ṭ/t/p is always hard: அஃதே → अःते (Roman aḥte).
# Applied only to the lines named in the scope file (rolled out prabandham
# by prabandham); everything else converts exactly as before.

PH_V = "\u0bcd"; PH_STOPS = "கசடதப"; PH_NASAL = "ஙஞணநமன"; PH_SONOR = "யரலவழள"
PH_VOICED = {"க": "க₃", "ட": "ட₃", "த": "த₃", "ப": "ப₃", "ச": "ஜ"}
PH_VERSION = "phon1"


def load_junctions(path):
    """Words with '|' where a new word starts. Longest first, so a longer
    entry wins over a shorter one inside it."""
    out = []
    for line in open(path, encoding="utf-8"):
        w = line.split("#", 1)[0].strip()
        if "|" in w:
            out.append(w)
    return sorted(set(out), key=lambda w: (-len(w), w))


def load_sound_words(path):
    """{'gno.lno': [(word, codes)]}. Stops on an entry that does not fit its
    word, so a mistyped entry can never quietly do nothing."""
    out, bad = {}, []
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        body = line.split("#", 1)[0].strip()
        if not body:
            continue
        parts = body.split()
        if len(parts) != 3 or not re.fullmatch(r"\d+\.\d+|\*", parts[0]):
            bad.append(f"line {n}: {line.strip()}")
            continue
        place, word, codes = parts
        stops = [ch for i, ch in enumerate(word) if ch in PH_STOPS and word[i + 1:i + 2] != PH_V]
        if len(stops) != len(codes) or set(codes) - set("hvsj") or \
                any(c in "sj" and ch != "ச" for ch, c in zip(stops, codes)):
            bad.append(f"line {n}: {line.strip()}  ({len(stops)} letter(s) to decide)")
            continue
        out.setdefault(place, []).append((word, codes))
    if bad:
        sys.exit("STOPPED: these entries in " + path + " do not fit their word:\n  " + "\n  ".join(bad))
    return out


def load_scope(path):
    """global_no ranges, one per line: 474-503  Thiruppavai"""
    ranges = []
    for line in open(path, encoding="utf-8"):
        m = re.match(r"\s*(\d+)\s*-\s*(\d+)", line.split("#", 1)[0])
        if m:
            ranges.append((int(m.group(1)), int(m.group(2))))
    return ranges


def phonetic_tamil(text, junctions, sound_words=(), names=()):
    """(Tamil with the sounds marked for the engine, junctions and sound
    words that applied). A junction or sound word applies only where it is a
    whole word of the line, never inside a longer word."""
    t = text.replace("\u200c", "").replace("\u200d", "")
    at = {}
    for m in re.finditer(r"\S+", t):
        at.setdefault(m.group(), []).append(m.start())
    starts, used = set(), []
    for j in junctions:
        plain = j.replace("|", "")
        if plain not in at:
            continue
        for k in at[plain]:
            off = 0
            for part in j.split("|")[:-1]:
                off += len(part)
                starts.add(k + off)
        used.append(j)
    # sound words: a reviewed sound for each k/c/ṭ/t/p of the word, in order
    forced = {}
    for w, codes in sound_words:
        for k in at.get(w, []):
            stops = [k + i for i, ch in enumerate(w)
                     if ch in PH_STOPS and w[i + 1:i + 2] != PH_V]
            if len(stops) == len(codes):
                forced.update(zip(stops, codes))
                used.append(w + "=" + codes)
    # names: everywhere; a doubled ச் just before the name is dropped
    drop = set()
    for w, codes in names:
        k = t.find(w)
        hit = False
        while k >= 0:
            stops = [k + i for i, ch in enumerate(w)
                     if ch in PH_STOPS and w[i + 1:i + 2] != PH_V]
            if len(stops) == len(codes):
                forced.update(zip(stops, codes))
                hit = True
                j = k
                while j > 0 and t[j - 1] == " ":
                    j -= 1
                if w[0] == "ச" and t[j - 2:j] == "ச" + PH_V:
                    drop.update((j - 2, j - 1))
            k = t.find(w, k + 1)
        if hit:
            used.append("*" + w + "=" + codes)
    out = []
    for i, ch in enumerate(t):
        if i in drop:
            continue
        if ch not in PH_STOPS:
            out.append(ch); continue
        nxt = t[i + 1] if i + 1 < len(t) else ""
        prev = t[i - 1] if i else " "
        prev2 = t[i - 2] if i > 1 else " "
        if i in forced:
            d = forced[i]
        elif prev == "ஃ":
            d = "h"                       # அஃதே: ஃ is a breath, the next letter is hard
        elif nxt == PH_V:
            d = "h"
        elif i in starts or not prev.strip() or prev in "(\"'‘“-":
            before = t[:i].rstrip()
            if ch != "ச":
                d = "h"
            elif before.endswith(PH_V) and len(before) > 1 and before[-2] in PH_STOPS + "ற":
                d = "h"
            elif before.endswith("ஞ" + PH_V):
                d = "j"
            else:
                d = "s"
        elif prev == PH_V:
            if prev2 == ch:
                d = "h"
            elif prev2 in PH_NASAL:
                d = "j" if ch == "ச" else "v"
            elif prev2 in PH_SONOR:
                d = "s" if ch == "ச" else "v"
            else:
                d = "h"
        else:
            d = "s" if ch == "ச" else "v"
        out.append(PH_VOICED[ch] if d in ("v", "j") else "ஶ" if d == "s" else ch)
    s = "".join(out).replace("ற்ற", "ட்ர").replace("ன", "ந")
    # the voicing mark goes after the vowel sign, the way the thaniyan text
    # writes it (பி₃ not ப₃ி) and the engine writes it back
    s = re.sub("([₁₂₃₄])([\u0bbe-\u0bcc])", "\\2\\1", s)
    return s, used


# ── The danda ────────────────────────────────────────────────────────
# । and ॥ (U+0964, U+0965) are shared punctuation: Telugu, Kannada and
# Malayalam all use the same two characters Devanagari does. Aksharamukha
# keeps them for Devanagari but turns them into full stops for the others,
# so நித்யம்॥ came out as నిత్యం.. — a verse ending in two dots.
#
# Rather than repair that afterwards (a '..' cannot be told from a real
# ellipsis once it is there), the line is split at each danda, the pieces
# are converted, and the marks are put back. A danda sits at a phrase
# boundary, so nothing is lost by converting around it.

DANDA_RE = re.compile("([\u0964\u0965])")

# What each target writes for (single, double). The Indic scripts keep the
# marks themselves; IAST has no danda, and | and || are the usual scholarly
# stand-ins. Change the iast pair here if you prefer . and ..
DANDA_OUT = {
    "te":   ("\u0964", "\u0965"),
    "kn":   ("\u0964", "\u0965"),
    "ml":   ("\u0964", "\u0965"),
    "deva": ("\u0964", "\u0965"),
    "iast": ("|", "||"),
    "gu":   ("\u0964", "\u0965"),
    "bn":   ("\u0964", "\u0965"),
}


def convert_keeping_danda(text, source, target, sc):
    """convert(), but the verse marks survive as verse marks."""
    single, double = DANDA_OUT.get(sc, ("\u0964", "\u0965"))
    out = []
    for part in DANDA_RE.split(text):
        if part == "\u0964":
            out.append(single)
        elif part == "\u0965":
            out.append(double)
        elif part:
            out.append(convert(part, source, target))
    return "".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("db", help="local SQLite export of the D1 database")
    ap.add_argument("--scripts", default="te",
                    help="comma-separated target scripts: " + ",".join(SCRIPTS))
    ap.add_argument("--source", default=DEFAULT_SOURCE,
                    help=f"Aksharamukha source script (default: {DEFAULT_SOURCE})")
    ap.add_argument("--only", help="convert just this one table (for a first trial)")
    ap.add_argument("--exclude", default="",
                    help="comma-separated tables to leave out")
    ap.add_argument("--list", action="store_true",
                    help="show what the database holds and exit, converting nothing")
    ap.add_argument("--no-verify", action="store_true",
                    help="skip the round-trip self-check (about 3x faster)")
    ap.add_argument("--out", default="text_script_out.sql", help="SQL file to write")
    ap.add_argument("--limit", type=int, help="stop after N rows per table (sampling)")
    ap.add_argument("--recheck-quotes", action="store_true",
                    help="also re-convert unchanged lines that contain an apostrophe, "
                         "and write only those whose conversion comes out different "
                         "(after the quotation-mark fix)")
    ap.add_argument("--no-phonetic", action="store_true",
                    help="switch the sound rules OFF. Lines in phonetic_scope.txt are then "
                         "converted letter-for-letter again — only for a deliberate rollback")
    ap.add_argument("--phonetic", action="store_true",
                    help="(no longer needed: the sound rules are on automatically)")
    ap.add_argument("--junctions", default="junctions.txt")
    ap.add_argument("--scope", default="phonetic_scope.txt")
    ap.add_argument("--sound-words", default="sound_words.txt")
    ap.add_argument("--pairs", metavar="FILE",
                    help="also write Tamil->converted pairs for the overlay worker "
                         "(legacy — not needed once the API worker reads text_script)")
    args = ap.parse_args()

    targets = [s.strip() for s in args.scripts.split(",") if s.strip()]
    for s in targets:
        if s not in SCRIPTS:
            print(f"Unknown script '{s}'. Known: {', '.join(SCRIPTS)}", file=sys.stderr)
            sys.exit(1)

    conn = sqlite3.connect(args.db)
    conn.text_factory = str

    # ── Ask the database what it holds ──────────────────────────────
    exclude = {t.strip() for t in args.exclude.split(",") if t.strip()}
    print("Scanning the schema for Tamil ...")
    plan = discover(conn, exclude=exclude)

    if args.only:
        if args.only not in plan:
            print(f"'{args.only}' holds no Tamil, or was excluded. "
                  f"Run with --list to see what was found.", file=sys.stderr)
            sys.exit(1)
        plan = {args.only: plan[args.only]}

    total_cells = sum(n * len(cols) for _, cols, n in plan.values())
    print(f"\n{len(plan)} table(s) hold Tamil "
          f"— {total_cells:,} cells x {len(targets)} script(s)\n")
    for t in sorted(plan):
        pk, cols, n = plan[t]
        legacy = "  (key pinned)" if t in LEGACY_PK else ""
        print(f"  {t:34s} {n:>7,} rows  key={'|'.join(pk):<28s} {', '.join(cols)}{legacy}")

    if args.list:
        print("\n--list given: nothing converted.")
        return

    existing = load_existing(conn)

    # ── Pronunciation: ON automatically. Its two files are the record of the
    #    reviewed work, so a run without them stops rather than quietly
    #    converting those lines back letter-for-letter.
    phon_ids, junctions, sound_words, place_of = set(), [], {}, {}
    here = os.path.dirname(os.path.abspath(__file__))
    def find(name):
        for d in (os.getcwd(), here):
            p = os.path.join(d, name)
            if os.path.isfile(p):
                return p
        return None
    scope_path, junc_path, sw_path = find(args.scope), find(args.junctions), find(args.sound_words)
    if args.no_phonetic:
        print("Pronunciation: OFF (--no-phonetic). Lines in the scope will be converted "
              "letter-for-letter again.\n")
    else:
        if not scope_path or not junc_path or not sw_path:
            missing = [n for n, p_ in ((args.scope, scope_path), (args.junctions, junc_path),
                                       (args.sound_words, sw_path)) if not p_]
            sys.exit("STOPPED: " + " and ".join(missing) + " not found next to the converter.\n"
                     "They hold the pronunciation scope and your reviewed decisions; without them\n"
                     "the reviewed lines would be converted back letter-for-letter.\n"
                     "Put them back (they are in your site's git repo), or run with --no-phonetic\n"
                     "only if you really mean to switch the sound rules off.")
        junctions = load_junctions(junc_path)
        sound_words = load_sound_words(sw_path)
        for a, b in load_scope(scope_path):
            for r in conn.execute("SELECT id, global_no, line_no FROM pasuram_line_master "
                                  "WHERE global_no BETWEEN ? AND ?", (a, b)):
                phon_ids.add(str(r[0]))
                place_of[str(r[0])] = f"{r[1]}.{r[2]}"
        n_sw = sum(len(v) for p_, v in sound_words.items() if p_ != "*")
        n_names = len(sound_words.get("*", ()))
        print(f"Pronunciation: ON — {len(phon_ids):,} pasuram lines in scope, "
              f"{len(junctions)} junctions, {n_sw} sound words, {n_names} name(s)\n"
              f"  ({scope_path}, {junc_path}, {sw_path})\n")
    n_phon = 0
    sw_used = set()

    stmts, n_new, n_changed, n_skip, n_locked = [], 0, 0, 0, 0
    n_requoted = n_requote_same = 0
    vocalic_outside = []        # ரு' / லு' outside the sloka table: check by eye
    pairs = {}          # (script, tamil) -> converted, for --pairs
    n_verified = n_review = 0
    review = []
    data_issues = []
    seen_data = set()

    for table, (pk_cols, text_cols, _n) in plan.items():
        cols = pk_cols + text_cols
        try:
            rows = conn.execute(
                f"SELECT {', '.join(qi(c) for c in cols)} FROM {qi(table)}"
            ).fetchall()
        except sqlite3.OperationalError as e:
            print(f"  !! skipping {table}: {e}")
            continue

        if args.limit:
            rows = rows[:args.limit]
        print(f"{table}: {len(rows)} rows")

        for row in rows:
            key = "|".join("" if v is None else str(v) for v in row[:len(pk_cols)])
            for ci, col in enumerate(text_cols):
                src = row[len(pk_cols) + ci]
                if not src or not str(src).strip():
                    continue
                src = str(src)
                # A discovered column can be mixed — Tamil in some rows, a
                # slug or a number in others. Only Tamil is converted.
                if not has_tamil(src):
                    continue
                h = norm_hash(src)
                engine_src = src
                if phon_ids and table == "pasuram_line_master" and key in phon_ids:
                    place = place_of[key]
                    engine_src, used = phonetic_tamil(src, junctions, sound_words.get(place, ()),
                                                      sound_words.get("*", ()))
                    sw_used.update((place, u) for u in used if "=" in u)
                    # the rules and the junctions that apply are part of what was
                    # converted, so a change to either re-converts this line
                    h = norm_hash(PH_VERSION + "|" + "|".join(sorted(used)) + "|" + src)
                    n_phon += 1

                has_quote = "'" in src or "\u2019" in src
                if args.recheck_quotes and table not in SANSKRIT_TABLES and VOCALIC_RE.search(src):
                    vocalic_outside.append((table, key, col, src))
                for sc in targets:
                    prev = existing.get((table, key, col, sc))
                    recheck = False
                    if prev:
                        prev_hash, locked, prev_text = prev
                        if prev_hash == h and not (args.recheck_quotes and has_quote and not locked):
                            n_skip += 1
                            continue                       # unchanged
                        recheck = prev_hash == h
                        if locked:
                            # Hand-corrected: never clobber. Flag for a human.
                            stmts.append(
                                f"UPDATE text_script SET needs_review=1 WHERE "
                                f"src_table={sql_quote(table)} AND src_key={sql_quote(key)} "
                                f"AND src_col={sql_quote(col)} AND script={sql_quote(sc)};"
                            )
                            n_locked += 1
                            continue
                        if not recheck:
                            n_changed += 1
                    else:
                        n_new += 1

                    try:
                        # What the engine sees, and what comes back out.
                        prepped = pre_notation(engine_src, table)
                        out = post_notation(
                            convert_keeping_danda(
                                prepped, args.source, SCRIPTS[sc], sc), sc)
                        if sc == "iast" and engine_src is not src:
                            out = out.replace("ḵ", "ḥ")      # ஃ: aḥte, not aḵte
                    except Exception as e:
                        print(f"  !! convert failed {table}/{key}/{col}/{sc}: {e}")
                        continue

                    if recheck:
                        if out == prev_text:
                            n_requote_same += 1
                            n_skip += 1
                            continue                       # already right
                        n_requoted += 1

                    pairs[(sc, src)] = out

                    typos = find_digit_typos(src)
                    if typos:
                        dk = (table, key, col)
                        if dk not in seen_data:
                            seen_data.add(dk)
                            data_issues.append((table, key, col, src, typos))

                    if args.no_verify:
                        pass
                    else:
                        # Compare against what the engine was given, not the
                        # stored Tamil — otherwise every notation rewrite
                        # reads as a difference.
                        ok, back = roundtrip_ok(prepped, out, args.source, SCRIPTS[sc])
                        if ok:
                            n_verified += 1
                        elif typos:
                            n_verified += 1  # faulty SOURCE, already listed above
                        else:
                            n_review += 1
                            review.append((table, key, col, sc, src, back, out))

                    stmts.append(
                        "INSERT INTO text_script "
                        "(src_table, src_key, src_col, script, text, src_hash, updated_at) VALUES ("
                        f"{sql_quote(table)}, {sql_quote(key)}, {sql_quote(col)}, "
                        f"{sql_quote(sc)}, {sql_quote(out)}, {sql_quote(h)}, datetime('now')) "
                        "ON CONFLICT(src_table, src_key, src_col, script) DO UPDATE SET "
                        "text=excluded.text, src_hash=excluded.src_hash, "
                        "needs_review=0, updated_at=excluded.updated_at;"
                    )

    if phon_ids and args.only in (None, "pasuram_line_master") and not args.limit:
        unused = [f"{p}  {w}  {c}" for p, lst in sorted(sound_words.items()) if p != "*"
                  for w, c in lst if (p, w + "=" + c) not in sw_used]
        if unused:
            sys.exit("STOPPED (nothing written): these sound words were not found in their line,\n"
                     "or the line is not in phonetic_scope.txt. Check the place and the word:\n  "
                     + "\n  ".join(unused))
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("-- generated by transliterate_db.py\n")
        f.write("\n".join(stmts))
        f.write("\n")

    # ── Review report: ONLY lines the self-check could not explain ──
    # Everything here is shown as Tamil vs Tamil, so no knowledge of the
    # target script is needed to judge it.
    if review:
        rp = args.out.rsplit(".", 1)[0] + "_REVIEW.txt"
        with open(rp, "w", encoding="utf-8") as f:
            f.write("Lines whose sounds did not survive the round trip.\n")
            f.write("Compare the two Tamil lines. If they say the same thing, it is fine.\n")
            f.write("=" * 66 + "\n\n")
            for tbl, key, col, sc, orig, back, conv in review:
                f.write(f"{tbl}  {key}  {col}  -> {sc}\n")
                f.write(f"  your Tamil : {orig}\n")
                f.write(f"  came back  : {back}\n")
                try:
                    f.write(f"  sounds like: {transliterate.process(SCRIPTS[sc], 'IAST', conv)}\n")
                except Exception:
                    pass
                f.write("\n")
        print(f"\n  {len(review)} line(s) need a human look -> {rp}")
    elif args.no_verify:
        print("\n  Self-check skipped (--no-verify).")
    else:
        print("\n  Self-check: every converted line came back identical. Nothing to review.")

    if args.pairs:
        with open(args.pairs, "w", encoding="utf-8") as f:
            f.write("-- Tamil -> converted pairs for the overlay worker\n")
            for (sc, ta), out in pairs.items():
                f.write("INSERT INTO text_pair (script, ta_hash, ta_text, out_text) VALUES ("
                        f"{sql_quote(sc)}, {sql_quote(norm_hash(ta))}, {sql_quote(ta)}, {sql_quote(out)}) "
                        "ON CONFLICT(script, ta_hash) DO UPDATE SET "
                        "ta_text=excluded.ta_text, out_text=excluded.out_text;\n")
        print(f"  wrote {len(pairs)} text pairs to {args.pairs}")

    # ── Faults in the Tamil SOURCE — separate from conversion quality ──
    if data_issues:
        dp = args.out.rsplit(".", 1)[0] + "_DATA_ISSUES.txt"
        with open(dp, "w", encoding="utf-8") as f:
            f.write("Tamil NUMERALS found inside words — almost certainly typos.\n")
            f.write("They look like letters on screen but are digits, so search\n")
            f.write("and voice matching miss these lines.\n")
            f.write("Check each against a printed source before correcting.\n")
            f.write("=" * 66 + "\n\n")
            for tbl, key, col, text, hits in data_issues:
                f.write(f"{tbl}  {key}  {col}\n")
                f.write(f"  text : {text}\n")
                for ch, guess in hits:
                    f.write(f"  found '{ch}' (a digit) — probably meant '{guess}'\n")
                f.write("\n")
        print(f"  {len(data_issues)} line(s) have a suspected typo in the Tamil -> {dp}")

    print(f"\nnew: {n_new}   changed: {n_changed}   unchanged(skipped): {n_skip}   "
          f"locked->review: {n_locked}")
    print(f"self-check verified: {n_verified}   flagged: {n_review}")
    if phon_ids:
        print(f"pronunciation applied to {n_phon:,} line(s)")
    if args.recheck_quotes:
        print(f"lines with an apostrophe re-checked: {n_requoted} came out different "
              f"(written), {n_requote_same} already right")
        if vocalic_outside:
            print(f"\n  {len(vocalic_outside)} line(s) outside the thaniyan table have ரு' or லு', "
                  f"read as vocalic ṛ / ḷ. Fine for Sanskrit; if any is a closing quotation "
                  f"mark instead, tell Claude:")
            for t, k, c, src in vocalic_outside[:15]:
                print(f"     {t} {k} {c}: {src[:80]}")
    print(f"wrote {len(stmts)} statements to {args.out}")
    if stmts:
        print(f"\nLoad with:\n  wrangler d1 execute <DB_NAME> --remote --file={args.out}")


if __name__ == "__main__":
    main()