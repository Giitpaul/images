import { Composition } from 'remotion';
import { Montage } from './Montage.jsx';

const defaults = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 90,
  video: { src: null, fg: null, focusX: 0.5 },
  brand: { colors: {}, fonts: {}, cta: {} },
  subtitles: [],
  elements: [],
  zooms: [],
  harmonica: [],
  layout: { subtitleBottom: 0.07, subtitleSize: 54 },
};

export const Root = () => (
  <Composition
    id="Montage"
    component={Montage}
    defaultProps={defaults}
    fps={30}
    width={1920}
    height={1080}
    durationInFrames={90}
    calculateMetadata={({ props }) => ({
      fps: props.fps,
      width: props.width,
      height: props.height,
      durationInFrames: Math.max(1, props.durationInFrames),
    })}
  />
);
