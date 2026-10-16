import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

// Sous-titres mot à mot : le mot prononcé s'allume, les mots-clés sont soulignés.
export const Subtitles = ({ subtitles, harmonica, layout, brand, fonts, width, height }) => {
  const frame = useCurrentFrame();
  if (harmonica.some((h) => frame >= h.from && frame < h.to)) return null;
  const cur = subtitles.find((s) => frame >= s.from && frame < s.to);
  if (!cur) return null;
  const size = layout.subtitleSize;
  const local = frame - cur.from;
  const appear = interpolate(local, [0, 4], [0.92, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: height * layout.subtitleBottom }}>
      <div
        data-role="subtitle"
        style={{
          maxWidth: width * 0.9,
          background: brand.colors.subtitleBg,
          borderRadius: size * 0.35,
          padding: `${size * 0.22}px ${size * 0.45}px`,
          transform: `scale(${appear})`,
          fontFamily: fonts.text,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.18,
          textAlign: 'center',
        }}
      >
        {cur.lines.map((line, li) => (
          <div key={li} style={{ whiteSpace: 'nowrap' }}>
            {line.map((w, wi) => {
              const active = frame >= w.from && frame < Math.max(w.to, w.from + 3);
              const said = frame >= w.from;
              return (
                <span
                  key={wi}
                  style={{
                    color: active ? brand.colors.accent : said ? brand.colors.light : 'rgba(255,246,229,0.72)',
                    textDecoration: w.key ? `underline ${brand.colors.primary}` : 'none',
                    textDecorationThickness: size * 0.12,
                    textUnderlineOffset: size * 0.12,
                    display: 'inline-block',
                    marginRight: wi < line.length - 1 ? size * 0.26 : 0,
                  }}
                >
                  {w.t}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
