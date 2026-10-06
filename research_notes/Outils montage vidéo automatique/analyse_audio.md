# Audio analysis building blocks for an automated editor of French talking-head harmonica lessons (speech / harmonica / silence)

Research date: 2026-10-06. Note on method: many primary sites (huggingface.co, mistral.ai, docs.mistral.ai, arxiv.org, auto-editor.com, simonwillison.net) were blocked by the research sandbox's network proxy. GitHub READMEs (via raw.githubusercontent.com) and PyPI metadata were read directly. Facts about blocked sites come from search-result snippets and are marked "(search snippet)", so treat them as less certain.

## Q1. French transcription with word-level timestamps and disfluencies (local and cloud)

### Takeaway
For local use, the practical choices are Whisper large-v3 or large-v3-turbo run through faster-whisper or WhisperX (Windows, Mac CPU or NVIDIA), or through whisper.cpp / mlx-whisper (Mac GPU via Metal). NVIDIA Parakeet-TDT-0.6B-v3, run through parakeet-mlx on a Mac, is the fast newcomer and has good French results. The main catch for detecting bad takes is that standard Whisper drops "euh" and repetitions. whisper-timestamped (`detect_disfluencies`) and CrisperWhisper 2.0 (verbatim mode, but under a non-commercial licence) are the verbatim-oriented options. Among cloud APIs, ElevenLabs Scribe v2 led its competitors on a vendor-run disfluency benchmark, and Deepgram's and AssemblyAI's filler-word features are documented as English-only.

### Cited Findings

**OpenAI Whisper (reference model)**
- openai-whisper latest PyPI release is 20250625 (2025-06-26), MIT licence. The project is mature but receives few updates. — [PyPI openai-whisper](https://pypi.org/project/openai-whisper/)
- By default Whisper gives timestamps per utterance, not per word, and these "can be inaccurate by several seconds". This is the reason WhisperX and the other wrappers exist. — [WhisperX README](https://github.com/m-bain/whisperX)
- Whisper "tends to omit disfluencies and follows more of an intended transcription style". It removes many filler words and repeated utterances. — [CrisperWhisper paper, arXiv 2408.16589](https://arxiv.org/html/2408.16589v1)
- large-v3-turbo has 809M parameters against 1.54B for large-v3. It is distilled from large-v3, keeps the same encoder and has a reduced decoder. It is about 4× faster at about 1–2 WER points worse on English (secondary blog source). On high-resource languages it "approaches large-v3 accuracy". — [vexascribe comparison](https://vexascribe.com/whisper-large-v3-vs-turbo); [Pashto benchmark paper, arXiv 2604.04598](https://arxiv.org/pdf/2604.04598)
- A Whisper large-v3 fine-tuned for French exists (`bofenghuang/whisper-large-v3-french`). It is referenced in a Hugging Face commit, but I could not read its model card. — [HF commit reference](https://huggingface.co/MEscriva/gilbert-fr-source/commit/4a515d2c06e2977bce8cdaee4c99b38beab78381)

**faster-whisper (SYSTRAN, CTranslate2)**
- Up to 4× faster than openai/whisper at the same accuracy, with less memory. Supports int8 quantisation on CPU and GPU. — [faster-whisper README](https://github.com/SYSTRAN/faster-whisper)
- Benchmark on 13 min of audio with large-v2 on an RTX 3070 Ti 8 GB: batched fp16 takes 17 s and 6 GB VRAM; int8 takes 59 s and 2.9 GB. With the small model on CPU, int8 takes 1m42s and 1.5 GB RAM. — [faster-whisper README](https://github.com/SYSTRAN/faster-whisper)
- Has built-in `word_timestamps=True` and a built-in Silero VAD filter (`vad_filter=True`). The VAD default is conservative and only removes silences longer than 2 s; `min_silence_duration_ms` can be tuned. Supports turbo and distil-large-v3. — [faster-whisper README](https://github.com/SYSTRAN/faster-whisper)
- Latest version 1.2.1 (2025-10-31), MIT. — [PyPI faster-whisper](https://pypi.org/project/faster-whisper/)
- The README describes only `device="cuda"` and `device="cpu"`, with no Apple GPU (Metal/MPS) path. On a Mac, faster-whisper therefore runs on CPU. — [faster-whisper README](https://github.com/SYSTRAN/faster-whisper)

**WhisperX (m-bain)**
- Combines faster-whisper batched transcription, VAD segmentation and forced alignment with wav2vec2 for word timestamps, plus optional pyannote diarisation. Claims 70× realtime with large-v2 on GPU. — [WhisperX README](https://github.com/m-bain/whisperX)
- The default French alignment model is torchaudio `VOXPOPULI_ASR_BASE_10K_FR`. — [whisperx/alignment.py](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py)
- Documented limitations:
  - words containing characters outside the alignment dictionary, such as numbers ("2014.", "£13.60"), get no timestamp;
  - overlapping speech is handled poorly;
  - each language needs its own alignment model.
  — [WhisperX README](https://github.com/m-bain/whisperX)
- Runs on CPU with `--compute_type int8 --device cpu`, which the README explicitly recommends for Mac OS X. GPU use needs CUDA 12.8. Diarisation needs a Hugging Face token and acceptance of the pyannote `speaker-diarization-community-1` conditions. — [WhisperX README](https://github.com/m-bain/whisperX)
- Latest version 3.8.6 (2026-05-25), BSD-2-Clause. Actively maintained. — [PyPI whisperx](https://pypi.org/project/whisperx/)
- The authors of whisper-timestamped say wav2vec-based alignment such as WhisperX's lacks "robustness around speech disfluencies (fillers, hesitations, repeated words...) that are usually removed by Whisper". — [whisper-timestamped README](https://github.com/linto-ai/whisper-timestamped)
- On TIMIT read speech, CrisperWhisper's vendor benchmark measured a word-boundary error of 64.8 ms for WhisperX, against 29.6 ms for CrisperWhisper 2.0. This is a vendor benchmark. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)

**whisper-timestamped (LINAGORA / Jérôme Louradour, a French team)**
- Computes word timestamps with DTW on Whisper's cross-attention weights and adds a per-word confidence score. — [whisper-timestamped README](https://github.com/linto-ai/whisper-timestamped)
- Optional VAD runs before Whisper (silero by default, or auditok) to avoid hallucinations on silence. — [whisper-timestamped README](https://github.com/linto-ai/whisper-timestamped)
- `--detect_disfluencies True` marks possible disfluencies as a special `[*]` word with timestamps. This is useful for flagging hesitations even when the text itself is cleaned up. — [whisper-timestamped README](https://github.com/linto-ai/whisper-timestamped)
- The authors warn that timestamp-token approaches, as used in whisper.cpp and stable-ts, "can produce results that are totally out-of-sync on some periods of time (we observed this especially when there is jingle music)". — [whisper-timestamped README](https://github.com/linto-ai/whisper-timestamped)
- Latest version 1.15.9 (2025-09-09). PyPI lists GPLv3, and the README notes a GPL v3 dependency (dtw-python). — [PyPI whisper-timestamped](https://pypi.org/project/whisper-timestamped/); [README](https://github.com/linto-ai/whisper-timestamped)

**stable-ts (jianfch)**
- Wraps Whisper (vanilla, faster-whisper, or "any ASR") to stabilise timestamps.
  - Word timestamps come from cross-attention plus DTW.
  - Optional Silero VAD (`vad=True`, threshold 0.35).
  - `nonspeech_skip` skips long non-speech sections to reduce hallucinations.
  - Optional denoiser preprocessing.
  - A `refine` step adjusts the timestamps further.
  — [stable-ts README](https://github.com/jianfch/stable-ts)
- The README warns that `suppress_ts_tokens` "reduces hallucinations in some cases, but also prone to ignore disfluencies and repetitions". — [stable-ts README](https://github.com/jianfch/stable-ts)
- Latest version 2.19.1 (2025-08-16), MIT. — [PyPI stable-ts](https://pypi.org/project/stable-ts/)

**whisper.cpp (ggml-org)**
- MIT licence. Apple Silicon is a "first-class citizen": NEON, Accelerate, Metal (full GPU inference) and Core ML/ANE for the encoder (more than 3× faster than CPU). Also supports Vulkan GPUs on Windows/Linux. — [whisper.cpp README](https://github.com/ggml-org/whisper.cpp)
- Built-in Silero VAD (`--vad`, model ggml-silero-v6.2.0). Only the detected speech segments are passed to Whisper. — [whisper.cpp README](https://github.com/ggml-org/whisper.cpp)
- Word-level timestamps (`-ml 1`) are labelled "experimental". — [whisper.cpp README](https://github.com/ggml-org/whisper.cpp)
- mlx-whisper, Apple's MLX port, is at version 0.4.3 (2025-08-29), MIT. — [PyPI mlx-whisper](https://pypi.org/project/mlx-whisper/)

**CrisperWhisper 2.0 (nyrahealth / Nyra Labs)**
- Offers two modes. "Verbatim" keeps every filler, repetition, stutter and false start, e.g. `[um] so we we need to, to reschedule the th- thursday...`. "Intended" gives a clean version. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)
- Claims about 30 ms mean word-boundary error on read speech and 41 ms on conversational speech. Has built-in mitigation of looping hallucinations. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)
- Vendor's disfluency F1 averaged over 10 languages:

  | System | Disfluency F1 |
  |---|---|
  | CrisperWhisper 2.0 Pro | 93.5 |
  | CrisperWhisper 2.0 | 87.8 |
  | ElevenLabs Scribe v2 | 79.2 |
  | Microsoft MAI-Transcribe-1.5 | 77.5 |
  | Deepgram Nova-3 | 37.8 |
  | AssemblyAI Universal-3 Pro | 30.5 |

  English and German use human-labelled evaluation sets; the other 8 languages use synthetic sets. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)
- Version 1.0 was English/German only. Version 2.0 says it covers "most languages Whisper supports", but the README does not list the 10 benchmark languages. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)
- **Licence:** the standard models are under a non-commercial research licence. The Pro models are commercial-only. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)
- Installs with `pip install "crisperwhisper[transformers]"`, which runs on macOS, Windows and CPU. The CTranslate2 build is faster but NVIDIA-only. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)

**NVIDIA Parakeet-TDT-0.6B-v3 and Canary-1B-v2**
- Parakeet-TDT-0.6B-v3: 600M parameters, 25 European languages including French, with automatic language detection, punctuation, capitalisation, and word- and segment-level timestamps (search snippet). — [Spokenly blog](https://spokenly.app/blog/parakeet-models); [Canary-1B-v2 & Parakeet-v3 paper](https://arxiv.org/pdf/2509.14128)
- French WER for Parakeet v3 is 5.15% on FLEURS. A test on a MacBook Pro M4 Pro reported 5.9% French WER at RTFx about 200 (search snippet; vendor of a Mac app). — [FluidInference benchmarks](https://docs.fluidinference.com/reference/benchmarks); [whispernotes blog](https://whispernotes.app/fr-BE/blog/parakeet-v3-default-mac-model)
- parakeet-mlx runs Parakeet on Apple Silicon via MLX:
  - CLI flag `--highlight-words` gives word-level timestamps in SRT/VTT;
  - long audio is split into chunks (120 s by default, with overlap).
  - Version 0.5.3 (2026-10-01), Apache-2.0.
  — [parakeet-mlx README](https://github.com/senstella/parakeet-mlx); [PyPI parakeet-mlx](https://pypi.org/project/parakeet-mlx/)
- Canary-1B supports EN/DE/ES/FR. Canary-Qwen-2.5B (June 2025) was reported at the top of the Open ASR Leaderboard with 5.63% average English WER (search snippets). — [northflank / Gladia blogs via search](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)
- Granite Speech 4.1 2B was reported as the current English SOTA on the HF Open ASR Leaderboard with 5.33% mean WER (search snippet). — [CodeSOTA](https://www.codesota.com/speech/stt-leaderboard)
- In CrisperWhisper's word-timing benchmark, Canary had 85.5 ms boundary error, the worst of the systems listed. This is a vendor benchmark. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)

**Mistral Voxtral**
- Voxtral Transcribe 2 was released in February 2026. It includes Voxtral Mini Transcribe V2 for batch use and Voxtral Realtime. 13 languages, including French. Features: word-level timestamps and diarisation (search snippets). — [AlternativeTo news](https://alternativeto.net/news/2026/2/mistral-unveils-voxtral-transcribe-2-a-cheap-open-source-speech-model-that-runs-on-device); [Gend blog](https://www.gend.co/blog/voxtral-transcribe-2)
- Mini Transcribe V2 via API costs $0.003/min. Mistral reports about 4% WER on FLEURS and claims to beat GPT-4o mini Transcribe, Gemini 2.5 Flash, AssemblyAI Universal and Deepgram Nova (vendor claim, search snippets). — [Gend blog](https://www.gend.co/blog/voxtral-transcribe-2); [notes.dsebastien.net](https://notes.dsebastien.net/30+Areas/33+Permanent+notes/33.02+Content/Voxtral+Transcribe+2)
- Voxtral Realtime (`Voxtral-Mini-4B-Realtime-2602`) has open weights under Apache 2.0. The download is 8.87 GB with 4B parameters (search snippet citing Simon Willison). I could not confirm whether the batch Mini Transcribe V2 also has open weights. — [Simon Willison via search](https://simonwillison.net/b/9271)
- The first Voxtral (Small 24B / Mini 3B) came out in July 2025. Voxtral Small 24B was reported at 6.62% mean WER (search snippet). — [northflank](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)

**Cloud APIs**
- OpenAI `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` output only json/text and do not support word timestamps. Word timestamps (`timestamp_granularities`) are available only on `whisper-1`. gpt-4o-mini-transcribe costs about $0.003/min. — [OpenAI community thread](https://community.openai.com/t/word-level-transcription-data/659264); [convertaudiototext pricing](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026)
- ElevenLabs Scribe v2 (released 2026-01-12):
  - more than 90 languages, including French;
  - word-level timestamps and diarisation for up to 32 speakers;
  - `tag_audio_events` is on by default and tags non-speech sounds such as (laughter) or (applause);
  - `no_verbatim` removes fillers, so verbatim is the default behaviour;
  - about $0.22/hr base price, about $0.00367/min batch (search snippets).
  — [edesy docs](https://edesy.in/docs/voice-agent/stt/elevenlabs); [llmreference](https://www.llmreference.com/model/scribe-v2); [futureagi](https://futureagi.com/blog/speech-to-text-apis-in-2026-benchmarks-pricing-developer-s-decision-guide/)
- Deepgram Nova-3 batch costs about $0.0043/min. The `filler_words=true` option is documented as English-only. — [Deepgram filler words](https://deepgram.com/learn/introducing-verbatim-transcription-with-filler-words); [Deepgram community](https://community.deepgram.com/answers/en/filler-words-deepgram-troubleshooting-1330193886252896321); [cekura pricing](https://www.cekura.ai/blogs/deepgram-pricing)
- AssemblyAI Universal-2 costs about $0.0025/min. The `disfluencies` parameter exists on Universal-2 and Universal-3 Pro, but filler-word handling is documented for English variants only. — [AssemblyAI filler words docs](https://www.assemblyai.com/docs/pre-recorded-audio/filler-words); [convertaudiototext](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026)

### Inferences
- **Mac (Apple Silicon), no NVIDIA:** the fastest local options are whisper.cpp (Metal/Core ML) or mlx-whisper for Whisper large-v3-turbo, and parakeet-mlx for Parakeet v3. WhisperX and faster-whisper work on a Mac but only on CPU, which is slower; turbo int8 on CPU should still be usable for 10–20 min videos.
- **Windows without NVIDIA:** faster-whisper on CPU (int8) or whisper.cpp (Vulkan for AMD/Intel GPUs). With an NVIDIA GPU of 6–8 GB or more, WhisperX/faster-whisper with large-v3 is the standard choice.
- **Detecting bad takes:** do not rely on Whisper's text to show "euh" or repeated words. Options:
  - whisper-timestamped `detect_disfluencies`, which adds `[*]` markers;
  - ElevenLabs Scribe v2, verbatim by default;
  - CrisperWhisper 2.0, for non-commercial use only and with French coverage unverified;
  - an initial prompt in French containing "euh" fillers is a commonly used trick, but I found no source for it here.
  Gaps between word timestamps, and repeated n-grams in the transcript, can also flag restarts.
- For a teacher selling courses, CrisperWhisper's non-commercial licence is probably a blocker unless licensed. whisper-timestamped's GPL matters only if the tool is redistributed.

### Gaps
- Direct per-language French WER from the Open ASR Leaderboard multilingual track could not be read, because arxiv.org and huggingface.co were blocked.
- I found no source quantifying large-v3-turbo vs large-v3 specifically on French.
- Whether CrisperWhisper 2.0's 10 benchmark languages include French is unverified.
- Whether Voxtral Mini Transcribe V2 (batch) has open weights, and Voxtral's quality on filler words, are unverified.
- I found no independent French benchmark of filler-word retention ("euh", "ben", "hein") for any system.

## Q2. VAD and silence detection: how they treat harmonica

### Takeaway
Two different tools answer two different questions:
- Energy-based detectors (ffmpeg silencedetect, auto-editor's default audio threshold) keep harmonica, because it is loud.
- Neural VADs (Silero, pyannote, WebRTC) are trained to find *speech*. They are expected to mark instrumental passages as non-speech, so cutting on "non-speech" from a VAD alone risks removing the harmonica.
The robust design is to cut only where the audio is both non-speech and low-energy (or non-music).

### Cited Findings
- **Silero VAD**
  - MIT licence, no telemetry or keys.
  - Processes a 30 ms chunk in under 1 ms on one CPU thread; runs via PyTorch or ONNX on any CPU.
  - Supports 8 kHz and 16 kHz.
  - Trained on corpora in over 6000 languages.
  — [Silero VAD README](https://github.com/snakers4/silero-vad)
- Silero VAD latest version is 6.2.3 (2026-09-23). — [PyPI silero-vad](https://pypi.org/project/silero-vad/)
- Silero VAD is the default VAD inside several Whisper tools:
  - faster-whisper's `vad_filter`;
  - whisper.cpp `--vad`;
  - whisper-timestamped (default);
  - stable-ts `vad=True`;
  - WhisperX, where it is an option alongside pyannote.
  — [faster-whisper](https://github.com/SYSTRAN/faster-whisper); [whisper.cpp](https://github.com/ggml-org/whisper.cpp); [whisper-timestamped](https://github.com/linto-ai/whisper-timestamped); [WhisperX](https://github.com/m-bain/whisperX)
- In a study of Silero VAD on music (detecting vocals in songs), it reached 85.8% accuracy (103/120 clips). It missed faint background vocals and choirs, and was 66.7% accurate in the low-vocal-ratio range (search snippet of arXiv 2609.20195). The study is about sung vocals, not instrument false positives. — [Music Hallucination in Audio-Language Models, arXiv 2609.20195](https://arxiv.org/pdf/2609.20195)
- Singing-voice detection research lists "pitch-fluctuating instruments" as a main source of false positives (search snippet). Harmonica bends and vibrato could fall into this category. This is my inference, not a tested result. — [Revisiting Singing Voice Detection, arXiv 1806.01180](https://arxiv.org/pdf/1806.01180)
- FireRedVAD advertises a 3-class mode that separates speech, singing and music (search snippet). — [FireRedVAD GitHub](https://github.com/FireRedTeam/FireRedVAD)
- **ffmpeg silencedetect**
  - Pure amplitude threshold: `noise` defaults to -60 dB (0.001) and `duration` to 2 s.
  - Any audio louder than the threshold, including music, is "not silence".
  - Quiet music below the threshold can be counted as silence.
  — [ffmpeg af_silencedetect source](https://ffmpeg.org/doxygen/7.1/af__silencedetect_8c_source.html)
- **WebRTC VAD** (py-webrtcvad) is an old GMM-based telephony VAD. Its aggressiveness mode runs from 0 (least aggressive about filtering out non-speech) to 3 (most aggressive). — [py-webrtcvad on PyPI](https://pypi.org/project/webrtcvad/2.0.10/); [medkit docs](https://medkit.readthedocs.io/en/0.16.0/reference/api/medkit/audio/segmentation/webrtc_voice_detector/index.html)
- **pyannote.audio**
  - Version 4.0.7 (2026-06-30).
  - Open pipeline: `speaker-diarization-community-1` (CC-BY-4.0, needs a HF token); paid alternative: `precision-2`.
  - Speed: about 31 s per hour of audio for community-1 on the AMI benchmark (hardware as in the README).
  — [pyannote README](https://github.com/pyannote/pyannote-audio); [PyPI pyannote.audio](https://pypi.org/project/pyannote.audio/)
- **auto-editor's default method** is `--edit audio:threshold=0.04` (loudness). Sections above the threshold are "active" and kept. Loud harmonica is therefore kept. — [auto-editor README](https://github.com/WyattBlue/auto-editor)

### Inferences
- With Silero VAD inside the Whisper tools, harmonica passages will mostly be skipped by the ASR. That is desirable: it avoids hallucinations and the music is not transcribed. But the cut list must then come from a separate decision that keeps music, not from "VAD = keep".
- Recommended pattern: cut a region only if it is (a) non-speech per Silero/pyannote, AND (b) below an energy threshold, or not classified as music by inaSpeechSegmenter/YAMNet.
- Breaths between phrases are low-energy and non-speech, so they will be cut by both methods. Use a margin (auto-editor `--margin`) to keep phrase onsets natural. Harmonica playing itself contains audible breaths, which the music classifier should cover.

### Gaps
- I found no published test of Silero, pyannote or WebRTC VAD specifically on harmonica or other wind-instrument audio. Real behaviour on bends or chugging (rhythmic breath patterns) needs an empirical test on the teacher's recordings.
- I could not read the Silero VAD quality-metrics wiki.

## Q3. Labelling segments as speech / music (harmonica) / silence

### Takeaway
"Harmonica" is an explicit AudioSet class: index 203 in YAMNet's 521-class map and index 208 in the PANNs 527-class list. YAMNet or PANNs CNN14 can therefore output a per-frame harmonica score (about 1 s frames for YAMNet). inaSpeechSegmenter, from the French INA, is the simplest off-the-shelf speech / music / noise / noEnergy segmenter, and it tags speech-over-music as speech. Combining an inaSpeechSegmenter or YAMNet "music" label with an energy threshold is the most practical way to protect harmonica passages.

### Cited Findings
- **AudioSet / YAMNet / PANNs**
  - AudioSet ontology entry: "Harmonica" (`/m/03qjg`), whose parent is "Musical instrument". It is described as a wind instrument with reeds behind each hole. It is not under the "Wind instrument, woodwind instrument" node, whose children are Flute, Saxophone, Clarinet, Oboe and Bassoon. — [AudioSet ontology.json](https://github.com/audioset/ontology/blob/master/ontology.json)
  - YAMNet class map, relevant classes: 0 Speech, 36 Breathing, 190 "Wind instrument, woodwind instrument", 203 Harmonica, 204 Accordion, 221 Rhythm and blues, 246 Blues, 494 Silence. — [yamnet_class_map.csv](https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/yamnet_class_map.csv)
  - PANNs `class_labels_indices.csv` lists "Harmonica" at index 208. — [audioset_tagging_cnn metadata](https://github.com/qiuqiangkong/audioset_tagging_cnn/blob/master/metadata/class_labels_indices.csv)
  - YAMNet uses MobileNet v1 with 3.7M weights. It produces 521 class scores for each 0.96 s window, with 50% overlap. On the AudioSet eval set it reaches balanced mAP 0.306 and d-prime 2.318, so it is light and runs on CPU. — [YAMNet README](https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/README.md)
  - PANNs CNN14 reaches 0.431 mAP on AudioSet (Wavegram-Logmel-CNN 0.439). — [PANNs paper, arXiv 1912.10211](https://arxiv.org/pdf/1912.10211)
- **inaSpeechSegmenter (INA, France)**
  - MIT licence. Segments audio into speech / music / noise, with optional male/female gender labels.
  - Speech over music or over noise is tagged as speech; singing voice is tagged as music.
  — [inaSpeechSegmenter README](https://github.com/ina-foss/inaSpeechSegmenter)
  - It first runs an energy-based activity detection (`energy_ratio=0.03` by default) that labels low-energy zones `noEnergy`, then runs the neural speech/music/noise classifier. Its output therefore directly separates silence, speech and music. — [inaSpeechSegmenter segmenter.py](https://github.com/ina-foss/inaSpeechSegmenter/blob/master/inaSpeechSegmenter/segmenter.py)
  - Engines: `smn` (speech/music/noise, more recent) and `sm` (won the MIREX 2018 speech-detection challenge). Ranked first of six open-source VADs on a French TV/radio dataset. Gender models are tuned for French. — [inaSpeechSegmenter README](https://github.com/ina-foss/inaSpeechSegmenter)
  - Version 0.8.0 (2025-09-19). Requires Python 3.8–3.13 (TensorFlow, not 3.14) and FFmpeg. Installs via pip or Docker. — [PyPI](https://pypi.org/project/inaSpeechSegmenter/); [README](https://github.com/ina-foss/inaSpeechSegmenter)
- **Essentia** (UPF) provides TensorFlow models for music tagging and classification, including instrumentation (search snippet). — [TensorFlow Audio Models in Essentia, ICASSP 2020](https://repositori.upf.edu/items/9176dcc3-64ca-4fa7-be96-af53acf716c5)
- **ElevenLabs Scribe** `tag_audio_events` tags non-speech sounds inline in the transcript. It could serve as a cloud-side hint for music events, but I found no documentation that it reliably tags instruments. — [edesy docs](https://edesy.in/docs/voice-agent/stt/elevenlabs)

### Inferences
- In this use case the inaSpeechSegmenter `music` label is likely to capture solo harmonica, because it is neither speech nor singing. Teacher demos with spoken counting over playing would come out as "speech", which is still safe because it will be kept.
- YAMNet's Harmonica score could be used as a confirmation signal ("harmonica present") rather than the only decision, since frame-level instrument recognition on AudioSet is mediocre (mAP 0.3–0.43 overall).
- The YAMNet "Breathing" class may fire on harmonica breath noise. Merging speech-adjacent breathing into the neighbouring segment is safer.
- Short harmonica notes (less than 1 s) between sentences can be missed by 0.96 s YAMNet windows and by inaSpeechSegmenter smoothing. A minimum-keep margin is advisable.

### Gaps
- I found no per-class accuracy figure for "Harmonica" in YAMNet or PANNs. Practical accuracy on close-miked solo harmonica is unknown and should be tested.
- I gathered no specific information on BEATs, CLAP zero-shot ("a person playing harmonica" vs "a person speaking") or pyannote segmentation for music. They exist, but I gathered no specific accuracy or usability facts on them.
- I did not research inaSpeechSegmenter's speed on CPU or Apple Silicon (TensorFlow Metal).

## Q4. auto-editor and other automatic silence-cutting tools

### Takeaway
auto-editor is a mature, public-domain command-line tool. It was rewritten in Nim and is actively maintained in 2026 (changelog at 31.7.x). It cuts on loudness by default, which naturally keeps loud harmonica. It exports to Premiere, Resolve, Final Cut Pro, Shotcut and Kdenlive. Its label/threshold system lets you keep loud non-speech sections, or treat them differently, but it has no speech/music awareness of its own.

### Cited Findings
- auto-editor "is a command line application for automatically editing video and audio by analyzing a variety of methods, most notably audio loudness". Its job is the "first pass" that cuts dead space. — [auto-editor README](https://github.com/WyattBlue/auto-editor)
- **Cutting options:**
  - Default `--edit audio:threshold=0.04,stream=all`.
  - Thresholds can be given in dB (e.g. `audio:-19dB`).
  - Motion-based editing: `motion:threshold=0.02`.
  - Methods combine with boolean expressions, e.g. `(or audio:0.03 motion:0.06)`.
  - Per-track thresholds for multi-track files.
  - `--margin` adds padding, default 0.2 s, and can be asymmetric (`0.3s,1.5sec`).
  — [auto-editor README](https://github.com/WyattBlue/auto-editor)
- **Labels:** label 0 is silent (cut by default) and label 1 is active (kept). Up to 255 extra classes via `--edit:N` / `--when:N`, e.g. `--edit:2 audio:-12dB --when:2 speed:1.5`. `--when-active cut --when-inactive nil` exports what would be cut, for review. — [auto-editor README](https://github.com/WyattBlue/auto-editor)
- **Exports:** Premiere (`--export premiere`, XML), DaVinci Resolve, Final Cut Pro, Shotcut, Kdenlive, and clip sequences. — [auto-editor README](https://github.com/WyattBlue/auto-editor)
- **Licence:** Unlicense / public domain. Written in Nim; building from source needs Nim 2.2.x. — [auto-editor README](https://github.com/WyattBlue/auto-editor); [PyPI auto-editor](https://pypi.org/project/auto-editor/); [search snippet on build deps](https://formulae.brew.sh/formula/auto-editor)
- **Versions:** PyPI's latest is 29.3.1 (2025-11-04). The repository changelog is at 31.7.2, so recent releases appear to be distributed outside PyPI. The 31.7.2 fixes concern robustness to corrupt packets and analysis caching. — [PyPI](https://pypi.org/project/auto-editor/); [CHANGELOG.md](https://github.com/WyattBlue/auto-editor/blob/master/CHANGELOG.md)
- **Install:** macOS via Homebrew (`brew install auto-editor`). Official install instructions are at auto-editor.com/installing (not readable here). — [Homebrew formula](https://formulae.brew.sh/formula/auto-editor); [auto-editor README](https://github.com/WyattBlue/auto-editor)
- The README advertises an agent "skill" (`npx skills add WyattBlue/auto-editor`). — [auto-editor README](https://github.com/WyattBlue/auto-editor)

### Inferences
- With the default loudness method, harmonica passages are kept automatically. The risks are the opposite ones: quiet harmonica (soft notes, fades) falling below the threshold, and loud non-speech noise (handling noise, coughs) being kept.
- A hybrid pipeline is likely the most reliable:
  1. Compute speech/music/silence segments, with inaSpeechSegmenter or Silero plus energy.
  2. Compute word timestamps (WhisperX or parakeet-mlx).
  3. Decide the cuts: silences, bad takes and fillers.
  4. Either build an FCPXML/Premiere XML directly, or feed auto-editor's export.
  auto-editor's own `--edit` cannot read an external segment list according to the README, so I could not confirm that it accepts custom cut lists.
- auto-editor is CLI-only. A non-developer would need a wrapper script or GUI.

### Gaps
- I could not read auto-editor.com (docs/installing), so I could not confirm Windows binaries, GUI availability, or whether a "cut list from a file" option exists.
- I did not cover other silence cutters (e.g. Recut, TimeBolt, Descript, Premiere's built-in tools) in this note.

## Q5. Known pitfalls: hallucinations on music, timestamp drift, breaths

### Takeaway
Whisper-family models hallucinate text on silence and music, typically subtitle-credit phrases learned from YouTube data, and their timestamps can drift during music. The mitigations are to apply VAD before ASR, skip non-speech, use forced alignment (WhisperX) or DTW (whisper-timestamped / stable-ts), and never transcribe harmonica-only segments.

### Cited Findings
- Whisper hallucinates language-specific "subtitle credit" phrases on silence, e.g. German "Untertitelung des ZDF für funk, 2017" and an Arabic translator credit. The cause is training on subtitled videos whose credits play over music, applause or silence (search snippet; French equivalents such as "Sous-titres réalisés par…" are commonly reported but I did not verify a primary source). — [Kieran Healy, "The Sound of Silence" (2025-07-22)](https://kieranhealy.org/blog/archives/2025/07/22/the-sound-of-silence)
- whisper-timestamped's README: VAD before Whisper avoids hallucinations "for instance, predicting 'Thanks you for watching!' on pure silence". Timestamp-token methods can go "totally out-of-sync… especially when there is jingle music". Whisper's native timestamps tend to be rounded to about 1 s. — [whisper-timestamped README](https://github.com/linto-ai/whisper-timestamped)
- WhisperX: VAD preprocessing "reduces hallucination". Plain Whisper's utterance timestamps can be off by several seconds. — [WhisperX README](https://github.com/m-bain/whisperX)
- stable-ts: `nonspeech_skip` "reduce[s] text and timing hallucinations in non-speech sections". `suppress_ts_tokens` reduces hallucinations but makes the model more likely to drop disfluencies and repetitions. — [stable-ts README](https://github.com/jianfch/stable-ts)
- CrisperWhisper 2.0 claims "built-in mitigation of Whisper's looping-hallucination failure mode" and no duplicated or dropped words at chunk seams. — [CrisperWhisper README](https://github.com/nyrahealth/CrisperWhisper)
- Chunked models need overlap to avoid boundary errors; parakeet-mlx defaults to 120 s chunks with an overlap. — [parakeet-mlx README](https://github.com/senstella/parakeet-mlx)
- WhisperX gives no word timestamps for tokens with digits or symbols (e.g. "2014."). In French harmonica lessons this affects hole numbers like "trou 4" if written as digits. — [WhisperX README](https://github.com/m-bain/whisperX)

### Inferences
- Harmonica lessons are full of numbers ("trou 4", "position 2", "aspiré 3"). WhisperX alignment failures on digits could leave gaps in word timing. whisper-timestamped and stable-ts (DTW on Whisper tokens) or Parakeet's native timestamps avoid this specific problem.
- Running the ASR on the whole file, including harmonica, risks invented sentences in music sections. Possible mitigations:
  - transcribe only speech/VAD regions;
  - discard words whose timestamps fall inside music-labelled regions;
  - filter out low-confidence words.
- Breaths: Whisper-family models usually do not transcribe breaths. VADs treat them as non-speech, and energy cutters keep them if they are loud. Keep short margins (about 0.1–0.25 s) so that cuts do not clip breath onsets and sound unnatural.

### Gaps
- I found no primary source listing French-specific Whisper hallucination strings, or quantifying hallucination rates on instrumental music.
- I found no data on how Parakeet v3 or Voxtral behave on long instrumental passages (hallucination vs silence).
