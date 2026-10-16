import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// Grand titre d'ouverture. part="lines" : les lignes, posées derrière la personne détourée.
// part="sub" : l'étiquette, toujours devant. Position et taille calculées par la timeline (place).
export const TitleBehind = ({ part = 'lines', place, sub, brand, fonts, width, height, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { lines, size, align, top, left, width: boxW } = place;
  const exit = interpolate(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  const box = {
    position: 'absolute',
    top: height * top,
    left: left ?? width * 0.04,
    width: boxW ?? width * 0.92,
    display: 'flex',
    flexDirection: 'column',
    alignItems: justify,
    opacity: exit,
  };
  const linesH = lines.length * size * 0.98;

  if (part === 'sub') {
    if (!sub) return null;
    return (
      <AbsoluteFill>
        <div style={{ ...box, top: height * top + linesH + size * 0.18 }}>
          <div
            style={{
              fontFamily: fonts.text,
              fontWeight: 800,
              fontSize: size * 0.24,
              color: brand.colors.light,
              background: brand.colors.primary,
              padding: `${size * 0.05}px ${size * 0.16}px`,
              borderRadius: size * 0.1,
              whiteSpace: 'nowrap',
              opacity: interpolate(frame, [10, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame, [10, 18], [size * 0.2, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            }}
          >
            {sub}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <div style={box}>
        {lines.map((l, i) => {
          const enter = spring({ frame: frame - i * 4, fps, config: { damping: 13, mass: 0.7 } });
          return (
            <div
              key={i}
              style={{
                fontFamily: fonts.title,
                fontSize: size,
                lineHeight: 0.98,
                color: i === 0 ? brand.colors.light : brand.colors.accent,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                textShadow: `0 ${size * 0.06}px 0 ${brand.colors.primary}, 0 ${size * 0.1}px ${size * 0.25}px rgba(0,0,0,0.55)`,
                transform: `translateY(${(1 - enter) * size * 1.2}px) scale(${0.8 + 0.2 * enter})`,
                opacity: Math.min(1, enter * 1.5),
              }}
            >
              {l}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
