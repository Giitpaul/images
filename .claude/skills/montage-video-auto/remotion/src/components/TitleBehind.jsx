import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// Grand titre posé derrière la personne (la personne détourée est redessinée par-dessus).
export const TitleBehind = ({ text, brand, fonts, width, height, vertical, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = String(text).split(/\s+/);
  const longest = Math.max(...words.map((w) => w.length), 4);
  const size = Math.min(height * (vertical ? 0.16 : 0.3), (width * 0.92) / (longest * 0.62));
  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const exit = interpolate(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: vertical ? 'flex-start' : 'center', paddingTop: vertical ? height * 0.12 : 0 }}>
      <div
        style={{
          fontFamily: fonts.title,
          fontSize: size,
          lineHeight: 0.95,
          color: brand.colors.light,
          textAlign: 'center',
          textTransform: 'uppercase',
          textShadow: `0 ${size * 0.06}px 0 ${brand.colors.primary}, 0 ${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.45)`,
          transform: `translateY(${(1 - enter) * height * 0.25}px) scale(${0.85 + 0.15 * enter})`,
          opacity: Math.min(enter * 1.4, 1) * exit,
          marginTop: vertical ? 0 : -height * 0.18,
          maxWidth: width * 0.94,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
