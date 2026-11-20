import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

// Miniature 1280×720 façon affiche imprimée en risographie :
// papier crème, grain, encres à plat, léger décalage de repérage, trame de points.
// Rien d'important en bas à droite : YouTube y affiche la durée.

const P = {
	papier: '#efe7d6',
	encre: '#1b1a2e',
	jaune: '#ffd23f',
	bleu: '#2f4bd8',
	rose: '#ff4fa0',
};
const NOTES = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NATURE = ['MAJ', 'min', 'min', 'MAJ', 'MAJ', 'min', 'dim'];
const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const couleur = (k: number) => (NATURE[k] === 'MAJ' ? P.jaune : NATURE[k] === 'min' ? P.bleu : P.rose);

const BLOC = 66;
const PAS_X = 80;
const X0 = 688;
const BAS = 548;

export const Miniature: React.FC = () => (
	<AbsoluteFill style={{background: P.papier, overflow: 'hidden'}}>
		<style>{`
@font-face { font-family: 'Anton'; src: url('${staticFile('polices/Anton.woff2')}') format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 800; src: url('${staticFile('polices/Inter-ExtraBold.otf')}') format('opentype'); }
@font-face { font-family: 'Mono'; font-weight: 700; src: url('${staticFile('polices/JetBrainsMono-Bold.ttf')}') format('truetype'); }
`}</style>

		{/* trame de points roses derrière les tours */}
		<div
			style={{
				position: 'absolute',
				left: 600,
				top: 40,
				width: 680,
				height: 680,
				backgroundImage: `radial-gradient(${P.rose} 34%, transparent 36%)`,
				backgroundSize: '13px 13px',
				opacity: 0.55,
				WebkitMaskImage: 'radial-gradient(circle at 55% 45%, black 0%, black 38%, transparent 62%)',
				maskImage: 'radial-gradient(circle at 55% 45%, black 0%, black 38%, transparent 62%)',
			}}
		/>

		{/* titre */}
		<div style={{position: 'absolute', left: 54, top: 58, fontFamily: 'Mono', fontWeight: 700, fontSize: 24, color: P.encre, letterSpacing: 2}}>
			HARMONISER LA GAMME
		</div>
		<div style={{position: 'absolute', left: 50, top: 92, fontFamily: 'Anton', fontSize: 132, lineHeight: 0.95, color: P.encre}}>7 NOTES</div>
		<div style={{position: 'absolute', left: 50, top: 220, fontFamily: 'Anton', fontSize: 146, lineHeight: 0.95}}>
			{/* repérage décalé : rose dessous, bleu dessus en produit */}
			<span style={{position: 'absolute', left: 7, top: 6, color: P.rose, whiteSpace: 'nowrap'}}>7 ACCORDS</span>
			<span style={{position: 'relative', color: P.bleu, mixBlendMode: 'multiply', whiteSpace: 'nowrap'}}>7 ACCORDS</span>
		</div>
		{/* question, surlignée au marqueur */}
		<div style={{position: 'absolute', left: 54, top: 420}}>
			<div style={{position: 'absolute', left: -8, top: 14, width: 585, height: 40, background: P.jaune, transform: 'rotate(-1.2deg)'}} />
			<div style={{position: 'relative', fontFamily: 'Inter', fontWeight: 800, fontSize: 44, color: P.encre, whiteSpace: 'nowrap'}}>
				Lesquels sonnent tristes ?
			</div>
		</div>

		{/* les sept tours */}
		{NOTES.map((_, k) => {
			const x = X0 + k * PAS_X;
			const c = couleur(k);
			return (
				<React.Fragment key={k}>
					<div style={{position: 'absolute', left: x, top: BAS - 3 * (BLOC + 8) - 46, width: BLOC, textAlign: 'center', fontFamily: 'Anton', fontSize: 34, color: P.encre}}>
						{ROMAINS[k]}
					</div>
					{[0, 1, 2].map((j) => (
						<div
							key={j}
							style={{
								position: 'absolute',
								left: x,
								top: BAS - (j + 1) * (BLOC + 8),
								width: BLOC,
								height: BLOC,
								background: c,
								border: `3px solid ${P.encre}`,
								boxShadow: `5px 5px 0 ${P.encre}`,
								boxSizing: 'border-box',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontFamily: 'Mono',
								fontWeight: 700,
								fontSize: 21,
								color: c === P.jaune ? P.encre : P.papier,
							}}
						>
							{NOTES[(k + 2 * j) % 7]}
						</div>
					))}
					<div
						style={{
							position: 'absolute',
							left: x - 6,
							top: BAS + 16,
							width: BLOC + 12,
							textAlign: 'center',
							fontFamily: 'Mono',
							fontWeight: 700,
							fontSize: 22,
							color: NATURE[k] === 'MAJ' ? P.encre : c,
							textDecoration: NATURE[k] === 'MAJ' ? 'none' : 'underline',
							textDecorationThickness: 3,
							textUnderlineOffset: 5,
						}}
					>
						{NATURE[k]}
					</div>
				</React.Fragment>
			);
		})}

		{/* tampon */}
		<div
			style={{
				position: 'absolute',
				left: 1040,
				top: 40,
				transform: 'rotate(7deg)',
				padding: '8px 16px',
				border: `4px solid ${P.rose}`,
				borderRadius: 8,
				fontFamily: 'Mono',
				fontWeight: 700,
				fontSize: 22,
				lineHeight: 1.15,
				color: P.rose,
				textAlign: 'center',
				mixBlendMode: 'multiply',
			}}
		>
			MAJEUR
			<br />
			ou mineur ?
		</div>

		{/* signature */}
		<Img src={staticFile('logo-apprendre.png')} style={{position: 'absolute', left: 48, bottom: 26, width: 120}} />
		<div style={{position: 'absolute', left: 182, bottom: 62, fontFamily: 'Mono', fontWeight: 700, fontSize: 20, color: P.encre, opacity: 0.8}}>
			apprendrelharmonica.com
		</div>

		{/* grain d'impression */}
		<svg width={1280} height={720} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.35}}>
			<filter id="grain">
				<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} />
				<feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0.55 0" />
			</filter>
			<rect width="1280" height="720" filter="url(#grain)" />
		</svg>
	</AbsoluteFill>
);
