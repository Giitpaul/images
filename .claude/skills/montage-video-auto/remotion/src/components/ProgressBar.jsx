import { AbsoluteFill, useCurrentFrame } from 'remotion';

// Barre de progression fine en bas : donne envie d'aller au bout.
export const ProgressBar = ({ brand, height, duration }) => {
  const frame = useCurrentFrame();
  const h = Math.max(6, height * 0.006);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
      <div style={{ height: h, background: 'rgba(0,0,0,0.35)' }}>
        <div style={{ height: '100%', width: `${Math.min(1, frame / Math.max(1, duration - 1)) * 100}%`, background: brand.colors.accent }} />
      </div>
    </AbsoluteFill>
  );
};
