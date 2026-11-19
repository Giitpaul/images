import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

// Miniature YouTube 1280×720 sur le fond fal.ai (escalier lumineux à droite).
// Rien d'important en bas à droite : YouTube y affiche la durée.
const C = {fond: '#0b1024', texte: '#fbf7ee', or: '#facc15', ton: '#2dd4bf', demi: '#f472b6'};
const FORMULE = [2, 2, 1, 2, 2, 2, 1];

export const Miniature: React.FC = () => (
	<AbsoluteFill style={{background: C.fond, overflow: 'hidden'}}>
		<style>{`
@font-face { font-family: 'Anton'; src: url('${staticFile('polices/Anton.woff2')}') format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 800; src: url('${staticFile('polices/Inter-ExtraBold.otf')}') format('opentype'); }
`}</style>
		<Img src={staticFile('fond_miniature.jpg')} style={{position: 'absolute', inset: 0, width: 1280, height: 720, objectFit: 'cover'}} />
		<AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(5,8,20,0.75) 0%, rgba(5,8,20,0.35) 45%, rgba(5,8,20,0) 62%)'}} />

		<div style={{position: 'absolute', left: 56, top: 70, whiteSpace: 'nowrap'}}>
			<div
				style={{
					display: 'inline-block',
					padding: '8px 22px',
					borderRadius: 999,
					background: C.demi,
					color: C.fond,
					fontFamily: 'Inter',
					fontWeight: 800,
					fontSize: 30,
					letterSpacing: 1,
				}}
			>
				EXPLIQUÉ SIMPLEMENT
			</div>
			<div style={{marginTop: 14, fontFamily: 'Anton', fontSize: 150, lineHeight: 1, color: C.texte, textShadow: '0 6px 0 rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.7)'}}>
				LA GAMME
			</div>
			<div style={{fontFamily: 'Anton', fontSize: 150, lineHeight: 1.02, color: C.or, textShadow: `0 6px 0 rgba(0,0,0,0.5), 0 0 50px ${C.or}66`}}>
				MAJEURE
			</div>
			<div style={{marginTop: 26, display: 'flex', gap: 12}}>
				{FORMULE.map((s, k) => {
					const c = s === 2 ? C.ton : C.demi;
					return (
						<div
							key={k}
							style={{
								width: s === 2 ? 72 : 60,
								height: 68,
								borderRadius: 16,
								background: c,
								boxShadow: `0 0 22px ${c}aa`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontFamily: 'Anton',
								fontSize: 42,
								color: C.fond,
							}}
						>
							{s === 2 ? '1' : '½'}
						</div>
					);
				})}
			</div>
		</div>

		<Img
			src={staticFile('logo-apprendre.png')}
			style={{position: 'absolute', left: 50, bottom: 22, width: 130, filter: 'drop-shadow(0 0 24px rgba(0,0,0,0.7))'}}
		/>
	</AbsoluteFill>
);
