#!/usr/bin/env python3
"""Editing-studio engine: silence detection, take selection, ffmpeg cutting, Whisper transcription.

Commands:
  silence    VIDEO [--noise -30] [--min 0.5]        list silences (ffmpeg only)
  silence-cut VIDEO OUT [--noise -30] [--min 0.5]   cut silences, write OUT (ffmpeg only)
  transcribe VIDEO JSON [--model small] [--lang ar] word-level transcript (needs faster-whisper + model download)
  plan       JSON PLAN [--min 0.5]                  pick the last take of repeated sentences -> keep list
  cut        VIDEO PLAN OUT                         render the keep list with ffmpeg
"""
import argparse, json, re, subprocess, sys
from difflib import SequenceMatcher


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def duration(video):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", video])
    return float(r.stdout.strip())


def loudness(video, win=0.05):
    """Per-window RMS level in dB (mono, 16 kHz), decoded through ffmpeg."""
    import array, math
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000",
                        "-f", "s16le", "-"], capture_output=True)
    pcm = array.array("h")
    pcm.frombytes(r.stdout[: len(r.stdout) // 2 * 2])
    n = int(16000 * win)
    return [20 * math.log10(max(1e-9, math.sqrt(sum(x * x for x in pcm[i:i + n]) / n) / 32768))
            for i in range(0, len(pcm) - n + 1, n)]


def auto_threshold(levels, margin=6.0):
    """Noise floor (10th percentile of window levels) plus a margin, in dB."""
    s = sorted(levels)
    return s[len(s) // 10] + margin


def silences_from_levels(levels, threshold, min_len=0.5, win=0.05):
    """Runs of windows below `threshold` lasting at least `min_len` seconds -> [(start, end)]."""
    out, run_start = [], None
    for i, lv in enumerate(levels + [0.0]):  # sentinel closes a trailing run
        quiet = lv < threshold and i < len(levels)
        if quiet and run_start is None:
            run_start = i
        elif not quiet and run_start is not None:
            if (i - run_start) * win >= min_len:
                out.append((round(run_start * win, 3), round(i * win, 3)))
            run_start = None
    return out


def detect_silence(video, noise_db=None, min_len=0.5):
    """Return [(start, end)] of silent stretches. noise_db=None picks the threshold from the recording's noise floor."""
    levels = loudness(video)
    th = auto_threshold(levels) if noise_db is None else noise_db
    return silences_from_levels(levels, th, min_len)


def invert(intervals, total, pad=0.08, min_keep=0.15):
    """Silences -> segments to keep, leaving `pad` seconds of breathing room around speech."""
    keep, pos = [], 0.0
    for s, e in intervals:
        a, b = pos, min(total, s + pad)
        if b - a >= min_keep:
            keep.append((round(a, 3), round(b, 3)))
        pos = max(pos, e - pad)
    if total - pos >= min_keep:
        keep.append((round(pos, 3), round(total, 3)))
    return keep


def norm(text):
    text = re.sub(r"[ً-ْـ]", "", text)  # tashkeel, tatweel
    text = re.sub(r"[إأآ]", "ا", text).replace("ى", "ي").replace("ة", "ه")
    return re.sub(r"[^\w\s]", "", text).strip()


def group_takes(segments, threshold=0.55):
    """Group consecutive segments that restate the same sentence (a re-take).

    A segment joins the open group when its normalised text is similar to the group's
    latest take, or is a prefix of it (a false start)."""
    groups = []
    for seg in segments:
        t = norm(seg["text"])
        if groups:
            last = norm(groups[-1][-1]["text"])
            sim = SequenceMatcher(None, t, last).ratio()
            prefix = bool(t) and (last.startswith(t) or t.startswith(last))
            if sim >= threshold or prefix:
                groups[-1].append(seg)
                continue
        groups.append([seg])
    return groups


def plan_keep(segments, min_words=2):
    """Keep the last take of each group. Drop groups whose last take is a stub (< min_words)."""
    keep, dropped = [], []
    for g in groups_ok(segments):
        final = g[-1]
        for s in g[:-1]:
            dropped.append({"start": s["start"], "end": s["end"], "text": s["text"], "why": "retake"})
        if len(norm(final["text"]).split()) < min_words and len(g) == 1:
            dropped.append({"start": final["start"], "end": final["end"], "text": final["text"], "why": "false-start"})
        else:
            keep.append({"start": final["start"], "end": final["end"], "text": final["text"]})
    return keep, dropped


def groups_ok(segments):
    return group_takes(sorted(segments, key=lambda s: s["start"]))


def render(video, keep, out):
    """Concatenate keep intervals (list of (start, end)) into OUT, re-encoded so cuts are frame-accurate."""
    parts, labels = [], ""
    for i, (a, b) in enumerate(keep):
        parts.append(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}];"
                     f"[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]")
        labels += f"[v{i}][a{i}]"
    graph = ";".join(parts) + f";{labels}concat=n={len(keep)}:v=1:a=1[v][a]"
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", video, "-filter_complex", graph,
             "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
             "-c:a", "aac", out])
    if r.returncode:
        sys.exit(r.stderr)


def transcribe(video, model_name="small", lang="ar"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper is not installed: pip install faster-whisper")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, info = model.transcribe(video, language=lang, word_timestamps=True, vad_filter=False)
    out = []
    for s in segs:
        out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2),
                               "p": round(w.probability, 2)} for w in (s.words or [])]})
    return {"language": info.language, "duration": info.duration, "segments": out}


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("silence", "silence-cut"):
        s = sub.add_parser(name)
        s.add_argument("video")
        if name == "silence-cut":
            s.add_argument("out")
        s.add_argument("--noise", type=float, default=None, help="threshold in dB (default: noise floor + 6 dB)")
        s.add_argument("--min", type=float, default=0.5)
    s = sub.add_parser("transcribe")
    s.add_argument("video"); s.add_argument("json"); s.add_argument("--model", default="small"); s.add_argument("--lang", default="ar")
    s = sub.add_parser("plan"); s.add_argument("json"); s.add_argument("plan")
    s = sub.add_parser("cut"); s.add_argument("video"); s.add_argument("plan"); s.add_argument("out")
    a = p.parse_args(argv)

    if a.cmd == "silence":
        sil = detect_silence(a.video, a.noise, a.min)
        print(json.dumps({"silences": sil, "removed": round(sum(e - s for s, e in sil), 2)}))
    elif a.cmd == "silence-cut":
        total = duration(a.video)
        keep = invert(detect_silence(a.video, a.noise, a.min), total)
        render(a.video, keep, a.out)
        print(json.dumps({"before": round(total, 2), "after": round(duration(a.out), 2), "segments": len(keep)}))
    elif a.cmd == "transcribe":
        json.dump(transcribe(a.video, a.model, a.lang), open(a.json, "w"), ensure_ascii=False, indent=1)
    elif a.cmd == "plan":
        data = json.load(open(a.json))
        keep, dropped = plan_keep(data["segments"])
        json.dump({"keep": keep, "dropped": dropped}, open(a.plan, "w"), ensure_ascii=False, indent=1)
        print(f"keep {len(keep)} / drop {len(dropped)}")
    elif a.cmd == "cut":
        plan = json.load(open(a.plan))
        render(a.video, [(k["start"], k["end"]) for k in plan["keep"]], a.out)


if __name__ == "__main__":
    main()
