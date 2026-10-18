# studio-engine

Prototype of an Arabic video-editing studio: a local engine (ffmpeg + faster-whisper) and an interactive UI mock-up.

- `engine.py`: silence detection and cutting (ffmpeg only), word-level transcription (faster-whisper), take selection (keeps the last take of a repeated sentence), frame-accurate render.
- `ui/index.html`: the studio interface. It runs on sample data and is not yet connected to the engine.
- `test_engine.py`: `python3 -m unittest` (7 tests).

Transcription without Hugging Face: `python3 engine.py transcribe video.mp4 t.json --sherpa-dir sherpa-onnx-whisper-small` (needs `pip install sherpa-onnx numpy` and the model from the k2-fsa/sherpa-onnx `asr-models` GitHub release). One segment per speech run, no word timestamps.

Status: silence cutting is tested on a real video. Transcription is untested because the model download (`huggingface.co`) was blocked in the session that wrote it.

```
python3 engine.py silence-cut video.mp4 out.mp4
pip install faster-whisper
python3 engine.py transcribe video.mp4 t.json
python3 engine.py plan t.json plan.json
python3 engine.py cut video.mp4 plan.json out.mp4
```
