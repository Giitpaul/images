import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

// Transition : éclair lumineux bref, synchronisé avec le whoosh.
export const Flash = ({ duration, color }) => {
  const frame = useCurrentFrame();
  const mid = duration / 2;
  const o = interpolate(frame, [0, mid, duration], [0, 0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ backgroundColor: color ?? '#fff', opacity: o, mixBlendMode: 'screen' }} />;
};
