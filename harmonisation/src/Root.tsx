import React from 'react';
import {Composition, Still, staticFile} from 'remotion';
import {Miniature} from './Miniature';
import {MiniatureCine} from './MiniatureCine';
import {Props, Video} from './Video';
import {FPS, calculerReperes, f} from './synchro.mjs';

export const Root: React.FC = () => (
	<>
	<Still id="Miniature" component={Miniature} width={1280} height={720} />
	<Still id="MiniatureCine" component={MiniatureCine} width={1280} height={720} />
	<Composition
		id="Harmonisation"
		component={Video}
		width={1920}
		height={1080}
		fps={FPS}
		durationInFrames={f(170)}
		defaultProps={{R: null} as Props}
		calculateMetadata={async () => {
			const r = await fetch(staticFile('alignement.json'));
			if (!r.ok) throw new Error('public/alignement.json manquant : lance python3 scripts/aligner_signal.py');
			const R = calculerReperes(await r.json());
			return {durationInFrames: f(R.duree), props: {R}};
		}}
	/>
	</>
);
