import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

// Miniature YouTube 1280×720. Décor néon par défaut (sans fond fal.ai).
// Rien d'important en bas à droite : YouTube y affiche la durée.

const C = {
	fond: '#0b0f1c',
	texte: '#fbf7ee',
	or: '#f6c344',
	tonique: '#ff6b57',
	tierce: '#f6c344',
	quinte: '#4fb0ff',
};

const Polices: React.FC = () => (
	<style>{`
@font-face { font-family: 'Anton'; src: url('${staticFile('polices/Anton.woff2')}') format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 800; src: url('${staticFile('polices/Inter-ExtraBold.otf')}') format('opentype'); }
`}</style>
);

const Orbe: React.FC<{x: number; y: number; r: number; couleur: string; opacite: number}> = ({x, y, r, couleur, opacite}) => (
	<div
		style={{
			position: 'absolute',
			left: x - r,
			top: y - r,
			width: r * 2,
			height: r * 2,
			borderRadius: '50%',
			background: `radial-gradient(circle, ${couleur} 0%, transparent 68%)`,
			opacity: opacite,
		}}
	/>
);

const D = 150; // diamètre des pastilles
const PILE_X = 905;
const PILE_Y = [575, 405, 235]; // Do, Mi, Sol

const Pastille: React.FC<{y: number; nom: string; couleur: string}> = ({y, nom, couleur}) => (
	<div
		style={{
			position: 'absolute',
			left: PILE_X - D / 2,
			top: y - D / 2,
			width: D,
			height: D,
			borderRadius: '50%',
			background: couleur,
			boxShadow: `0 0 50px ${couleur}aa, 0 0 0 6px ${C.fond}, 0 0 0 10px ${couleur}66`,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontFamily: 'Anton',
			fontSize: 74,
			color: C.fond,
		}}
	>
		{nom}
	</div>
);

// Accolade verticale, pointe vers la droite.
const accolade = (x: number, y1: number, y2: number, l: number) => {
	const m = (y1 + y2) / 2;
	const r = 16;
	const xm = x + l / 2;
	return `M ${x} ${y1} Q ${xm} ${y1} ${xm} ${y1 + r} L ${xm} ${m - r} Q ${xm} ${m} ${x + l} ${m} Q ${xm} ${m} ${xm} ${m + r} L ${xm} ${y2 - r} Q ${xm} ${y2} ${x} ${y2}`;
};

export const Miniature: React.FC = () => {
	const ACC_X = PILE_X + D / 2 + 26;
	return (
		<AbsoluteFill style={{background: C.fond, overflow: 'hidden'}}>
			<Polices />

			{/* Décor néon */}
			<Orbe x={980} y={380} r={430} couleur="#3b2a8f" opacite={0.75} />
			<Orbe x={1180} y={120} r={300} couleur={C.quinte} opacite={0.28} />
			<Orbe x={760} y={660} r={320} couleur={C.tonique} opacite={0.3} />
			<Orbe x={120} y={80} r={360} couleur="#c2245b" opacite={0.22} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 40% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)'}} />

			{/* Titre */}
			<div style={{position: 'absolute', left: 60, top: 128, width: 760, whiteSpace: 'nowrap'}}>
				<div
					style={{
						display: 'inline-block',
						padding: '8px 22px',
						borderRadius: 999,
						background: C.tonique,
						color: C.fond,
						fontFamily: 'Inter',
						fontWeight: 800,
						fontSize: 30,
						letterSpacing: 1,
					}}
				>
					EN 1 MINUTE
				</div>
				<div
					style={{
						marginTop: 18,
						fontFamily: 'Anton',
						fontSize: 136,
						lineHeight: 1.02,
						color: C.texte,
						textShadow: '0 6px 0 rgba(0,0,0,0.45), 0 0 40px rgba(0,0,0,0.6)',
					}}
				>
					LE SECRET
				</div>
				<div
					style={{
						fontFamily: 'Anton',
						fontSize: 136,
						lineHeight: 1.02,
						color: C.or,
						textShadow: `0 6px 0 rgba(0,0,0,0.45), 0 0 50px ${C.or}55`,
					}}
				>
					DES ACCORDS
				</div>
			</div>

			{/* Pile Do Mi Sol */}
			<svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
				<path d={accolade(ACC_X, PILE_Y[1] + 4, PILE_Y[0] - 4, 40)} fill="none" stroke={C.texte} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
				<path d={accolade(ACC_X, PILE_Y[2] + 4, PILE_Y[1] - 4, 40)} fill="none" stroke={C.texte} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			{[0, 1].map((k) => (
				<div
					key={k}
					style={{
						position: 'absolute',
						left: ACC_X + 56,
						top: (PILE_Y[k] + PILE_Y[k + 1]) / 2,
						transform: 'translateY(-50%)',
						fontFamily: 'Anton',
						fontSize: 46,
						color: C.texte,
						letterSpacing: 1,
					}}
				>
					TIERCE
				</div>
			))}
			<Pastille y={PILE_Y[0]} nom="Do" couleur={C.tonique} />
			<Pastille y={PILE_Y[1]} nom="Mi" couleur={C.tierce} />
			<Pastille y={PILE_Y[2]} nom="Sol" couleur={C.quinte} />

			{/* Logos */}
			<Img
				src={staticFile('logo-apprendre.png')}
				style={{position: 'absolute', right: 26, top: 22, width: 175, filter: 'drop-shadow(0 0 30px rgba(255,93,108,0.45))'}}
			/>
			<div style={{position: 'absolute', left: 60, bottom: 30, display: 'flex', alignItems: 'center', gap: 30}}>
				<Img src={staticFile('logo-brodur.png')} style={{width: 220}} />
				<Img src={staticFile('logo-ht.png')} style={{height: 92}} />
			</div>
		</AbsoluteFill>
	);
};

// Miniature verticale 1080×1920 (Shorts), même décor néon.
const PV = 210; // diamètre des pastilles
const PV_X = 470;
const PV_Y = [1430, 1195, 960]; // Do, Mi, Sol

export const MiniatureVerticale: React.FC = () => {
	const ACC = PV_X + PV / 2 + 34;
	const pastille = (y: number, nom: string, couleur: string) => (
		<div
			key={nom}
			style={{
				position: 'absolute',
				left: PV_X - PV / 2,
				top: y - PV / 2,
				width: PV,
				height: PV,
				borderRadius: '50%',
				background: couleur,
				boxShadow: `0 0 70px ${couleur}aa, 0 0 0 8px ${C.fond}, 0 0 0 13px ${couleur}66`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: 'Anton',
				fontSize: 104,
				color: C.fond,
			}}
		>
			{nom}
		</div>
	);
	return (
		<AbsoluteFill style={{background: C.fond, overflow: 'hidden'}}>
			<Polices />
			<Orbe x={540} y={1200} r={620} couleur="#3b2a8f" opacite={0.75} />
			<Orbe x={950} y={950} r={380} couleur={C.quinte} opacite={0.26} />
			<Orbe x={250} y={1550} r={420} couleur={C.tonique} opacite={0.3} />
			<Orbe x={160} y={260} r={460} couleur="#c2245b" opacite={0.22} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)'}} />

			<Img
				src={staticFile('logo-apprendre.png')}
				style={{position: 'absolute', left: 540 - 140, top: 70, width: 280, filter: 'drop-shadow(0 0 40px rgba(255,93,108,0.45))'}}
			/>
			<div style={{position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center'}}>
				<div
					style={{
						display: 'inline-block',
						padding: '10px 30px',
						borderRadius: 999,
						background: C.tonique,
						color: C.fond,
						fontFamily: 'Inter',
						fontWeight: 800,
						fontSize: 42,
					}}
				>
					EN 1 MINUTE
				</div>
				<div style={{marginTop: 20, fontFamily: 'Anton', fontSize: 150, lineHeight: 1.02, color: C.texte, textShadow: '0 7px 0 rgba(0,0,0,0.45)'}}>
					LE SECRET
				</div>
				<div style={{fontFamily: 'Anton', fontSize: 150, lineHeight: 1.02, color: C.or, textShadow: `0 7px 0 rgba(0,0,0,0.45), 0 0 50px ${C.or}55`}}>
					DES ACCORDS
				</div>
			</div>

			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<path d={accolade(ACC, PV_Y[1] + 6, PV_Y[0] - 6, 54)} fill="none" stroke={C.texte} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
				<path d={accolade(ACC, PV_Y[2] + 6, PV_Y[1] - 6, 54)} fill="none" stroke={C.texte} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			{[0, 1].map((k) => (
				<div
					key={k}
					style={{
						position: 'absolute',
						left: ACC + 76,
						top: (PV_Y[k] + PV_Y[k + 1]) / 2,
						transform: 'translateY(-50%)',
						fontFamily: 'Anton',
						fontSize: 64,
						color: C.texte,
					}}
				>
					TIERCE
				</div>
			))}
			{pastille(PV_Y[0], 'Do', C.tonique)}
			{pastille(PV_Y[1], 'Mi', C.tierce)}
			{pastille(PV_Y[2], 'Sol', C.quinte)}

			<div style={{position: 'absolute', left: 0, right: 0, top: 1640, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50}}>
				<Img src={staticFile('logo-brodur.png')} style={{width: 330}} />
				<Img src={staticFile('logo-ht.png')} style={{height: 140}} />
			</div>
		</AbsoluteFill>
	);
};
