import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// Mot mis en valeur : apparition rebondie, légère rotation, sortie rapide.
export const KeywordPop = ({ text, side, brand, fonts, width, height, vertical, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 9, stiffness: 180, mass: 0.6 } });
  const exit = interpolate(frame, [duration - 6, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = Math.min(vertical ? width * 0.13 : height * 0.11, (width * 0.8) / Math.max(4, text.length * 0.62));
  const left = side !== 'right';
  const rot = left ? -4 : 4;
  return (
    <AbsoluteFill
      style={{
        alignItems: vertical ? 'center' : left ? 'flex-start' : 'flex-end',
        justifyContent: 'flex-start',
        padding: vertical ? `${height * 0.13}px 0 0` : `${height * 0.1}px ${width * 0.06}px`,
      }}
    >
      <div
        style={{
          fontFamily: fonts.title,
          fontSize: size,
          color: brand.colors.dark,
          background: brand.colors.accent,
          padding: `${size * 0.12}px ${size * 0.35}px ${size * 0.04}px`,
          borderRadius: size * 0.22,
          boxShadow: `${size * 0.08}px ${size * 0.08}px 0 ${brand.colors.primary}`,
          transform: `scale(${pop * exit}) rotate(${rot * pop}deg)`,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
