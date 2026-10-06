# Détection et suppression des prises ratées, validation humaine et export vers un logiciel de montage (état fin 2026)

Note on sourcing: several vendor sites (gling.ai, descript.com, xda-developers.com, opentimelineio.readthedocs.io) were blocked by the network proxy during research. Pricing and feature claims for those vendors come from search-result snippets of third-party review or aggregator sites (2026-dated). Treat exact prices as indicative and check them on the vendor page before relying on them.

## 1. Bad take detection: techniques and open-source projects (including Claude Code builds)

### Takeaway
Two families of technique are in use in 2026. (a) Cheap heuristics on a word-timestamped transcript: split on silences, then "last take wins" when a segment is the prefix of the next one, n-gram repetition, a fuzzy similarity threshold of about 0.8, and a filler-word list. (b) An LLM (Claude, Gemini, GPT) that reads a compact timestamped transcript and picks the best take, which also catches restarts phrased in other words. Since August 2026 several Claude Code "skills" combine both with ffmpeg plus whisper.cpp or faster-whisper, run locally, and handle French.

### Cited Findings
**Projects built as Claude Code skills or agents (2026):**
- **vincentventalon/claude-code-video-editing-skill** (MIT, Vincent Ventalon, about 3 stars; the author has posted one video a day edited by Claude since August 2026):
  - Rough cut for talking-head video. It joins raw clips, removes silences, cuts fillers, keeps the last take and transcribes, using ffmpeg and whisper.cpp. Runs on macOS, Windows and Linux.
  - Algorithm: split the audio into "islands of sound" between silences and transcribe each island separately. Rule: "When an island is the beginning of what you say right after, it was a false start: it goes, the last take stays." Claude then "reads the takes like an editor" to catch a sentence that was abandoned and restarted *in other words*.
  - Islands that hold only a breath, a click or a lone "um" are dropped.
  - Default silence setting: 0.22 s at -32 dB. It can be tuned with `--min-sil` and `--noise` (lower to 25 dB in noisy rooms).
  - Whisper model: large-v3-turbo by default (1.6 GB), with q5_0 (0.57 GB) or small as alternatives. French is explicitly documented.
  - Outputs: MP4 with 10 ms fades at the joins, plus TXT, SRT and a TSV takes log. EDL and FCPXML are not supported yet.
  - Human correction is done with `--cut` and `--protect` time windows, then a re-render.
  - Claude installs ffmpeg and whisper.cpp if they are missing. 8 GB of RAM minimum.
  - Source: [GitHub](https://github.com/vincentventalon/claude-code-video-editing-skill)
- **browser-use/video-use** ("Edit videos with coding agents", MIT, about 28.1k stars and 3.3k forks per the GitHub page):
  - Transcribes with ElevenLabs Scribe, which gives word-level timestamps, speaker diarization and audio events.
  - All takes are packed into a file of about 12 KB, `takes_packed.md`, which is the LLM's main reading view. Its lines look like `[002.52-005.36] S0 sentence…`.
  - There is no hard-coded retake detector. The LLM reads the transcript, proposes a cutting strategy and **waits for user confirmation**.
  - It builds an EDL, renders with FFmpeg, then runs a self-evaluation loop for visual jumps and audio pops, with up to 3 re-renders.
  - Needs an ElevenLabs API key, so it is cloud-based and paid.
  - Sources: [GitHub](https://github.com/browser-use/video-use), [SKILL.md](https://github.com/browser-use/video-use/blob/main/SKILL.md)
- **edunascimentt/editassist** (MIT, new repo with 0 stars):
  - AI video editor driven by Claude Code or Codex. It uses faster-whisper large-v3-turbo with word-level transcripts and flags passages that Whisper skipped. A `qa` skill checks for gaps, flash frames, mid-word cuts, loudness and black frames.
  - It **delivers NLE projects**:
    - `.otio` for DaVinci Resolve
    - `.xml` for Premiere
    - `.jsx` for After Effects
    - `.fcpxml` for Final Cut
  - It warns that speed changes, crops and zooms "must be baked" before export, because XML and OTIO don't carry them reliably.
  - "Anything you correct twice becomes the default next time", kept in a memory folder.
  - Source: [GitHub](https://github.com/edunascimentt/editassist)
- **hatimmrabet/video-editor** (MIT, 0 stars, 90 commits):
  - Has a "repeated-sentence detector": "when you rephrase a sentence, it suggests dropping the first". Uses faster-whisper.
  - Trigger phrases work in English and French. It has an optional Remotion live timeline screen.
  - Source: [GitHub](https://github.com/hatimmrabet/video-editor)
  - The search snippet adds more. It describes a `retakes` subcommand: immediate n-gram repetition, false start then restart found by fuzzy prefix, and stall words from a `fillers.json`. It says a retake-similarity threshold defaults to 0.8. It also describes a QC command that re-transcribes the export and audits the removed retakes for unique content.
  - These details appeared in the search snippet and in [issue #127](https://github.com/hatimmrabet/video-editor/issues/127) ("Retakes / false starts / stammers are never cut"), but the fetched README didn't confirm them. Treat them as plausible, not verified.
- **gad45/transcriber**: removes bad takes, silences and adds captions. It transcribes with the Soniox API and uses LLMs (Gemini or OpenAI) for "intelligent take selection" — [GitHub](https://github.com/gad45/transcriber)
- **6missedcalls/video-editing-skill**: skill for OpenClaw, Claude Code and Codex. It trims, jump-cuts, captions, adds text overlays and changes speed with natural language, using pure Bash, FFmpeg and Whisper — [GitHub](https://github.com/6missedcalls/video-editing-skill)
- Other Claude Code video repos:
  - [adukhan98/video-edit](https://github.com/adukhan98/video-edit): brand docs plus raw footage give an on-brand edit with HyperFrames captions and b-roll.
  - [assafkip/claude-video-editor](https://github.com/assafkip/claude-video-editor): cut, caption and grade real footage by talking to Claude.
- XDA article (2026), "I turned my terminal into a video editor using Claude Code" (seen in search snippet only; fetch blocked):
  - Whisper JSON transcripts with word-level timestamps.
  - **Subagents picked the best takes**.
  - Claude checked which tools were installed (ffmpeg and a transcriber) and then laid out an eight-step editing roadmap.
  - Source: [XDA](https://www.xda-developers.com/turned-my-terminal-into-a-video-editor-using-claude-code/)
- X article "Claude Code + Open source = makes me YouTube videos in 10 mins" — [X](https://x.com/gouthamjay8/article/2050293051994902672). Content not fetched.

**Commercial reference behaviour:**
- Gling's differentiator is bad-take detection: when you repeat a sentence three times, it "identifies all versions, picks the best delivery, and removes the rest" — [max-productive.ai review](https://max-productive.ai/ai-tools/gling/)
- A 2026 review warns that automatic bad-take detection "is a guess; it flags confidently and will cut takes you wanted, so the transcript still needs a human read-through" — [Gling review roundup](https://aisotools.com/blog/gling-review-2026)
- DaVinci Resolve 20 IntelliScript matches the transcribed audio to a script and "select[s] the best takes, with alternative takes placed on additional tracks" — [ProVideo Coalition](https://www.provideocoalition.com/blackmagic-introduces-davinci-resolve-20/)

### Inferences
- The most robust pipeline for a French speaker has six steps:
  1. Local whisper.cpp or faster-whisper large-v3-turbo, with word timestamps.
  2. Silence-based segmentation.
  3. Heuristic retake pre-flagging: prefix match, then fuzzy similarity of about 0.8 between consecutive segments, then keep the last one.
  4. An LLM pass over a compact `[start-end] text` listing, to catch restarts phrased in other words and to choose the best take rather than only the last.
  5. Human validation.
  6. Render or export.
- vincentventalon's skill is closest to the user's need (French, local, free, built for Claude Code). It lacks NLE export. editassist shows how to add OTIO, XML and FCPXML export.
- A harmonica teacher's videos contain played passages with no words. Transcript-only heuristics treat those as "silence" or "islands with no words" and may cut them. That is a key adaptation to make: protect musical segments, for example by detecting non-speech audio energy, or with `--protect` windows.

### Gaps
- No peer-reviewed or benchmark data was found on how accurate retake detection is (heuristic vs LLM), in French or in general.
- The full hatimmrabet algorithm details couldn't be verified from the README.
- The XDA article and the X article couldn't be fetched (blocked or not attempted). Their stacks are known only from snippets.

## 2. Presenting a proposed cut for human validation

### Takeaway
Every serious tool keeps a human in the loop. The common pattern is a **transcript where the proposed removals are shown, struck through or greyed, but kept**, which the user can toggle back before export. Open-source Claude skills do the same more simply: the agent proposes a plan and waits for "OK" (video-use), or the user passes `--cut` and `--protect` windows and re-renders (vincentventalon).

### Cited Findings
- Gling: you select files, AI transcription runs, and then the transcript "is then used to remove bad takes". The export to the NLE keeps all cuts intact so they can still be adjusted — [Gling transcription page](https://www.gling.ai/ai-video-transcription), [Gling blog](https://www.gling.ai/blog/integrating-gling-with-your-existing-video-editing-workflow)
- Descript has a dedicated "AI Remove Retakes" feature — [Descript](https://www.descript.com/ai/remove-retakes). Its Underlord AI co-editor and "Remove Filler Words" are included from the Hobbyist plan up — [costbench](https://costbench.com/software/ai-video-generators/descript/)
- Premiere Pro Text-Based Editing:
  - Detects "uh/umm" filler words and pauses.
  - Lets you bulk delete them in one click.
  - Lets you adjust the minimum pause duration.
  - Shipped in 24.1 (December 2023). Source: [RedShark](https://www.redsharknews.com/how-to-delete-pauses-and-filler-words-with-text-based-editing), [Adobe Dec 2023 release notes](https://helpx.adobe.com/premiere-pro/using/whats-new/2024-1.html)
- DaVinci Resolve 20 IntelliScript puts alternative takes on additional tracks, so the editor can audition them instead of losing them — [ProVideo Coalition](https://www.provideocoalition.com/blackmagic-introduces-davinci-resolve-20/)
- video-use: "The agent proposes a cutting strategy for user approval before execution". It also uses on-demand filmstrip and waveform composites at decision points — [GitHub](https://github.com/browser-use/video-use)
- vincentventalon skill: a TSV takes log plus `--cut` and `--protect` flags let you correct the cut, then you re-render — [GitHub](https://github.com/vincentventalon/claude-code-video-editing-skill)
- hatimmrabet/video-editor: an optional Remotion "live timeline editing screen" — [GitHub](https://github.com/hatimmrabet/video-editor)

### Inferences
These are local options a non-developer could ask Claude Code to build, from simplest to richest:
1. **An editable text file**: one line per segment, as `[00:01:02.3–00:01:05.8] ✔/✘ text`. The user deletes lines or flips ✘ to ✔, then Claude re-renders.
2. **A self-contained HTML review page**:
   - Shows the transcript with removed parts struck through, and click to toggle.
   - Plays the source video via `<video>` with `currentTime` seeking, with an option to skip removed ranges during preview.
   - Has a "download decisions JSON" button.
   - This mirrors the Descript and Gling UX without any subscription.
3. **A low-res preview MP4** of the proposed cut. It is quick to watch at 1.5×, and timecodes in the burned subtitles help the user say "restore 03:12".
4. **Export to Resolve or Premiere** with alternative takes on a second track or disabled clips, IntelliScript-style, so the final validation happens in the NLE.

### Gaps
- Descript's exact UI for retakes (struck-through text vs separate review list) and Gling's toggle UI couldn't be checked first-hand, because the vendor sites were blocked.
- No source compared these UX patterns for review speed.

## 3. Commercial comparables (prices are 2026 snapshots from third-party sites; verify)

### Takeaway
Only **Gling** (and Descript's "Remove Retakes", plus Resolve IntelliScript when you have a script) target bad takes as such. Most other tools cut silences and fillers, or make shorts. French is supported by Gling, Premiere and Descript. Real public APIs are rare: Submagic (metered) and Opus Clip (Business plan only).

### Cited Findings
- **Gling** (desktop and web AI editor for YouTubers)
  - What it does: removes bad takes, silences and filler words, with auto-framing and noise removal — [capterra/aggregators](https://www.capterra.com.sg/software/1041465/gling)
  - Price: from $10/month, with tiers around $20 Pro and up to $40–100 — [aggregators](https://indexator.ai/companies/gling). These figures are unconfirmed and the official pricing page was blocked.
  - French: supported, along with English, Spanish, Portuguese, German, Russian, Italian, Dutch and Hebrew, plus more for transcription — [opentools / max-productive](https://max-productive.ai/ai-tools/gling/)
  - Export: XML for Final Cut, XML or EDL for Premiere and Resolve. "Rough cut opens in your NLE with all cuts intact" — [Gling blog](https://www.gling.ai/blog/integrating-gling-with-your-existing-video-editing-workflow)
  - API: none found.
- **Descript** (desktop and web)
  - Pricing:

    | Plan | Monthly billing | Annual billing (per month) | Media hours / month | AI credits / month |
    |---|---|---|---|---|
    | Free | $0 | $0 | – | – |
    | Hobbyist | $24 | $16 | 10 | 400 |
    | Creator | $35 | $24 | 30 | 800 |
    | Business | $65 | $50 | 40 | 1,500 |

  - Underlord and Remove Filler Words are available from the Hobbyist plan up. Source: [costbench](https://costbench.com/software/ai-video-generators/descript/), [G2](https://www.g2.com/products/descript/pricing)
  - Has a "Remove Retakes" AI feature — [Descript](https://www.descript.com/ai/remove-retakes)
  - French support, export formats and API: not verified in this session (see Gaps).
- **AutoCut** (plugin for Premiere Pro and DaVinci Resolve)
  - Silence cutting, captions, zooms, stock b-roll, podcast multicam, **remove repetitions**.
  - Pricing:

    | Plan | Billed annually | Billed monthly | What it covers |
    |---|---|---|---|
    | Basic | $6.60/month ($79/year) | $9.90/month | Silence removal only |
    | AI | $14.90/month ($178.80/year) | $19.80/month | All 10 tools |
    | Enterprise | $19.90/seat/month | – | Priority support, team licensing |

  - Source: [digitalproduction 2026-04](https://digitalproduction.com/2026/04/08/autocut-brings-ai-cleanup-inside-premiere-pro/), [air.io](https://air.io/en/ai-tools/top-9-ai-silence-removal-tools-for-a-smooth-video-flow)
- **FireCut** (Premiere Pro and Resolve plugin): $34/month, or $24/month billed annually — [air.io](https://air.io/en/ai-tools/top-9-ai-silence-removal-tools-for-a-smooth-video-flow), [firecut.ai](https://firecut.ai/)
- **TimeBolt** (desktop silence and jump-cut tool): from $17/month Pro, or $347 one-time — [air.io](https://air.io/en/ai-tools/top-9-ai-silence-removal-tools-for-a-smooth-video-flow)
- **Recut** (desktop, silence removal)
  - Price: $129 one-time, or $15/month. Free trial with 3 exports.
  - Exports XML or FCPXML to Premiere, Resolve and Final Cut. Processing is local.
  - Source: [itechguides 2026](https://www.itechguides.com/products/recut-ai-video-editor/), [getrecut.com](https://getrecut.com/), [autotrim guide](https://www.autotrim.app/en/guides/best-silence-remover-final-cut-pro)
  - Silence-based only. No evidence of bad-take detection.
- **Submagic** (web, captions and shorts)
  - $19–69/month, or $12–41/month billed annually.
  - Business ($69) includes 100 API minutes per month. Extra API minutes cost $0.10–0.15 — [coldiq / cutsnap](https://cutsnap.ai/blog/submagic-pricing-2026)
- **Opus Clip** (web, long video to shorts)
  - Starter $15/month, Pro $29/month or $174/year (as of 28 Aug 2026).
  - API only on the custom-priced Business plan — [eesel.ai](https://www.eesel.ai/blog/opusclip-pricing), [fluxnote](https://fluxnote.io/guides/opus-clip-pricing-2026)
  - Not a bad-take tool.
- **Premiere Pro Text-Based Editing**
  - Detects filler words and pauses, with bulk delete.
  - Filler detection is "language agnostic", so it works in all 18 Speech-to-Text languages, **French included**.
  - Since v24.1 (December 2023, older info but still current).
  - Source: [Adobe community beta announcement](https://community.adobe.com/t5/premiere-pro-beta-discussions/now-in-beta-filler-words-and-other-text-based-editing-updates-in-premiere-pro/m-p/14192560), [Adobe release notes](https://helpx.adobe.com/premiere-pro/using/whats-new/2024-1.html)
  - Adobe users have filed a feature request "AI to cut out retakes", which suggests Premiere has no native retake removal — [Adobe community](https://community.adobe.com/feature-requests-730/ai-to-cut-out-retakes-1328547)
- **DaVinci Resolve 20** (announced at NAB in April 2025, out of beta in 2025)
  - AI IntelliScript: builds a timeline from a text script and picks the best takes, with alternates on extra tracks.
  - AI transcription with speaker detection.
  - AI IntelliCut: clip-based audio processing, including "Remove Silence" and dialogue split per speaker.
  - Source: [ProVideo Coalition](https://www.provideocoalition.com/blackmagic-introduces-davinci-resolve-20/), [Mix](https://www.mixonline.com/technology/news-products/blackmagic-davinci-resolve-20-adds-ai-audio-features), [2026 guide](https://blitzcutai.com/blog/davinci-resolve-text-based-editing)

### Inferences
- For a French solo YouTuber with no script, the commercial tool that does exactly "remove bad takes" is Gling, with Descript as the alternative. AutoCut's "remove repetitions" is the nearest plugin-style option for Premiere or Resolve users.
- None of these tools offers a public API at hobby prices, so automation from Claude Code goes through NLE interchange files or scripting rather than vendor APIs.
- IntelliScript needs a written script. Talking-head teaching that is improvised doesn't benefit unless a transcript is used as the "script".

### Gaps
- No reliable 2026 data was found on **CapCut**'s current talking-head features or price.
- No feature, language or API data was found for FireCut or TimeBolt beyond price. Whether FireCut detects repetitions wasn't verified.
- French support was not verified for AutoCut, FireCut, TimeBolt, Recut or Submagic.
- Whether DaVinci Resolve 20's AI transcription and IntelliScript are in the free version or Studio-only wasn't verified. Older info suggests the AI features are mostly Studio.
- Gling's official pricing wasn't seen (page blocked). The figures come from aggregators and may be outdated.

## 4. Interchange formats for handing cuts to an NLE, and MCP servers

### Takeaway
For a simple cut list from one or a few source files:
- **CMX3600 EDL** is the most universally importable (Premiere, Avid, Resolve) but low-fidelity.
- **FCP7 XML (xmeml)** works for Premiere and Resolve.
- **FCPXML** is for Final Cut and also Resolve.
- **OTIO** is imported natively by DaVinci Resolve (Free and Studio) since 18.5.

Python's OpenTimelineIO can write all of these through adapters, but XML written by OTIO has had Resolve import issues in the past. For live control, the DaVinci Resolve MCP servers (Studio required) let Claude build timelines directly.

### Cited Findings
- OTIO adapters:
  - Adapters exist for AAF, ALE, cmx_3600, fcp_xml, svg, xges and others.
  - `fcp_xml` (Final Cut Pro 7 XML) is a core plugin. `fcpx_xml` (FCP X) is a contrib plugin.
  - Since OTIO 0.16 or 0.17 they live in separate repos: [otio-fcp-adapter](https://github.com/OpenTimelineIO/otio-fcp-adapter) and [otio-fcpx-xml-adapter](https://github.com/OpenTimelineIO/otio-fcpx-xml-adapter). Install them with pip, or with `OpenTimelineIO-Plugins`.
  - Sources: [OTIO adapters doc on GitHub](https://github.com/PixarAnimationStudios/OpenTimelineIO/blob/master/docs/tutorials/adapters.md), [OTIO 0.16 plugin doc](https://opentimelineio.readthedocs.io/en/v0.16.0/tutorials/otio-plugins.html)
- Fidelity:
  - cmx_3600: low; cut lists and timecode only, no effects.
  - fcp_xml: medium; clips, tracks, simple effects, markers.
  - fcpx_xml: medium-high.
  - EDL import works in Premiere, Avid and Resolve.
  - Source: [media-os OTIO adapters reference](https://github.com/damionrashford/media-os/blob/main/.claude/skills/otio-docs/references/adapters.md). This is a secondary source.
- Known issue: "FCP XML: Da Vinci resolve can't load files written by adapter" — [OTIO issue #499](https://github.com/PixarAnimationStudios/OpenTimelineIO/issues/499). The issue is older, so check the current status.
- DaVinci Resolve OTIO:
  - Resolve has imported and exported OTIO and OTIOZ natively since 18.5, in **both Free and Studio**.
  - Import is a normal dialog (Timeline > Import Timeline) and needs no scripting.
  - Source: [VioletFlare blog](https://violetflare.ai/blog/davinci-resolve-otio-import/), [pulseedit](https://pulseedit.com/otio-import-davinci-resolve-free.html), [Resolve 18.6 manual](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part4004.htm)
  - Resolve also imports XML project files (FCP7 XML and FCPXML) — [Resolve 18.6 manual](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part1376.htm)
  - OTIO export through the scripting API was missing in early betas — [Blackmagic forum](https://forum.blackmagicdesign.com/viewtopic.php?f=38&t=180717)
- Premiere Pro:
  - Imports Final Cut Pro XML (FCP7 xmeml) — [Adobe help](https://helpx.adobe.com/premiere-pro/using/importing-xml-project-files-final.html)
  - Exports FCP XML — [Adobe help](https://helpx.adobe.com/premiere/desktop/render-and-export/export-files/export-a-project-as-a-final-cut-pro-xml-file.html)
  - Users complain that Premiere's XML import is outdated, since Final Cut 7 is no longer supported — [Adobe community](https://community.adobe.com/t5/premiere-pro-ideas/premiere-import-xml-is-outdated-final-cut-no-longer-supported/idi-p/13528893)
  - Premiere doesn't natively import FCPXML (FCP X). That is why third-party converters exist.
- Tools in practice:
  - Gling exports XML for Final Cut and XML or EDL for Premiere and Resolve — [Gling blog](https://www.gling.ai/blog/integrating-gling-with-your-existing-video-editing-workflow)
  - Recut exports XML and FCPXML to Premiere, Resolve and FCP — [itechguides](https://www.itechguides.com/products/recut-ai-video-editor/)
  - editassist uses `.otio` for Resolve, `.xml` for Premiere and `.fcpxml` for FCP. It bakes speed, crop and zoom first — [GitHub](https://github.com/edunascimentt/editassist)
  - Remotion can export to OTIO — [Remotion docs](https://www.remotion.dev/docs/export-opentimeline)
  - [ChatOctopus/timeline](https://github.com/ChatOctopus/timeline) is a library that imports and exports timelines for FCP, Premiere, Resolve and OTIO.
- MCP servers:
  - **samuelgursky/davinci-resolve-mcp**:
    - Full coverage of the Resolve Scripting API for 18.5+: timelines, media pool, Fusion, color, render queue.
    - The installer configures Claude Desktop, Claude Code, Cursor and others.
    - Version 2.0.1 claims 26 compound tools covering 324 API methods, 98.5% of them live-tested.
    - Sources: [glama](https://glama.ai/mcp/servers/@samuelgursky/davinci-resolve-mcp/blob/19dc53236193de61f79facc731024a75d3c3be5c/docs/VERSION.md), [playbooks](https://playbooks.com/mcp/samuel-gursky-davinci-resolve), [mcpservers.org](https://mcpservers.org/ja/servers/Tooflex/davinci-resolve-mcp)
  - **Tooflex/davinci-resolve-mcp** and **apvlv/davinci-resolve-mcp**: need **DaVinci Resolve Studio 18.0+** and Python 3.10+. They cover projects, timelines, markers, media import and running Python or Lua — [glama Tooflex README](https://glama.ai/mcp/servers/@Tooflex/davinci-resolve-mcp/blob/faa47aa8da61040e5674307305829c76f4f48d5e/README.md), [apvlv README](https://cdn.jsdelivr.net/gh/apvlv/davinci-resolve-mcp@main/README.md)
  - No Premiere Pro MCP server turned up in the searches done.

### Inferences
- Recommended for the user:
  - If they edit in **DaVinci Resolve (free)**, write an **.otio** file with the Python `opentimelineio` package (or an FCP7 XML). Import it through the menu. No Studio licence and no MCP needed.
  - If they edit in **Premiere**, write **FCP7 XML (xmeml)**, or an EDL as a fallback.
  - If they edit in **Final Cut**, write **FCPXML**.
  - EDL is the safest fallback everywhere for a single-track cut list. Its weaknesses are reel-name and timecode issues with camera files that lack embedded timecode.
- A Resolve MCP server only adds value if the user owns Resolve Studio. For a non-developer, file-based export is simpler and more reliable.
- Since XML generated by OTIO has had Resolve compatibility issues, any exporter should be tested on a short clip in the user's NLE version before being trusted.
- The simplest path of all needs no NLE: render the final MP4 directly with ffmpeg, as vincentventalon's skill does.

### Gaps
- An up-to-date (2026) compatibility matrix of which OTIO-generated XML versions import cleanly in Resolve 20 and Premiere 2026 wasn't found. The official OTIO docs were blocked.
- It wasn't verified whether the free version of Resolve 20 allows the external scripting API. MCP READMEs state that Studio is required.
- No reliable source on Premiere Pro's own OTIO support in 2026.
