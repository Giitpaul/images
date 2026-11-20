import React from 'react';
import {AbsoluteFill, Audio, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS, NATURE, NOMS, ROMAINS, nomDegre, nomRe} from './synchro.mjs';

export type Props = {R: Record<string, any> | null};

// ---------- Palette ----------
const C = {
	fond: '#0b1024',
	texte: '#fbf7ee',
	doux: '#9aa3c7',
	neutre: '#26305a',
	neutreBord: '#46528f',
	racine: '#ff6b57',
	tierce: '#2dd4bf',
	quinte: '#a78bfa',
	maj: '#facc15',
	min: '#60a5fa',
	dim: '#f472b6',
	demi: '#f472b6',
	blanche: '#f4f1ea',
};
const COUL_NATURE = (k: number) => (NATURE[k] === 'majeur' ? C.maj : NATURE[k] === 'mineur' ? C.min : C.dim);
const COUL_TON = [C.racine, C.tierce, C.quinte];
const ANTON = 'Anton';
const INTER = 'Inter';

// ---------- Temps ----------
const doux = (t: number, a: number, d = 0.5) =>
	spring({frame: Math.round((t - a) * FPS), fps: FPS, config: {damping: 200}, durationInFrames: Math.max(1, Math.round(d * FPS))});
const rebond = (t: number, a: number) => spring({frame: Math.round((t - a) * FPS), fps: FPS, config: {damping: 11, stiffness: 160, mass: 0.7}});
const fenetre = (t: number, a: number, b: number, e = 0.35) => doux(t, a, e) * (1 - doux(t, b - e, e));
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pulse = (t: number, a: number, d = 0.6) => (t >= a && t < a + d ? Math.sin((Math.PI * (t - a)) / d) : 0);

// ---------- Briques ----------
const Pastille: React.FC<{x: number; y: number; txt: string; bg: string; fg?: string; s?: number; o?: number; w?: number; h?: number; glow?: number; bord?: string; taille?: number}> = ({
	x,
	y,
	txt,
	bg,
	fg = C.fond,
	s = 1,
	o = 1,
	w = 150,
	h = 84,
	glow = 0,
	bord,
	taille = 46,
}) => (
	<div
		style={{
			position: 'absolute',
			left: x - w / 2,
			top: y - h / 2,
			width: w,
			height: h,
			borderRadius: h / 2,
			background: bg,
			border: bord ? `4px solid ${bord}` : 'none',
			boxSizing: 'border-box',
			boxShadow: glow > 0 ? `0 0 ${40 * glow}px ${bord ?? bg}` : '0 8px 20px rgba(0,0,0,0.35)',
			transform: `scale(${s})`,
			opacity: o,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontFamily: ANTON,
			fontSize: taille,
			color: fg,
		}}
	>
		{txt}
	</div>
);

const Legende: React.FC<{t: number; a: number; b: number; children: React.ReactNode; y?: number; taille?: number}> = ({t, a, b, children, y = 72, taille = 58}) => {
	const o = fenetre(t, a, b, 0.3);
	if (o <= 0.001) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: y,
				textAlign: 'center',
				opacity: o,
				transform: `translateY(${(1 - doux(t, a, 0.45)) * 30}px)`,
				fontFamily: INTER,
				fontWeight: 800,
				fontSize: taille,
				color: C.texte,
				textShadow: '0 4px 20px rgba(0,0,0,0.6)',
				whiteSpace: 'nowrap',
			}}
		>
			{children}
		</div>
	);
};
const M: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => <span style={{color: c}}>{children}</span>;

const Soleil: React.FC<{x: number; y: number; s: number; o?: number; t: number}> = ({x, y, s, o = 1, t}) => (
	<svg width={160} height={160} viewBox="-80 -80 160 160" style={{position: 'absolute', left: x - 80, top: y - 80, transform: `scale(${s}) rotate(${t * 20}deg)`, opacity: o}}>
		{Array.from({length: 10}).map((_, i) => {
			const a = (i / 10) * Math.PI * 2;
			return <line key={i} x1={Math.cos(a) * 42} y1={Math.sin(a) * 42} x2={Math.cos(a) * 62} y2={Math.sin(a) * 62} stroke={C.maj} strokeWidth={9} strokeLinecap="round" />;
		})}
		<circle r={32} fill={C.maj} style={{filter: `drop-shadow(0 0 16px ${C.maj})`}} />
	</svg>
);
const Nuage: React.FC<{x: number; y: number; s: number; o?: number; t: number; pluie?: boolean}> = ({x, y, s, o = 1, t, pluie = true}) => (
	<svg width={200} height={180} viewBox="-100 -80 200 180" style={{position: 'absolute', left: x - 100, top: y - 80, transform: `scale(${s})`, opacity: o}}>
		{pluie &&
			Array.from({length: 5}).map((_, i) => {
				const p = ((t * 1.6 + i * 0.37) % 1) * 60;
				return <line key={i} x1={-48 + i * 24} y1={22 + p} x2={-54 + i * 24} y2={38 + p} stroke={C.min} strokeWidth={5} strokeLinecap="round" opacity={1 - p / 60} />;
			})}
		<g fill="#9fb4d8" style={{filter: `drop-shadow(0 0 12px ${C.min}88)`}}>
			<circle cx={-30} cy={0} r={28} />
			<circle cx={8} cy={-16} r={36} />
			<circle cx={42} cy={2} r={26} />
			<rect x={-58} y={0} width={126} height={28} rx={14} />
		</g>
	</svg>
);
const Eclair: React.FC<{x: number; y: number; s: number; o?: number}> = ({x, y, s, o = 1}) => (
	<svg width={120} height={140} viewBox="-60 -70 120 140" style={{position: 'absolute', left: x - 60, top: y - 70, transform: `scale(${s})`, opacity: o}}>
		<polygon points="10,-60 -30,8 -2,8 -14,62 30,-10 2,-10" fill={C.dim} style={{filter: `drop-shadow(0 0 14px ${C.dim})`}} />
	</svg>
);

// Accolade verticale (pointe à droite) entre y1 et y2
const accolade = (x: number, y1: number, y2: number, l: number) => {
	const m = (y1 + y2) / 2;
	const r = 12;
	const xm = x + l / 2;
	return `M ${x} ${y1} Q ${xm} ${y1} ${xm} ${y1 + r} L ${xm} ${m - r} Q ${xm} ${m} ${x + l} ${m} Q ${xm} ${m} ${xm} ${m + r} L ${xm} ${y2 - r} Q ${xm} ${y2} ${x} ${y2}`;
};

// ---------- Clavier (pour compter les demi tons) ----------
const BLANCHES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
const estNoire = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
const NOM_CLAVIER: Record<number, string> = {60: 'Do', 62: 'Ré', 64: 'Mi', 65: 'Fa', 67: 'Sol', 69: 'La', 71: 'Si', 72: 'Do', 74: 'Ré', 76: 'Mi', 77: 'Fa', 79: 'Sol'};
const LB = 120;
const KX = (1920 - BLANCHES.length * LB) / 2;
const KY = 600;
const KH = 380;
const keyX = (m: number) => (!estNoire(m) ? KX + BLANCHES.indexOf(m) * LB + LB / 2 : KX + (BLANCHES.indexOf(m - 1) + 1) * LB);

const Clavier: React.FC<{allume: (m: number) => string | null; nomNoire: (m: number) => string; o: number; dy: number}> = ({allume, nomNoire, o, dy}) => (
	<div style={{position: 'absolute', inset: 0, opacity: o, transform: `translateY(${dy}px)`}}>
		<div style={{position: 'absolute', left: KX - 18, top: KY - 18, width: BLANCHES.length * LB + 36, height: KH + 36, borderRadius: 26, background: 'linear-gradient(180deg, #232a4a, #141932)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)'}} />
		{BLANCHES.map((m) => {
			const a = allume(m);
			return (
				<div
					key={m}
					style={{
						position: 'absolute',
						left: keyX(m) - LB / 2 + 3,
						top: KY,
						width: LB - 6,
						height: KH,
						borderRadius: '0 0 16px 16px',
						background: a ? `linear-gradient(180deg, ${C.blanche}, ${a})` : C.blanche,
						boxShadow: a ? `0 0 40px ${a}` : 'none',
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'center',
						paddingBottom: 22,
						boxSizing: 'border-box',
						fontFamily: INTER,
						fontWeight: 800,
						fontSize: 32,
						color: '#2a2f45',
					}}
				>
					{NOM_CLAVIER[m]}
				</div>
			);
		})}
		{[61, 63, 66, 68, 70, 73, 75, 78].map((m) => {
			const a = allume(m);
			return (
				<div
					key={m}
					style={{
						position: 'absolute',
						left: keyX(m) - 37,
						top: KY,
						width: 74,
						height: 235,
						borderRadius: '0 0 12px 12px',
						background: a ?? 'linear-gradient(180deg, #2b2f42, #1a1d2b)',
						boxShadow: a ? `0 0 40px ${a}` : '0 6px 10px rgba(0,0,0,0.5)',
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'center',
						paddingBottom: 14,
						boxSizing: 'border-box',
						fontFamily: INTER,
						fontWeight: 800,
						fontSize: 24,
						color: C.fond,
					}}
				>
					{a ? nomNoire(m) : ''}
				</div>
			);
		})}
	</div>
);

const Arc: React.FC<{de: number; a: number; p: number; couleur: string; label: string; o: number; grand?: boolean; taille?: number}> = ({de, a, p, couleur, label, o, grand, taille = 40}) => {
	const x1 = keyX(de);
	const x2 = keyX(a);
	const h = (grand ? 210 : 60) + Math.abs(x2 - x1) * (grand ? 0.15 : 0.3);
	const y = KY - 12;
	const xm = (x1 + x2) / 2;
	const yc = y - 2 * h;
	const pt = (q: number) => ({x: (1 - q) ** 2 * x1 + 2 * (1 - q) * q * xm + q ** 2 * x2, y: (1 - q) ** 2 * y + 2 * (1 - q) * q * yc + q ** 2 * y});
	const pts: string[] = [];
	for (let i = 0; i <= Math.round(24 * clamp(p)); i++) {
		const q = pt(i / 24);
		pts.push(`${q.x},${q.y}`);
	}
	const s = pt(0.5);
	return (
		<>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: o}}>
				<polyline points={pts.join(' ')} fill="none" stroke={couleur} strokeWidth={grand ? 9 : 6} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px ${couleur})`}} />
			</svg>
			<div style={{position: 'absolute', left: s.x, top: s.y - (grand ? 50 : 34), transform: `translate(-50%, -50%) scale(${clamp(p * 2 - 0.6)})`, opacity: o, fontFamily: ANTON, fontSize: taille, color: couleur, whiteSpace: 'nowrap', textShadow: `0 0 18px ${couleur}88`}}>
				{label}
			</div>
		</>
	);
};

// ---------- Décor ----------
const Fond: React.FC<{t: number; chaud: number; froid: number}> = ({t, chaud, froid}) => {
	const blob = (x: number, y: number, r: number, c: string, o: number, v: number) => (
		<div style={{position: 'absolute', left: x + Math.sin(t * 0.25 * v) * 120 - r, top: y + Math.cos(t * 0.21 * v) * 90 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${c} 0%, transparent 68%)`, opacity: o}} />
	);
	return (
		<AbsoluteFill style={{background: C.fond, overflow: 'hidden'}}>
			{blob(300, 200, 520, '#3b2a8f', 0.55, 1)}
			{blob(1600, 300, 480, '#0e7490', 0.42, 1.3)}
			{blob(900, 1000, 560, '#9d174d', 0.3, 0.8)}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 70% 20%, rgba(251,191,36,0.35), transparent 60%)', opacity: chaud}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.35), transparent 60%)', opacity: froid}} />
			{Array.from({length: 12}).map((_, i) => {
				const v = 0.02 + (i % 5) * 0.006;
				const y = 1150 - ((t * v * 1000 + i * 173) % 1300);
				return (
					<div key={i} style={{position: 'absolute', left: ((i * 157 + 80) % 1920) + Math.sin(t + i) * 20, top: y, fontSize: 34 + (i % 3) * 14, color: '#fff', opacity: 0.06}}>
						{i % 2 ? '♪' : '♫'}
					</div>
				);
			})}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.5) 100%)'}} />
		</AbsoluteFill>
	);
};

const Polices: React.FC = () => (
	<style>{`
@font-face { font-family: 'Anton'; src: url('${staticFile('polices/Anton.woff2')}') format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 800; src: url('${staticFile('polices/Inter-ExtraBold.otf')}') format('opentype'); }
`}</style>
);

// ---------- Géométrie des tours ----------
const TX = (k: number) => 960 + (k - 3) * 235;
const TY = [800, 700, 600]; // fondamentale, tierce, quinte
const RANGEE11 = (i: number) => 960 + (i - 5) * 150;
const RANGEE7 = (i: number) => 960 + (i - 3) * 170;

// La suite majeur / mineur / diminué, une pastille au dessus de chaque tour
const LIBELLES = ['MAJEUR', 'mineur', 'mineur', 'MAJEUR', 'MAJEUR', 'mineur', 'diminué'];
const SuiteChips: React.FC<{t: number; temps: number[]; y: number; o: number}> = ({t, temps, y, o}) => {
	if (o <= 0.001) return null;
	return (
		<div style={{position: 'absolute', inset: 0, opacity: o}}>
			{LIBELLES.map((l, k) => {
				if (t < temps[k]) return null;
				const c = COUL_NATURE(k);
				const actif = pulse(t, temps[k], 0.6);
				return (
					<div
						key={k}
						style={{
							position: 'absolute',
							left: TX(k),
							top: y,
							transform: `translate(-50%, -50%) scale(${rebond(t, temps[k]) * (1 + 0.15 * actif)})`,
							padding: '6px 18px',
							borderRadius: 999,
							background: c,
							boxShadow: `0 0 ${20 + 30 * actif}px ${c}`,
							fontFamily: ANTON,
							fontSize: 40,
							color: C.fond,
							whiteSpace: 'nowrap',
						}}
					>
						{l}
					</div>
				);
			})}
		</div>
	);
};

// ---------- Vidéo ----------
export const Video: React.FC<Props> = ({R}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	if (!R) return <AbsoluteFill style={{background: C.fond}} />;

	const L = R.lignes as {sur: number; notes: number[]}[];
	const MES = R.mesures as {racine: number; tierce: number; intervalle: number; nature: number}[];
	const debutD = L[0].sur;

	const vA = 1 - doux(t, R.rappel - 0.4, 0.4);
	const vB = fenetre(t, R.rappel, debutD, 0.4);
	const vD = fenetre(t, debutD, R.toutSeJoue, 0.4);
	const vF = fenetre(t, R.toutSeJoue, R.attention, 0.45);
	const vG = fenetre(t, R.mesure, R.exempleRe, 0.5);
	const vFin = 1 - doux(t, R.duree - 0.8, 0.7);

	// Ambiance
	const chaud = fenetre(t, R.gai, R.accordMineur, 0.6) * 0.9 + fenetre(t, R.differenceFin, R.differenceFin + 1.0, 0.2) * 0.8;
	const froid = fenetre(t, R.melancolique, R.ecoute, 0.6) * 0.9 + fenetre(t, R.differenceFin + 1.0, R.attention, 0.2) * 0.8;

	// ---------- A : accroche ----------
	const accroche = vA > 0.001 && (
		<div style={{position: 'absolute', inset: 0, opacity: vA}}>
			{NOMS.map((n, k) => {
				const pApp = rebond(t, R.septNotes + k * 0.08);
				const mv = doux(t, R.septAccords + k * 0.06, 0.6);
				const x = RANGEE7(k) + (TX(k) - RANGEE7(k)) * mv;
				const y = 480 + (TY[0] - 480) * mv;
				const vague = R.entendent <= t ? pulse(t, R.accrocheFin + [0, 3, 4, 0].indexOf(k) * 0.62, 0.5) : 0;
				const glowChord = [0, 3, 4, 0].map((kk, i) => (kk === k ? pulse(t, R.accrocheFin + i * 0.62, 0.5) : 0)).reduce((a, b) => Math.max(a, b), 0);
				return (
					<React.Fragment key={k}>
						{[1, 2].map((j) => (
							<Pastille key={j} x={TX(k)} y={TY[j]} txt={nomDegre(k + 2 * j)} bg={C.neutre} fg={C.texte} bord={glowChord > 0 ? C.maj : C.neutreBord} s={rebond(t, R.septAccords + 0.35 + k * 0.06 + j * 0.08)} glow={glowChord} />
						))}
						<Pastille x={x} y={y} txt={n} bg={C.racine} s={pApp * (1 + 0.1 * vague)} glow={glowChord} />
					</React.Fragment>
				);
			})}
			<div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: ANTON, fontSize: 130, color: C.texte, letterSpacing: 2}}>
				<span style={{display: 'inline-block', transform: `scale(${rebond(t, R.septNotes)})`}}>7 NOTES</span>
				<span style={{display: 'inline-block', marginLeft: 40, color: C.maj, transform: `scale(${rebond(t, R.septAccords)})`, textShadow: `0 0 40px ${C.maj}88`}}>
					= 7 ACCORDS
				</span>
			</div>
		</div>
	);

	// ---------- B / C : rappel et harmoniser ----------
	const rappel = vB > 0.001 && (
		<div style={{position: 'absolute', inset: 0, opacity: vB}}>
			{NOMS.map((n, i) => {
				const choisi = i === 0 ? R.prends1 : i === 2 ? R.prends2 : i === 4 ? R.recommences : null;
				const saute = i === 1 ? R.sautes : i === 3 ? R.recommences - 0.35 : null;
				const actif = choisi !== null && t >= choisi;
				const barre = saute !== null && t >= saute && t < R.maintenant;
				const curseur = t >= R.chaqueNote && t < R.harmoniser + 0.3 ? Math.floor((t - R.chaqueNote) / 0.2) % 7 === i : false;
				return (
					<React.Fragment key={i}>
						<Pastille
							x={RANGEE7(i)}
							y={420}
							txt={n}
							bg={actif && t < R.maintenant ? COUL_TON[i / 2] : C.neutre}
							fg={actif && t < R.maintenant ? C.fond : C.texte}
							bord={curseur ? C.maj : actif ? undefined : C.neutreBord}
							s={rebond(t, R.rappel + 0.2 + i * 0.06) * (choisi !== null ? 1 + 0.15 * pulse(t, choisi, 0.4) : 1) * (curseur ? 1.12 : 1)}
							o={barre ? 0.35 : 1}
							glow={curseur ? 1 : 0}
						/>
						{barre && (
							<div style={{position: 'absolute', left: RANGEE7(i), top: 420, transform: `translate(-50%, -50%) scale(${rebond(t, saute!)})`, fontFamily: ANTON, fontSize: 90, color: C.dim}}>✕</div>
						)}
					</React.Fragment>
				);
			})}
			{/* sauts au dessus de la rangée */}
			{[
				{de: 0, a: 2, t: R.sautes},
				{de: 2, a: 4, t: R.recommences - 0.35},
			].map((s, i) => {
				if (t < s.t || t >= R.maintenant) return null;
				const x1 = RANGEE7(s.de);
				const x2 = RANGEE7(s.a);
				const p = clamp((t - s.t) / 0.5);
				const pts: string[] = [];
				for (let q = 0; q <= Math.round(20 * p); q++) {
					const u = q / 20;
					pts.push(`${x1 + (x2 - x1) * u},${370 - Math.sin(Math.PI * u) * 110}`);
				}
				return (
					<React.Fragment key={i}>
						<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
							<polyline points={pts.join(' ')} fill="none" stroke={C.dim} strokeWidth={6} strokeDasharray="14 10" strokeLinecap="round" />
						</svg>
						<div style={{position: 'absolute', left: (x1 + x2) / 2, top: 230, transform: `translate(-50%, -50%) scale(${clamp(p * 2 - 0.5)})`, fontFamily: ANTON, fontSize: 40, color: C.dim}}>
							on saute !
						</div>
					</React.Fragment>
				);
			})}
			{/* pile Do Mi Sol */}
			{t < R.maintenant &&
				(R.doMiSol0 as number[]).map((tk, i) => {
					if (t < tk) return null;
					const p = doux(t, tk, 0.5);
					const x = RANGEE7(2 * i) + (960 - RANGEE7(2 * i)) * p;
					const y = 420 + ([900, 800, 700][i] - 420) * p - Math.sin(Math.PI * p) * 120;
					return <Pastille key={i} x={x} y={y} txt={NOMS[2 * i]} bg={COUL_TON[i]} glow={pulse(t, R.doMiSol0[2] + 0.55, 1.2)} />;
				})}
			{/* titre « harmoniser » */}
			{t >= R.harmoniser && (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 660,
						textAlign: 'center',
						fontFamily: ANTON,
						fontSize: 150,
						color: C.maj,
						textShadow: `0 0 50px ${C.maj}99, 0 8px 0 rgba(0,0,0,0.4)`,
						transform: `scale(${rebond(t, R.harmoniser)})`,
					}}
				>
					HARMONISER LA GAMME
				</div>
			)}
		</div>
	);

	// ---------- Tours d'accords (D, E, G, H) ----------
	const enG = t >= R.mesure;
	const ligneG = (() => {
		if (!enG || t >= R.retenir) return -1;
		if (t >= R.etSi) return 6;
		let k = -1;
		MES.forEach((m, i) => {
			if (t >= m.racine - 0.3) k = i;
		});
		return k;
	})();
	const natureVisible = (k: number) => (k < 6 ? t >= MES[k].nature : t >= R.siDiminue);
	const iconeVisible = (k: number) => {
		if (t >= R.mesure) return natureVisible(k) ? 1 : 0;
		if (NATURE[k] === 'majeur' && t >= R.joyeux) return 1;
		if (NATURE[k] === 'mineur' && t >= R.tristes) return 1;
		return 0;
	};
	const tIcone = (k: number) => (t >= R.mesure ? (k < 6 ? MES[k].nature : R.siDiminue) : NATURE[k] === 'majeur' ? R.joyeux : R.tristes);

	const vTours = vD > 0.001 ? vD : vG;
	const tours =
		vTours > 0.001 &&
		Array.from({length: 7}).map((_, k) => {
			const notesK = [k, k + 2, k + 4];
			let o = 1;
			if (enG && ligneG >= 0 && ligneG !== k && t < R.retenir) o = 0.35;
			// pulsations
			let pu = 0;
			[0, 4, 5, 3].forEach((kk, i) => {
				if (kk === k) pu = Math.max(pu, pulse(t, R.sonneBien + i * 0.65, 0.55));
			});
			if (t >= R.retenir) {
				const iMaj = [0, 3, 4].indexOf(k);
				const iMin = [1, 2, 5].indexOf(k);
				if (iMaj >= 0) pu = Math.max(pu, pulse(t, R.recapMaj[iMaj], 0.6));
				if (iMin >= 0) pu = Math.max(pu, pulse(t, R.recapMin[iMin], 0.6));
				if (k === 6) pu = Math.max(pu, pulse(t, R.recapDim, 0.6));
				pu = Math.max(pu, pulse(t, R.suite[k], 0.6));
			}
			const coul = COUL_NATURE(k);
			const humeur = (t >= R.joyeux && t < R.toutSeJoue && NATURE[k] !== 'diminué' && ((NATURE[k] === 'majeur') || t >= R.tristes)) || (t >= R.mesure && natureVisible(k));
			const sautY = -pu * 40;
			return (
				<div key={k} style={{position: 'absolute', inset: 0, opacity: o}}>
					{notesK.map((d, j) => {
						const tk = L[k].notes[j];
						if (vD > 0.001 && t < tk && t < R.famille) return null;
						let x = TX(k);
						let y = TY[j] + sautY;
						let s = 1;
						if (vD > 0.001 && t < R.famille) {
							const p = doux(t, tk, 0.55);
							x = RANGEE11(d) + (TX(k) - RANGEE11(d)) * p;
							y = 230 + (TY[j] - 230) * p - Math.sin(Math.PI * p) * 140;
							s = 0.85 + 0.15 * p;
						}
						const bg = humeur ? coul : COUL_TON[j];
						return <Pastille key={j} x={x} y={y} txt={nomDegre(d)} bg={bg} s={s * (1 + 0.08 * pu)} glow={humeur ? 0.5 + pu : pu} w={140} h={80} taille={44} />;
					})}
					{/* chiffre romain */}
					<div
						style={{
							position: 'absolute',
							left: TX(k),
							top: 885,
							transform: `translate(-50%, -50%) scale(${vD > 0.001 && t < R.famille ? rebond(t, L[k].sur) : 1})`,
							fontFamily: ANTON,
							fontSize: 50,
							color: humeur ? coul : C.doux,
						}}
					>
						{ROMAINS[k]}
					</div>
					{/* nature */}
					{t >= R.mesure && natureVisible(k) && (
						<div
							style={{
								position: 'absolute',
								left: TX(k),
								top: 950,
								transform: `translate(-50%, -50%) scale(${rebond(t, k < 6 ? MES[k].nature : R.siDiminue) * (1 + 0.15 * pu)})`,
								padding: '4px 16px',
								borderRadius: 999,
								background: coul,
								fontFamily: INTER,
								fontWeight: 800,
								fontSize: 30,
								color: C.fond,
								whiteSpace: 'nowrap',
							}}
						>
							{NATURE[k] === 'majeur' ? 'MAJEUR' : NATURE[k]}
						</div>
					)}
					{/* icône d'humeur */}
					{iconeVisible(k) > 0 &&
						(NATURE[k] === 'majeur' ? (
							<Soleil x={TX(k)} y={500 + sautY} s={rebond(t, tIcone(k)) * 0.8} t={t} />
						) : NATURE[k] === 'mineur' ? (
							<Nuage x={TX(k)} y={505 + sautY} s={rebond(t, tIcone(k)) * 0.7} t={t} />
						) : (
							<Eclair x={TX(k)} y={500} s={rebond(t, R.siDiminue) * 0.8} />
						))}
					{/* accolade de mesure */}
					{enG && t < R.retenir && ligneG === k && (
						<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
							{(k < 6 ? [[0, MES[k].tierce]] : [[0, R.siVersRe], [1, R.reVersFa]]).map(([j, tj]) =>
								t >= tj ? (
									<path
										key={j}
										d={accolade(TX(k) + 78, TY[j] - 4, TY[j + 1] + 4, 30)}
										fill="none"
										stroke={k < 6 && t >= MES[k].intervalle ? coul : k === 6 ? C.dim : C.texte}
										strokeWidth={6}
										strokeLinecap="round"
										opacity={doux(t, tj, 0.3)}
										style={{filter: `drop-shadow(0 0 8px ${k === 6 ? C.dim : coul})`}}
									/>
								) : null,
							)}
						</svg>
					)}
				</div>
			);
		});

	// Rangée de 11 notes (D)
	const rangee11 =
		vD > 0.001 && t < R.famille ? (
			<div style={{position: 'absolute', inset: 0, opacity: 1 - doux(t, R.famille - 0.6, 0.5)}}>
				{Array.from({length: 11}).map((_, i) => {
					const kCur = L.reduce((acc, l, k) => (t >= l.sur ? k : acc), -1);
					const role = kCur >= 0 ? [kCur, kCur + 2, kCur + 4].indexOf(i) : -1;
					const allume = role >= 0 && t >= L[kCur].notes[role];
					return (
						<Pastille
							key={i}
							x={RANGEE11(i)}
							y={230}
							txt={nomDegre(i)}
							bg={allume ? COUL_TON[role] : C.neutre}
							fg={allume ? C.fond : C.texte}
							bord={role === 0 ? C.racine : allume ? undefined : C.neutreBord}
							s={rebond(t, debutD + i * 0.04) * 0.82}
							o={i >= 7 ? 0.6 : 1}
							w={130}
							h={74}
							taille={40}
						/>
					);
				})}
				<div style={{position: 'absolute', left: RANGEE11(7) - 70, width: RANGEE11(10) - RANGEE11(7) + 140, top: 282, textAlign: 'center', fontFamily: INTER, fontWeight: 800, fontSize: 22, color: C.doux, opacity: 0.8}}>
					on continue après Si
				</div>
			</div>
		) : null;

	// Cadre « famille »
	const vFamille = fenetre(t, R.famille, R.toutSeJoue, 0.5);
	const cadre = vFamille > 0.001 && (
		<div style={{position: 'absolute', inset: 0, opacity: vFamille}}>
			<div
				style={{
					position: 'absolute',
					left: 110,
					top: 420,
					width: 1700,
					height: 580,
					borderRadius: 40,
					border: `5px solid ${C.maj}`,
					boxShadow: `0 0 40px ${C.maj}55, inset 0 0 40px ${C.maj}22`,
					transform: `scale(${0.96 + 0.04 * doux(t, R.famille, 0.6)})`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: 960,
					top: 420,
					transform: `translate(-50%, -50%) scale(${rebond(t, R.tonalite)})`,
					padding: '10px 34px',
					borderRadius: 999,
					background: C.maj,
					fontFamily: ANTON,
					fontSize: 48,
					color: C.fond,
					whiteSpace: 'nowrap',
				}}
			>
				TONALITÉ DE DO MAJEUR
			</div>
		</div>
	);

	// ---------- F : majeur / mineur sur le clavier ----------
	const allumeF = (m: number): string | null => {
		const tt = t;
		if (tt >= R.accordMajeur && tt < R.accordMineur) {
			if (m === 60 && tt >= R.deDoAMi[1]) return C.racine;
			if (m === 64 && tt >= R.deDoAMi[3]) return C.maj;
			const dt = (R.deuxTons1 - R.deDoAMi[1]) / 4;
			const i = m - 60;
			if (i >= 1 && i <= 3 && tt >= R.deDoAMi[1] + i * dt && tt < R.deuxTons1 + 0.6) return '#fda4af';
		}
		if (tt >= R.accordMineur && tt < R.ecoute) {
			if (m === 69 && tt >= R.deLaADo[1]) return C.racine;
			if (m === 72 && tt >= R.deLaADo[3]) return C.min;
			const dt = (R.unTonDemi1 - R.deLaADo[1]) / 3;
			const i = m - 69;
			if (i >= 1 && i <= 2 && tt >= R.deLaADo[1] + i * dt && tt < R.unTonDemi1 + 0.6) return '#93c5fd';
		}
		if (tt >= R.ecoute && tt < R.baisse) {
			const i = [60, 64, 67].indexOf(m);
			if (i >= 0 && tt >= R.doMiSol1[i]) return C.maj;
		}
		if (tt >= R.baisse && tt < R.doMineur) {
			if (m === 60 || m === 67) return C.maj;
			if (m === 64 && tt < R.devient + 0.5) return '#fb7185';
			if (m === 63 && tt >= R.devient + 0.5) return C.min;
		}
		if (tt >= R.doMineur && tt < R.differenceFin) {
			const i = [60, 63, 67].indexOf(m);
			const tk = [R.doMibSol[0], R.doMibSol[1], R.doMibSol[3]];
			if (i >= 0 && tt >= tk[i]) return C.min;
		}
		if (tt >= R.differenceFin && tt < R.differenceFin + 1.0 && [60, 64, 67].includes(m)) return C.maj;
		if (tt >= R.differenceFin + 1.0 && tt < R.attention && [60, 63, 67].includes(m)) return C.min;
		return null;
	};
	const arcsF: React.ReactNode[] = [];
	if (vF > 0.001) {
		const demiTons = (de: number, n: number, t0: number, t1: number, cle: string, coul: string, label: string, fin: number) => {
			const dt = (t1 - t0) / n;
			for (let i = 0; i < n; i++) {
				const a = t0 + i * dt;
				if (t >= a && t < fin) arcsF.push(<Arc key={`${cle}${i}`} de={de + i} a={de + i + 1} p={clamp((t - a) / Math.max(0.12, dt * 0.9))} couleur={C.demi} label="½" o={1} taille={34} />);
			}
			if (t >= t1 && t < fin) arcsF.push(<Arc key={`${cle}g`} de={de} a={de + n} p={clamp((t - t1) / 0.5)} couleur={coul} label={label} o={1} grand taille={64} />);
		};
		demiTons(60, 4, R.deDoAMi[1], R.deuxTons1, 'maj', C.maj, '2 TONS', R.accordMineur);
		demiTons(69, 3, R.deLaADo[1], R.unTonDemi1, 'min', C.min, '1 TON ½', R.ecoute);
		if (t >= R.avecTierce && t < R.baisse) arcsF.push(<Arc key="tmaj" de={60} a={64} p={clamp((t - R.avecTierce) / 0.6)} couleur={C.maj} label="TIERCE MAJEURE" o={1} grand taille={52} />);
		if (t >= R.intervalleMib && t < R.differenceFin) arcsF.push(<Arc key="tmin" de={60} a={63} p={clamp((t - R.intervalleMib) / 0.6)} couleur={C.min} label="TIERCE MINEURE" o={1} grand taille={52} />);
		if (t >= R.devient && t < R.doMineur) {
			const p = clamp((t - R.devient) / 0.5);
			arcsF.push(
				<div key="fleche" style={{position: 'absolute', left: (keyX(64) + keyX(63)) / 2, top: KY - 80, transform: `translate(-50%, -50%) scale(${rebond(t, R.devient)})`, fontFamily: ANTON, fontSize: 60, color: C.min, whiteSpace: 'nowrap', opacity: p}}>
					← ½ ton
				</div>,
			);
		}
	}
	const iconesF = vF > 0.001 && (
		<>
			{t >= R.gai && t < R.accordMineur && <Soleil x={1560} y={300} s={rebond(t, R.gai) * 1.3} t={t} />}
			{t >= R.melancolique && t < R.ecoute && <Nuage x={1560} y={300} s={rebond(t, R.melancolique) * 1.2} t={t} />}
			{t >= R.differenceFin && t < R.differenceFin + 1.0 && <Soleil x={1560} y={300} s={rebond(t, R.differenceFin) * 1.2} t={t} />}
			{t >= R.differenceFin + 1.0 && t < R.attention && <Nuage x={1560} y={300} s={rebond(t, R.differenceFin + 1.0) * 1.1} t={t} />}
			{t >= R.toutSeJoue && t < R.accordMajeur && (
				<div style={{position: 'absolute', inset: 0, opacity: fenetre(t, R.toutSeJoue, R.accordMajeur, 0.3)}}>
					{[0, 1, 2].map((j) => (
						<Pastille key={j} x={960} y={[820, 700, 580][j]} txt={['Do', 'Mi', 'Sol'][j]} bg={COUL_TON[j]} s={rebond(t, R.toutSeJoue + j * 0.08) * 1.15} o={j === 2 ? 0.4 : 1} glow={j < 2 ? 0.6 : 0} />
					))}
					<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
						<path d={accolade(1060, 700, 820, 40)} fill="none" stroke={C.maj} strokeWidth={7} strokeLinecap="round" opacity={doux(t, R.toutSeJoue + 0.6, 0.4)} />
					</svg>
					<div style={{position: 'absolute', left: 1130, top: 760, transform: `translateY(-50%) scale(${rebond(t, R.toutSeJoue + 0.8)})`, fontFamily: ANTON, fontSize: 100, color: C.maj}}>?</div>
					<div style={{position: 'absolute', left: 860, top: 820, transform: 'translate(-100%, -50%)', fontFamily: ANTON, fontSize: 40, color: C.racine, opacity: doux(t, R.toutSeJoue + 0.4)}}>note 1</div>
					<div style={{position: 'absolute', left: 860, top: 700, transform: 'translate(-100%, -50%)', fontFamily: ANTON, fontSize: 40, color: C.tierce, opacity: doux(t, R.toutSeJoue + 0.5)}}>note 2</div>
				</div>
			)}
		</>
	);
	const vClavier = fenetre(t, R.accordMajeur - 0.3, R.attention, 0.45);

	// ---------- G : bulle de mesure ----------
	let bulle: React.ReactNode = null;
	if (enG && t < R.retenir && ligneG >= 0) {
		const k = ligneG;
		const coul = COUL_NATURE(k);
		const partie = (a: number, contenu: React.ReactNode, cle: string) =>
			t >= a ? (
				<span key={cle} style={{display: 'inline-block', marginRight: 22, transform: `scale(${rebond(t, a)})`}}>
					{contenu}
				</span>
			) : null;
		const lignes: React.ReactNode[] = [];
		if (k < 6) {
			const m = MES[k];
			lignes.push(
				<div key="l" style={{whiteSpace: 'nowrap'}}>
					{partie(m.racine, <M c={C.racine}>{nomDegre(k)}</M>, 'a')}
					{partie(m.racine + 0.2, <M c={C.doux}>→</M>, 'b')}
					{partie(m.tierce, <M c={C.tierce}>{nomDegre(k + 2)}</M>, 'c')}
					{partie(m.intervalle, <M c={coul}>{NATURE[k] === 'majeur' ? '= 2 tons' : '= 1 ton ½'}</M>, 'd')}
					{partie(
						m.nature,
						<span style={{padding: '2px 22px', borderRadius: 999, background: coul, color: C.fond}}>{NATURE[k] === 'majeur' ? 'MAJEUR' : 'MINEUR'}</span>,
						'e',
					)}
				</div>,
			);
		} else {
			lignes.push(
				<div key="l1" style={{whiteSpace: 'nowrap', fontSize: 64}}>
					{partie(R.siVersRe, <M c={C.racine}>Si</M>, 'a')}
					{partie(R.siVersRe + 0.2, <M c={C.doux}>→</M>, 'b')}
					{partie(R.siVersRe + 0.6, <M c={C.tierce}>Ré</M>, 'c')}
					{partie(R.siVersReIt, <M c={C.min}>= 1 ton ½</M>, 'd')}
				</div>,
				<div key="l1b" style={{whiteSpace: 'nowrap', fontSize: 64}}>
					{partie(R.reVersFa, <M c={C.tierce}>Ré</M>, 'e')}
					{partie(R.reVersFa + 0.2, <M c={C.doux}>→</M>, 'f')}
					{partie(R.reVersFa + 0.6, <M c={C.quinte}>Fa</M>, 'g')}
					{partie(R.encore, <M c={C.min}>= 1 ton ½</M>, 'h')}
				</div>,
			);
			if (t >= R.deuxPetites)
				lignes.push(
					<div key="l2" style={{marginTop: 10, fontSize: 56, transform: `scale(${rebond(t, R.deuxPetites)})`}}>
						2 petites tierces{' '}
						{t >= R.siDiminue && <span style={{padding: '2px 22px', borderRadius: 999, background: C.dim, color: C.fond, display: 'inline-block', transform: `scale(${rebond(t, R.siDiminue)})`}}>DIMINUÉ</span>}
					</div>,
				);
		}
		bulle = <div style={{position: 'absolute', left: 0, right: 0, top: k < 6 ? 260 : 150, textAlign: 'center', fontFamily: ANTON, fontSize: 84, color: C.texte, textShadow: '0 6px 0 rgba(0,0,0,0.4)'}}>{lignes}</div>;
	}

	// ---------- H : à retenir ----------
	const vH = fenetre(t, R.retenir, R.exempleRe, 0.5);
	const retenir = vH > 0.001 && (
		<div style={{position: 'absolute', inset: 0, opacity: vH}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 50, textAlign: 'center', fontFamily: ANTON, fontSize: 110, color: C.maj, textShadow: `0 0 40px ${C.maj}66`, transform: `scale(${rebond(t, R.retenir)})`}}>À RETENIR</div>
			{[
				{a: R.troisMajeurs, txt: '3 MAJEURS', c: C.maj, x: 560},
				{a: R.troisMineurs, txt: '3 MINEURS', c: C.min, x: 960},
				{a: R.unDiminue, txt: '1 DIMINUÉ', c: C.dim, x: 1360},
			].map((b, i) =>
				t >= b.a ? (
					<div key={i} style={{position: 'absolute', left: b.x, top: 250, transform: `translate(-50%, -50%) scale(${rebond(t, b.a) * (1 - 0.15 * doux(t, R.suite[0], 0.4))})`, padding: '8px 30px', borderRadius: 999, border: `5px solid ${b.c}`, fontFamily: ANTON, fontSize: 52, color: b.c, opacity: 1 - doux(t, R.nousAvons, 0.4)}}>
						{b.txt}
					</div>
				) : null,
			)}
			{t >= R.nousAvons && (
				<div style={{position: 'absolute', left: 0, right: 0, top: 250, transform: `translateY(-50%) scale(${rebond(t, t >= R.retrouver ? R.retrouver : R.nousAvons)})`, textAlign: 'center', fontFamily: INTER, fontWeight: 800, fontSize: 52, color: C.texte}}>
					{t < R.retrouver ? (
						<>Nous avons donc <M c={C.maj}>une suite</M> :</>
					) : (
						<>Cette suite se retrouve dans <M c={C.maj}>n'importe quelle tonalité</M></>
					)}
				</div>
			)}
			<SuiteChips t={t} temps={R.suite} y={390} o={doux(t, R.nousAvons, 0.4)} />
		</div>
	);

	// ---------- Attention : Do mineur hors de la tonalité ----------
	const vAtt = fenetre(t, R.attention, R.enDoMajeur, 0.45);
	const ALERTE = '#ef4444';
	const attention = vAtt > 0.001 && (
		<div style={{position: 'absolute', inset: 0, opacity: vAtt}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 50, textAlign: 'center', fontFamily: ANTON, fontSize: 100, color: ALERTE, textShadow: `0 0 30px ${ALERTE}88`, transform: `scale(${rebond(t, R.attention)}) rotate(${Math.sin(t * 22) * 2 * (1 - doux(t, R.attention + 0.6, 0.4))}deg)`}}>
				⚠ ATTENTION
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 235, textAlign: 'center', fontFamily: INTER, fontWeight: 800, fontSize: 40, color: C.maj, opacity: doux(t, R.attention + 0.3)}}>
				Les notes de la gamme de Do majeur
			</div>
			{NOMS.map((n, i) => (
				<Pastille key={i} x={960 + (i - 3.5) * 175} y={340} txt={n} bg={C.neutre} fg={C.texte} bord={C.maj} s={rebond(t, R.attention + 0.35 + i * 0.05)} w={140} h={80} taille={44} />
			))}
			{t >= R.pasPartie && (() => {
				const p = clamp((t - R.pasPartie) / 0.9);
				// Mi♭ arrive, tape la rangée et rebondit dehors
				const x = 1840 - 240 * Math.sin(Math.PI * Math.min(1, p * 1.25)) * 1.1 + (p > 0.8 ? 0 : 0);
				const xf = p < 1 ? x : 1750;
				return (
					<>
						<Pastille x={xf} y={340} txt="Mi♭" bg={C.min} bord={ALERTE} s={rebond(t, R.pasPartie)} w={140} h={80} taille={44} glow={0.6} />
						{p >= 0.5 && (
							<div style={{position: 'absolute', left: 1832, top: 296, transform: `translate(-50%, -50%) scale(${rebond(t, R.pasPartie + 0.45)})`, width: 64, height: 64, borderRadius: 32, background: ALERTE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 44, color: C.texte, boxShadow: `0 0 20px ${ALERTE}`}}>✕</div>
						)}
						{p >= 0.5 && (
							<div style={{position: 'absolute', left: 1750, top: 435, transform: `translate(-50%, -50%) scale(${rebond(t, R.pasPartie + 0.5)})`, fontFamily: INTER, fontWeight: 800, fontSize: 30, color: ALERTE, whiteSpace: 'nowrap'}}>
								pas dans la gamme !
							</div>
						)}
					</>
				);
			})()}
			{t >= R.accordDoMib && (
				<div style={{position: 'absolute', inset: 0, opacity: t >= R.nAppartient ? 1 - 0.45 * doux(t, R.nAppartient + 0.3, 0.5) : 1}}>
					{[0, 1, 2].map((j) => (
						<Pastille
							key={j}
							x={960}
							y={[880, 770, 660][j]}
							txt={['Do', 'Mi♭', 'Sol'][j]}
							bg={j === 1 ? C.min : COUL_TON[j]}
							bord={j === 1 ? ALERTE : undefined}
							s={rebond(t, R.accordDoMib + j * 0.12)}
							w={160}
							h={90}
							taille={48}
						/>
					))}
					<div style={{position: 'absolute', left: 960, top: 975, transform: `translate(-50%, -50%) scale(${rebond(t, R.accordDoMib + 0.5)})`, fontFamily: ANTON, fontSize: 48, color: C.min, whiteSpace: 'nowrap'}}>
						Do mineur
					</div>
				</div>
			)}
			{t >= R.nAppartient && (
				<div
					style={{
						position: 'absolute',
						left: 960,
						top: 770,
						transform: `translate(-50%, -50%) rotate(-8deg) scale(${1.6 - 0.6 * rebond(t, R.nAppartient)})`,
						opacity: doux(t, R.nAppartient, 0.25),
						padding: '14px 34px',
						border: `8px solid ${ALERTE}`,
						borderRadius: 18,
						fontFamily: ANTON,
						fontSize: 62,
						lineHeight: 1.1,
						color: ALERTE,
						textAlign: 'center',
						background: 'rgba(11,16,36,0.75)',
						whiteSpace: 'nowrap',
					}}
				>
					HORS DE LA TONALITÉ
					<br />
					DE DO MAJEUR
				</div>
			)}
		</div>
	);

	// ---------- Exemple en Ré majeur ----------
	const RL = R.reLignes as {sur: number; notes: number[]; nature: number; tierce: number}[];
	const vRe = doux(t, R.exempleRe, 0.5);
	const NOIRE = '#fb923c';
	const estDiese = (d: number) => d % 7 === 2 || d % 7 === 6;
	const ligneRe = t >= RL[0].sur && t < R.retrouveBien ? RL.reduce((acc, l, k) => (t >= l.sur ? k : acc), -1) : -1;
	const sectionRe = vRe > 0.001 && (
		<div style={{position: 'absolute', inset: 0, opacity: vRe}}>
			{/* rangée de la gamme de Ré */}
			<div style={{position: 'absolute', inset: 0, opacity: t < R.retrouveBien ? 1 : 1 - doux(t, R.retrouveBien, 0.5)}}>
				{Array.from({length: 11}).map((_, i) => {
					const ta = i < 8 ? R.gammeRe[i] : RL[0].sur;
					if (t < ta) return null;
					const role = ligneRe >= 0 ? [ligneRe, ligneRe + 2, ligneRe + 4].indexOf(i) : -1;
					const allume = role >= 0 && t >= RL[ligneRe].notes[role];
					const bg = allume ? COUL_TON[role] : estDiese(i) ? NOIRE : C.neutre;
					return (
						<Pastille
							key={i}
							x={RANGEE11(i)}
							y={200}
							txt={nomRe(i)}
							bg={bg}
							fg={allume || estDiese(i) ? C.fond : C.texte}
							bord={role === 0 ? C.racine : allume ? undefined : estDiese(i) ? undefined : C.neutreBord}
							s={rebond(t, ta) * 0.82}
							o={i >= 8 ? 0.6 : 1}
							w={130}
							h={74}
							taille={40}
						/>
					);
				})}
			</div>
			{/* tours */}
			{Array.from({length: 7}).map((_, k) => {
				const l = RL[k];
				if (t < l.sur) return null;
				const naturee = t >= l.nature;
				const coul = COUL_NATURE(k);
				const o = ligneRe >= 0 && ligneRe !== k ? 0.45 : 1;
				const pu = t >= R.retrouveBien ? pulse(t, R.suite2[k], 0.6) : 0;
				return (
					<div key={k} style={{position: 'absolute', inset: 0, opacity: o}}>
						{[k, k + 2, k + 4].map((d, j) => {
							const tk = l.notes[j];
							if (t < tk) return null;
							const p = doux(t, tk, 0.55);
							const x = RANGEE11(d) + (TX(k) - RANGEE11(d)) * p;
							const y = 200 + (TY[j] - 200) * p - Math.sin(Math.PI * p) * 140 - pu * 40;
							return <Pastille key={j} x={x} y={y} txt={nomRe(d)} bg={naturee ? coul : COUL_TON[j]} s={(0.85 + 0.15 * p) * (1 + 0.08 * pu)} glow={naturee ? 0.5 + pu : 0} w={140} h={80} taille={44} />;
						})}
						<div style={{position: 'absolute', left: TX(k), top: 885, transform: `translate(-50%, -50%) scale(${rebond(t, l.sur)})`, fontFamily: ANTON, fontSize: 50, color: naturee ? coul : C.doux}}>
							{ROMAINS[k]}
						</div>
						{naturee && (
							<div style={{position: 'absolute', left: TX(k), top: 950, transform: `translate(-50%, -50%) scale(${rebond(t, l.nature) * (1 + 0.15 * pu)})`, padding: '4px 16px', borderRadius: 999, background: coul, fontFamily: INTER, fontWeight: 800, fontSize: 30, color: C.fond, whiteSpace: 'nowrap'}}>
								{NATURE[k] === 'majeur' ? 'MAJEUR' : NATURE[k]}
							</div>
						)}
						{naturee &&
							(NATURE[k] === 'majeur' ? (
								<Soleil x={TX(k)} y={500 - pu * 40} s={rebond(t, l.nature) * 0.8} t={t} />
							) : NATURE[k] === 'mineur' ? (
								<Nuage x={TX(k)} y={505 - pu * 40} s={rebond(t, l.nature) * 0.7} t={t} />
							) : (
								<Eclair x={TX(k)} y={500} s={rebond(t, l.nature) * 0.8} />
							))}
					</div>
				);
			})}
			{/* bulle d'explication de la ligne en cours */}
			{ligneRe >= 0 && t >= RL[ligneRe].nature && (() => {
				const k = ligneRe;
				const l = RL[k];
				const coul = COUL_NATURE(k);
				return (
					<div style={{position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', fontFamily: ANTON, fontSize: 64, color: C.texte, whiteSpace: 'nowrap', textShadow: '0 6px 0 rgba(0,0,0,0.4)'}}>
						<span style={{display: 'inline-block', padding: '2px 24px', borderRadius: 999, background: coul, color: C.fond, transform: `scale(${rebond(t, l.nature)})`}}>
							ACCORD {NATURE[k] === 'majeur' ? 'MAJEUR' : NATURE[k] === 'mineur' ? 'MINEUR' : 'DIMINUÉ'}
						</span>
						{t >= l.tierce && (
							<span style={{display: 'inline-block', marginLeft: 40, transform: `scale(${rebond(t, l.tierce)})`}}>
								{k < 6 ? (
									<>
										<M c={C.racine}>{nomRe(k)}</M> <M c={C.doux}>→</M> <M c={C.tierce}>{nomRe(k + 2)}</M> <M c={coul}>= {NATURE[k] === 'majeur' ? '2 tons' : '1 ton ½'}</M>
									</>
								) : (
									<M c={C.dim}>2 tierces mineures</M>
								)}
							</span>
						)}
					</div>
				);
			})()}
			<SuiteChips t={t} temps={R.suite2} y={390} o={doux(t, R.retrouveBien, 0.4)} />
			{t >= R.toutes &&
				Array.from({length: 18}).map((_, i) => {
					const a = (i / 18) * Math.PI * 2;
					const p = clamp((t - R.toutes) / 1.3);
					return <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * 760 * p, top: 400 + Math.sin(a) * 300 * p, fontSize: 44, color: i % 2 ? C.maj : C.tierce, opacity: 1 - p}}>✦</div>;
				})}
		</div>
	);

	return (
		<AbsoluteFill style={{opacity: vFin}}>
			<Polices />
			<Fond t={t} chaud={chaud} froid={froid} />
			<Audio src={staticFile('mix.wav')} />

			{accroche}
			{rappel}
			{rangee11}
			{cadre}
			{tours}
			{vF > 0.001 && (
				<div style={{position: 'absolute', inset: 0, opacity: clamp(vF)}}>
					<Clavier allume={allumeF} nomNoire={(m) => (m === 63 && t >= R.devient ? 'Mi♭' : '')} o={clamp(vClavier)} dy={(1 - doux(t, R.accordMajeur - 0.3, 0.6)) * 300} />
					{arcsF}
					{iconesF}
				</div>
			)}
			{bulle}
			{retenir}
			{attention}
			{sectionRe}

			{/* ---------- Légendes ---------- */}
			<Legende t={t} a={R.tierces} b={R.maintenant}>
				Un accord = des <M c={C.tierce}>tierces</M> empilées
			</Legende>
			<Legende t={t} a={R.maintenant} b={R.harmoniser}>
				On fait pareil sur <M c={C.maj}>chaque note</M>
			</Legende>
			{L.map((l, k) => (
				<Legende key={k} t={t} a={l.sur} b={k < 6 ? L[k + 1].sur : R.famille}>
					<M c={C.doux}>{ROMAINS[k]}</M> · Sur <M c={C.racine}>{nomDegre(k)}</M> : <M c={C.racine}>{nomDegre(k)}</M>, <M c={C.tierce}>{nomDegre(k + 2)}</M>, <M c={C.quinte}>{nomDegre(k + 4)}</M>
				</Legende>
			))}
			<Legende t={t} a={R.famille} b={R.enchainer}>
				7 accords, <M c={C.maj}>une seule famille</M>
			</Legende>
			<Legende t={t} a={R.enchainer} b={R.couleur}>
				Enchaîne les dans <M c={C.maj}>presque n'importe quel ordre</M>
			</Legende>
			<Legende t={t} a={R.couleur} b={R.joyeux}>
				Mais pas tous <M c={C.maj}>la même couleur</M>…
			</Legende>
			<Legende t={t} a={R.joyeux} b={R.toutSeJoue}>
				<M c={C.maj}>joyeux</M>
				{t >= R.tristes ? (
					<>
					{' '}ou <M c={C.min}>tristes</M>
					</>
				) : null}
			</Legende>
			<Legende t={t} a={R.toutSeJoue} b={R.accordMajeur}>
				Tout se joue entre la <M c={C.racine}>note 1</M> et la <M c={C.tierce}>note 2</M>
			</Legende>
			<Legende t={t} a={R.accordMajeur} b={R.tierceMaj}>
				Accord <M c={C.maj}>majeur</M> : <M c={C.maj}>2 tons</M> d'écart
			</Legende>
			<Legende t={t} a={R.tierceMaj} b={R.accordMineur}>
				2 tons = une tierce <M c={C.maj}>MAJEURE</M>
			</Legende>
			<Legende t={t} a={R.accordMineur} b={R.tierceMin}>
				Accord <M c={C.min}>mineur</M> : <M c={C.min}>1 ton ½</M> d'écart
			</Legende>
			<Legende t={t} a={R.tierceMin} b={R.ecoute}>
				1 ton ½ = une tierce <M c={C.min}>MINEURE</M>
			</Legende>
			<Legende t={t} a={R.ecoute} b={R.avecTierce}>
				Écoute : <M c={C.maj}>Do majeur</M>
			</Legende>
			<Legende t={t} a={R.avecTierce} b={R.baisse}>
				Do → Mi : <M c={C.maj}>tierce majeure</M>
			</Legende>
			<Legende t={t} a={R.baisse} b={R.doMineur}>
				Mi descend d'un demi ton : <M c={C.min}>Mi♭</M>
			</Legende>
			<Legende t={t} a={R.doMineur} b={R.intervalleMib}>
				<M c={C.min}>Do mineur</M> : Do, Mi♭, Sol
			</Legende>
			<Legende t={t} a={R.intervalleMib} b={R.difference}>
				Do → Mi♭ : <M c={C.min}>tierce mineure</M>
			</Legende>
			<Legende t={t} a={R.difference} b={R.attention}>
				Tu entends <M c={C.maj}>la différence</M> ?
			</Legende>
			<Legende t={t} a={R.enDoMajeur} b={MES[0].racine - 0.1}>
				En <M c={C.maj}>Do majeur</M>, on mesure l'écart <M c={C.racine}>note 1</M> → <M c={C.tierce}>note 2</M>
			</Legende>
			<Legende t={t} a={R.exempleRe} b={RL[0].sur} taille={64}>
				Exemple : la gamme de <M c={C.maj}>RÉ MAJEUR</M>
			</Legende>
			{RL.map((l, k) => (
				<Legende key={`re${k}`} t={t} a={l.sur} b={k < 6 ? RL[k + 1].sur : R.retrouveBien} y={60}>
					<M c={C.doux}>{ROMAINS[k]}</M> · Sur <M c={C.racine}>{nomRe(k)}</M> : <M c={C.racine}>{nomRe(k)}</M>, <M c={C.tierce}>{nomRe(k + 2)}</M>, <M c={C.quinte}>{nomRe(k + 4)}</M>
				</Legende>
			))}
			<Legende t={t} a={R.retrouveBien} b={R.toutes} y={150}>
				On retrouve bien <M c={C.maj}>la même suite</M> !
			</Legende>
			<Legende t={t} a={R.toutes} b={R.duree + 1} y={150}>
				Et ce sera pareil pour <M c={C.maj}>TOUTES</M> les gammes majeures
			</Legende>
		</AbsoluteFill>
	);
};
