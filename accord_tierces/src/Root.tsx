import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Accord, AccordProps, Reperes} from './Accord';
import {FPS, calculerReperes, versFrame} from './synchro.mjs';
import config from '../config.json';

const AUDIO = config.AUDIO_MODE === 'B' ? 'voix_off_paul.wav' : 'voix_off.mp3';

export const Root: React.FC = () => (
	<Composition
		id="AccordTierces"
		component={Accord}
		width={1920}
		height={1080}
		fps={FPS}
		durationInFrames={versFrame(60)}
		defaultProps={{reperes: null, audio: AUDIO} as AccordProps}
		calculateMetadata={async () => {
			const reponse = await fetch(staticFile('alignement.json'));
			if (!reponse.ok) {
				throw new Error('public/alignement.json manquant. Lance d\'abord : npm run voix');
			}
			const reperes: Reperes = calculerReperes(await reponse.json());
			return {durationInFrames: versFrame(reperes.duree), props: {reperes, audio: AUDIO}};
		}}
	/>
);
