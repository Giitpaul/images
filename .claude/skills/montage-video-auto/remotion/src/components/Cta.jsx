import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring } from 'remotion';

// Appel à l'action de fin : logo + abonnement + site.
export const Cta = ({ line1, line2, brand, fonts, width, height, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.025;
  const unit = vertical ? width : height;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: vertical ? height * 0.38 : height * 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: unit * 0.03, transform: `translateY(${(1 - enter) * height * 0.4}px)` }}>
        {brand.logo ? <Img src={staticFile(brand.logo)} style={{ width: unit * 0.2, height: unit * 0.2, objectFit: 'contain' }} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: unit * 0.012 }}>
          <div
            style={{
              fontFamily: fonts.title,
              fontSize: unit * 0.085,
              color: brand.colors.light,
              background: brand.colors.primary,
              padding: `${unit * 0.012}px ${unit * 0.03}px 0`,
              borderRadius: unit * 0.02,
              transform: `scale(${pulse})`,
              transformOrigin: 'left center',
            }}
          >
            {line1}
          </div>
          <div style={{ fontFamily: fonts.text, fontWeight: 800, fontSize: unit * 0.04, color: brand.colors.light, background: brand.colors.subtitleBg, padding: `${unit * 0.008}px ${unit * 0.02}px`, borderRadius: unit * 0.012 }}>
            {line2}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
