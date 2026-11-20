import React from "react";
import { Composition } from "remotion";
import { TabPage } from "./TabImage";
import { VideoTab } from "./VideoTab";
import { VideoTab169 } from "./VideoTab169";
import { Intro, Outro, ShortOutro, Intro169, Outro169, Transition169 } from "./Screens";
import { PAGES, TITLE } from "./data";
import { Thumb169, Thumb916 } from "./Thumbnails";
import { AUDIO_SEC, BACKING_SEC, BACKING_OFFSET_BEATS, SHORT_FRAMES, INTRO_SUBTITLE, HARP_FR } from "./config";

// Données générées par scripts/build_render_data.py (data.ts, videoData.ts, config.ts).
// Durées : la partie tablature dure exactement l'audio (jamais l'inverse) ;
// intro (105 frames) et fin (180 / 165) sont rendues à part puis concaténées.
const F = 30;
export const INTRO_FRAMES = 105;
export const OUTRO_FRAMES = 180;
export const SHORT_OUTRO_FRAMES = 165;
export const TRANSITION_FRAMES = 120;

export const RemotionRoot: React.FC = () => (
  <>
    {PAGES.map((_, i) => (
      <Composition key={i} id={`Page${i + 1}`} component={TabPage} defaultProps={{ page: i }} durationInFrames={1} fps={F} width={1920} height={1080} />
    ))}

    {/* miniatures YouTube */}
    <Composition id="ThumbYT" component={Thumb169} durationInFrames={1} fps={F} width={1280} height={720} />
    <Composition id="ThumbShort" component={Thumb916} durationInFrames={1} fps={F} width={1080} height={1920} />

    {/* 9:16 */}
    <Composition id="Intro" component={Intro} defaultProps={{ title: TITLE, subtitle: INTRO_SUBTITLE }} durationInFrames={INTRO_FRAMES} fps={F} width={1080} height={1920} />
    <Composition id="Video" component={VideoTab} durationInFrames={Math.ceil(AUDIO_SEC * F)} fps={F} width={1080} height={1920} />
    <Composition id="Outro" component={Outro} durationInFrames={OUTRO_FRAMES} fps={F} width={1080} height={1920} />
    <Composition id="VideoShort" component={VideoTab} defaultProps={{ short: true }} durationInFrames={SHORT_FRAMES} fps={F} width={1080} height={1920} />
    <Composition id="ShortOutro" component={ShortOutro} durationInFrames={SHORT_OUTRO_FRAMES} fps={F} width={1080} height={1920} />

    {/* 16:9 */}
    <Composition id="Intro169" component={Intro169} defaultProps={{ title: TITLE, subtitle: INTRO_SUBTITLE }} durationInFrames={INTRO_FRAMES} fps={F} width={1920} height={1080} />
    <Composition id="Video169" component={VideoTab169} durationInFrames={Math.ceil(AUDIO_SEC * F)} fps={F} width={1920} height={1080} />
    <Composition id="Outro169" component={Outro169} durationInFrames={OUTRO_FRAMES} fps={F} width={1920} height={1080} />
    {BACKING_SEC > 0 && (
      <>
        <Composition id="Transition169" component={Transition169} defaultProps={{ title: TITLE, harp: HARP_FR }} durationInFrames={TRANSITION_FRAMES} fps={F} width={1920} height={1080} />
        <Composition id="Intro169Backing" component={Intro169} defaultProps={{ title: TITLE, subtitle: INTRO_SUBTITLE, tag: "Backing track · à toi de jouer !" }} durationInFrames={INTRO_FRAMES} fps={F} width={1920} height={1080} />
        <Composition id="Video169Backing" component={VideoTab169} defaultProps={{ backing: true, offsetBeats: BACKING_OFFSET_BEATS }} durationInFrames={Math.ceil(BACKING_SEC * F)} fps={F} width={1920} height={1080} />
      </>
    )}
  </>
);
