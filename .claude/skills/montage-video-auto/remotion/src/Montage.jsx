import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { ensureFonts } from './fonts.js';
import { Subtitles } from './components/Subtitles.jsx';
import { TitleBehind } from './components/TitleBehind.jsx';
import { KeywordPop } from './components/KeywordPop.jsx';
import { LowerThird } from './components/LowerThird.jsx';
import { HarmonicaBadge } from './components/HarmonicaBadge.jsx';
import { Cta } from './components/Cta.jsx';
import { Flash } from './components/Flash.jsx';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Facteur de zoom de la caméra à la frame donnée (zooms + coups de zoom des transitions).
function cameraScale(frame, zooms, transitions) {
  let s = 1;
  for (const z of zooms) {
    if (frame < z.from - 1 || frame > z.to + 10) continue;
    const ramp = z.slow ? Math.max(1, z.to - z.from) : 8;
    const inP = interpolate(frame, [z.from, z.from + ramp], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
    const outP = interpolate(frame, [z.to, z.to + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
    s = Math.max(s, 1 + (z.scale - 1) * Math.min(inP, outP));
  }
  for (const t of transitions) {
    if (frame < t.from || frame > t.to) continue;
    const mid = (t.from + t.to) / 2;
    s *= interpolate(frame, [t.from, mid, t.to], [1, 1.08, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  return s;
}

const Camera = ({ src, transparent, focusX, scale, trimBefore }) => (
  <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${focusX * 100}% 45%` }}>
    <OffthreadVideo
      src={staticFile(src)}
      muted
      transparent={transparent}
      trimBefore={trimBefore || undefined}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focusX * 100}% 50%` }}
    />
  </AbsoluteFill>
);

export const Montage = (props) => {
  const { video, brand, subtitles, elements, zooms, harmonica, layout, width, height } = props;
  const frame = useCurrentFrame();
  const fonts = ensureFonts(brand);
  const transitions = elements.filter((e) => e.type === 'transition');
  const scale = cameraScale(frame, zooms, transitions);
  const vertical = height > width;
  const ui = { brand, fonts, width, height, vertical };
  const behind = elements.filter((e) => e.type === 'titleBehind');

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.dark ?? '#000' }}>
      {video.src ? <Camera src={video.src} focusX={video.focusX} scale={scale} /> : null}

      {/* Textes placés derrière la personne : on les dessine, puis on repose la personne détourée par-dessus. */}
      {behind.map((e, i) => (
        <Sequence key={`tb${i}`} from={e.from} durationInFrames={e.to - e.from} layout="none">
          <TitleBehind {...ui} text={e.text} duration={e.to - e.from} />
          {video.fg ? <Camera src={video.fg} transparent trimBefore={e.from} focusX={video.focusX} scale={scale} /> : null}
        </Sequence>
      ))}

      {elements.map((e, i) => {
        const dur = e.to - e.from;
        let node = null;
        if (e.type === 'keyword') node = <KeywordPop {...ui} text={e.text} side={e.side} duration={dur} />;
        else if (e.type === 'lowerThird') node = <LowerThird {...ui} duration={dur} />;
        else if (e.type === 'harmonicaBadge') node = <HarmonicaBadge {...ui} text={e.text} duration={dur} />;
        else if (e.type === 'cta') node = <Cta {...ui} line1={e.line1} line2={e.line2} duration={dur} />;
        if (!node) return null;
        return (
          <Sequence key={`el${i}`} from={e.from} durationInFrames={dur} layout="none">
            {node}
          </Sequence>
        );
      })}

      <Subtitles {...ui} subtitles={subtitles} harmonica={harmonica} layout={layout} />

      {transitions.map((t, i) => (
        <Sequence key={`tr${i}`} from={t.from} durationInFrames={t.to - t.from} layout="none">
          <Flash duration={t.to - t.from} color={brand.colors.light} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
