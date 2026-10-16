import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// Logo + site en bas à gauche (en haut en 9:16 pour laisser la place aux sous-titres).
export const LowerThird = ({ brand, fonts, width, height, vertical, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [duration - 10, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logo = vertical ? width * 0.17 : height * 0.15;
  const x = (1 - enter + exit) * -width * 0.5;
  return (
    <AbsoluteFill style={{ justifyContent: vertical ? 'flex-start' : 'flex-end', alignItems: 'flex-start', padding: vertical ? `${height * 0.05}px ${width * 0.05}px` : `${height * 0.06}px ${width * 0.035}px` }}>
      <div style={{ display: 'flex', alignItems: 'center', transform: `translateX(${x}px)`, marginBottom: vertical ? 0 : height * 0.17 }}>
        {brand.logo ? <Img src={staticFile(brand.logo)} style={{ width: logo, height: logo, objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,.4))' }} /> : null}
        <div
          style={{
            marginLeft: -logo * 0.12,
            padding: `${logo * 0.1}px ${logo * 0.22}px ${logo * 0.1}px ${logo * 0.22}px`,
            background: brand.colors.primary,
            color: brand.colors.light,
            fontFamily: fonts.text,
            fontWeight: 800,
            fontSize: logo * 0.2,
            borderRadius: logo * 0.12,
          }}
        >
          {brand.site}
        </div>
      </div>
    </AbsoluteFill>
  );
};
