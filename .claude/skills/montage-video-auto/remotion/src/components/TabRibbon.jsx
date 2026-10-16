import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Tablature en direct : la note jouée s'allume au centre, les suivantes attendent à droite, le ruban défile.
export const TabRibbon = ({ notes, label, brand, fonts, width, height, vertical, bands, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const unit = vertical ? width : height * 0.9;
  // En 16:9 avec une vidéo verticale, la tab va dans la bande libre de droite.
  const bandW = bands ? (bands.right[1] - bands.right[0]) * width : null;
  const panelW = bands ? bandW * 0.88 : width * (vertical ? 0.92 : 0.6);
  const cell = Math.min(unit * 0.2, panelW / 3.4);
  const title = label ? `Tab · ${label.replace('Harmonica', 'Harmo')}` : 'Tab';
  const labelSize = Math.min(cell * 0.2, (panelW * 0.9) / (title.length * 0.66));
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  let idx = -1;
  for (let i = 0; i < notes.length; i++) if (notes[i].from <= frame) idx = i;
  const glide = idx >= 0 ? interpolate(frame, [notes[idx].from, notes[idx].from + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }) : 1;
  const pos = Math.max(0, idx - 1 + glide);
  const anchor = panelW * 0.32;

  return (
    <AbsoluteFill
      style={bands
        ? { justifyContent: 'center', alignItems: 'flex-start', paddingLeft: bands.right[0] * width + (bandW - panelW) / 2 }
        : { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: height * (vertical ? 0.1 : 0.06) }}
    >
      <div
        style={{
          width: panelW,
          background: brand.colors.subtitleBg,
          borderRadius: cell * 0.28,
          border: `${Math.max(3, cell * 0.025)}px solid ${brand.colors.accent}`,
          padding: `${cell * 0.12}px 0 ${cell * 0.16}px`,
          overflow: 'hidden',
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * height * 0.08}px)`,
        }}
      >
        <div style={{ fontFamily: fonts.text, fontWeight: 800, fontSize: labelSize, color: brand.colors.accent, letterSpacing: labelSize * 0.04, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', marginBottom: cell * 0.04 }}>
          {title}
        </div>
        <div style={{ position: 'relative', height: cell * 1.08 }}>
          {notes.map((n, i) => {
            const x = anchor + (i - pos) * cell - cell / 2;
            if (x < -cell * 1.5 || x > panelW + cell) return null;
            const playing = i === idx && frame < Math.max(n.to + 12, n.from + 6);
            const past = i < idx || (i === idx && !playing);
            const pop = i === idx ? spring({ frame: frame - n.from, fps, config: { damping: 10, stiffness: 220, mass: 0.5 } }) : 0;
            const draw = n.tab.startsWith('-');
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: 0,
                  width: cell,
                  height: cell * 1.08,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: playing ? 1 : past ? 0.4 : 0.75,
                  transform: `scale(${playing ? 1 + 0.14 * pop : 0.86})`,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.title,
                    fontSize: cell * (n.tab.length > 4 ? 0.36 : 0.44),
                    lineHeight: 1,
                    padding: `${cell * 0.1}px ${cell * 0.08}px ${cell * 0.04}px`,
                    minWidth: cell * 0.82,
                    textAlign: 'center',
                    borderRadius: cell * 0.16,
                    color: playing ? brand.colors.dark : brand.colors.light,
                    background: playing ? (draw ? brand.colors.accent : brand.colors.light) : 'transparent',
                    boxShadow: playing ? `0 ${cell * 0.04}px 0 ${brand.colors.primary}` : 'none',
                  }}
                >
                  {n.tab}
                </div>
                <div style={{ fontFamily: fonts.text, fontWeight: 800, fontSize: cell * 0.16, color: brand.colors.light, marginTop: cell * 0.05, opacity: playing ? 1 : 0.8 }}>
                  {n.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
