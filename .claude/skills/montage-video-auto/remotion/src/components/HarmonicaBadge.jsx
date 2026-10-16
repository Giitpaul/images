import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// Pendant le jeu d'harmonica : pas de sous-titres, une étiquette discrète avec des notes qui dansent.
export const HarmonicaBadge = ({ text, brand, fonts, width, height, vertical, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = vertical ? width * 0.055 : height * 0.045;
  return (
    <AbsoluteFill style={{ alignItems: vertical ? 'center' : 'flex-end', justifyContent: vertical ? 'flex-end' : 'flex-start', padding: vertical ? `0 0 ${height * 0.26}px` : `${height * 0.06}px ${width * 0.035}px` }}>
      <div
        style={{
          display: 'flex',
          gap: size * 0.4,
          alignItems: 'center',
          fontFamily: fonts.text,
          fontWeight: 800,
          fontSize: size,
          color: brand.colors.light,
          background: brand.colors.subtitleBg,
          border: `${Math.max(2, size * 0.08)}px solid ${brand.colors.accent}`,
          padding: `${size * 0.35}px ${size * 0.7}px`,
          borderRadius: size,
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 40}px)`,
        }}
      >
        <span>{text}</span>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ color: brand.colors.accent, transform: `translateY(${Math.sin((frame + i * 6) / 5) * size * 0.18}px)` }}>♪</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
