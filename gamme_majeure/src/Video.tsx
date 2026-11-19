import React from 'react';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS, FORMULE, estNoire, fenetres, gamme, nom} from './synchro.mjs';

export type Reperes = Record<string, any>;
export type Props = {R: Reperes | null};

// ---------- Palette ----------
const C = {
	fond: '#0b1024',
	texte: '#fbf7ee',
	doux: '#9aa3c7',
	ton: '#2dd4bf',
	demi: '#f472b6',
	or: '#facc15',
	noire: '#fb923c',
	alerte: '#ef4444',
	tonique: '#ff6b57',
	tierce: '#f6c344',
	quinte: '#4fb0ff',
	blanche: '#f4f1ea',
	noireTouche: '#1a1d2b',
};
const ANTON = 'Anton';
const INTER = 'Inter';

// ---------- Outils de temps ----------
const doux = (t: number, a: number, d = 0.5) =>
	spring({frame: Math.round((t - a) * FPS), fps: FPS, config: {damping: 200}, durationInFrames: Math.max(1, Math.round(d * FPS))});
const rebond = (t: number, a: number) => spring({frame: Math.round((t - a) * FPS), fps: FPS, config: {damping: 11, stiffness: 160, mass: 0.7}});
const fenetre = (t: number, a: number, b: number, e = 0.35) => doux(t, a, e) * (1 - doux(t, b - e, e));
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ---------- Clavier ----------
const BLANCHES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
const LB = 120; // largeur touche blanche
const KX = (1920 - BLANCHES.length * LB) / 2;
const KY = 560;
const KH = 400;
const LN = 74;
const HN = 245;
const keyX = (m: number) => {
	if (!estNoire(m)) return KX + BLANCHES.indexOf(m) * LB + LB / 2;
	return KX + (BLANCHES.indexOf(m - 1) + 1) * LB;
};

type Allumage = {couleur: string; p: number};

const Clavier: React.FC<{allume: (m: number) => Allumage | null; nomNoire: (m: number) => string; dx: number; opacite: number; y: number}> = ({
	allume,
	nomNoire,
	dx,
	opacite,
	y,
}) => {
	const noires = [61, 63, 66, 68, 70, 73, 75, 78];
	return (
		<div style={{position: 'absolute', inset: 0, opacity: opacite, transform: `translate(${dx}px, ${y}px)`}}>
			<div
				style={{
					position: 'absolute',
					left: KX - 18,
					top: KY - 18,
					width: BLANCHES.length * LB + 36,
					height: KH + 36,
					borderRadius: 26,
					background: 'linear-gradient(180deg, #232a4a, #141932)',
					boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
				}}
			/>
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
							background: a ? `linear-gradient(180deg, ${C.blanche}, ${a.couleur})` : C.blanche,
							boxShadow: a ? `0 0 ${40 * a.p}px ${a.couleur}, inset 0 -10px 0 rgba(0,0,0,0.12)` : 'inset 0 -10px 0 rgba(0,0,0,0.12)',
							display: 'flex',
							alignItems: 'flex-end',
							justifyContent: 'center',
							paddingBottom: 22,
							boxSizing: 'border-box',
							fontFamily: INTER,
							fontWeight: 800,
							fontSize: 34,
							color: '#2a2f45',
						}}
					>
						{nom(m)}
					</div>
				);
			})}
			{noires.map((m) => {
				const a = allume(m);
				return (
					<div
						key={m}
						style={{
							position: 'absolute',
							left: keyX(m) - LN / 2,
							top: KY,
							width: LN,
							height: HN,
							borderRadius: '0 0 12px 12px',
							background: a ? a.couleur : `linear-gradient(180deg, #2b2f42, ${C.noireTouche})`,
							boxShadow: a ? `0 0 ${50 * a.p}px ${a.couleur}` : '0 6px 10px rgba(0,0,0,0.5)',
							display: 'flex',
							alignItems: 'flex-end',
							justifyContent: 'center',
							paddingBottom: 16,
							boxSizing: 'border-box',
							fontFamily: INTER,
							fontWeight: 800,
							fontSize: 26,
							color: C.fond,
						}}
					>
						{a ? nomNoire(m) : ''}
					</div>
				);
			})}
		</div>
	);
};

// ---------- Arcs et balle ----------
const ARC_Y = KY - 14;
const arcGeo = (de: number, a: number, grand = false) => {
	const x1 = keyX(de);
	const x2 = keyX(a);
	const h = (grand ? 170 : 70) + Math.abs(x2 - x1) * 0.35;
	return {x1, x2, xm: (x1 + x2) / 2, y: ARC_Y, yc: ARC_Y - 2 * h, h};
};
const pointArc = (g: ReturnType<typeof arcGeo>, p: number) => {
	const x = (1 - p) ** 2 * g.x1 + 2 * (1 - p) * p * g.xm + p ** 2 * g.x2;
	const y = (1 - p) ** 2 * g.y + 2 * (1 - p) * p * g.yc + p ** 2 * g.y;
	return {x, y};
};

const Arc: React.FC<{de: number; a: number; p: number; couleur: string; label: string; opacite: number; grand?: boolean; taille?: number}> = ({
	de,
	a,
	p,
	couleur,
	label,
	opacite,
	grand,
	taille = 46,
}) => {
	const g = arcGeo(de, a, grand);
	const pts: string[] = [];
	const n = 24;
	for (let i = 0; i <= Math.round(n * clamp(p)); i++) {
		const q = pointArc(g, i / n);
		pts.push(`${q.x},${q.y}`);
	}
	const sommet = pointArc(g, 0.5);
	return (
		<>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: opacite}}>
				<polyline points={pts.join(' ')} fill="none" stroke={couleur} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" style={{filter: `drop-shadow(0 0 10px ${couleur})`}} />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: sommet.x,
					top: sommet.y - 44,
					transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * clamp(p * 2 - 0.6)})`,
					opacity: opacite * clamp(p * 2 - 0.6),
					fontFamily: ANTON,
					fontSize: taille,
					color: couleur,
					textShadow: `0 0 18px ${couleur}88`,
					whiteSpace: 'nowrap',
				}}
			>
				{label}
			</div>
		</>
	);
};

const Balle: React.FC<{x: number; y: number; ecrase: number; opacite: number}> = ({x, y, ecrase, opacite}) => (
	<div
		style={{
			position: 'absolute',
			left: x - 26,
			top: y - 52,
			width: 52,
			height: 52,
			borderRadius: '50%',
			background: 'radial-gradient(circle at 35% 30%, #ffffff, #fde68a 35%, #f59e0b 80%)',
			boxShadow: '0 0 30px #fbbf24, 0 0 70px #f59e0b88',
			transform: `scale(${1 + ecrase * 0.25}, ${1 - ecrase * 0.25})`,
			transformOrigin: '50% 100%',
			opacity: opacite,
		}}
	/>
);

// ---------- Textes ----------
const Legende: React.FC<{t: number; a: number; b: number; children: React.ReactNode; y?: number; taille?: number}> = ({t, a, b, children, y = 96, taille = 60}) => {
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
				transform: `translateY(${(1 - doux(t, a, 0.45)) * 30}px) scale(${0.94 + 0.06 * doux(t, a, 0.45)})`,
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
const Mot: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => <span style={{color: c}}>{children}</span>;

// Puce de la formule
const Puce: React.FC<{k: number; etat: number; actif: number; x: number; y: number; taille?: number}> = ({k, etat, actif, x, y, taille = 1}) => {
	const ton = FORMULE[k] === 2;
	const c = ton ? C.ton : C.demi;
	const w = (ton ? 118 : 92) * taille;
	const h = 84 * taille;
	return (
		<div
			style={{
				position: 'absolute',
				left: x - w / 2,
				top: y - h / 2,
				width: w,
				height: h,
				borderRadius: 20 * taille,
				border: `${5 * taille}px solid ${c}`,
				background: etat > 0 ? c : 'rgba(255,255,255,0.04)',
				boxShadow: actif > 0 ? `0 0 ${36 * actif}px ${c}` : 'none',
				transform: `scale(${1 + 0.18 * actif})`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: ANTON,
				fontSize: 50 * taille,
				color: etat > 0 ? C.fond : c,
				boxSizing: 'border-box',
			}}
		>
			{ton ? '1' : '½'}
		</div>
	);
};

const Formule: React.FC<{t: number; temps: number[]; y: number; opacite: number; taille?: number; ecart?: number}> = ({t, temps, y, opacite, taille = 1, ecart = 128}) => {
	if (opacite <= 0.001) return null;
	return (
		<div style={{position: 'absolute', inset: 0, opacity: opacite}}>
			{FORMULE.map((_, k) => {
				const x = 960 + (k - 3) * ecart * taille;
				const etat = t >= temps[k] ? 1 : 0;
				const actif = t >= temps[k] ? 1 - doux(t, temps[k] + 0.25, 0.6) : 0;
				return <Puce key={k} k={k} etat={etat} actif={actif} x={x} y={y} taille={taille} />;
			})}
		</div>
	);
};

// Pastilles de résultat
const Pastilles: React.FC<{t: number; a: number; notes: number[]; bemol?: boolean; y: number; opacite: number}> = ({t, a, notes, bemol, y, opacite}) => (
	<div style={{position: 'absolute', inset: 0, opacity: opacite}}>
		{notes.map((m, k) => {
			const p = rebond(t, a + k * 0.07);
			const noire = estNoire(m);
			const x = 960 + (k - 3.5) * 150;
			return (
				<div
					key={k}
					style={{
						position: 'absolute',
						left: x - 66,
						top: y - 46,
						width: 132,
						height: 92,
						borderRadius: 46,
						background: noire ? C.noire : C.or,
						boxShadow: noire ? `0 0 40px ${C.noire}` : `0 0 20px ${C.or}66`,
						transform: `scale(${p})`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontFamily: ANTON,
						fontSize: 46,
						color: C.fond,
					}}
				>
					{nom(m, bemol)}
				</div>
			);
		})}
	</div>
);

// Éclat autour d'une touche noire
const Eclat: React.FC<{t: number; a: number; x: number; y: number; texte: string}> = ({t, a, x, y, texte}) => {
	if (t < a || t > a + 2.2) return null;
	const p = clamp((t - a) / 0.6);
	const o = 1 - doux(t, a + 1.5, 0.6);
	const s = rebond(t, a);
	return (
		<div style={{position: 'absolute', inset: 0, opacity: o}}>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: 14}).map((_, i) => {
					const ang = (i / 14) * Math.PI * 2;
					const r1 = 40 + 120 * p;
					const r2 = r1 + 50 * (1 - p) + 10;
					return (
						<line
							key={i}
							x1={x + Math.cos(ang) * r1}
							y1={y + Math.sin(ang) * r1}
							x2={x + Math.cos(ang) * r2}
							y2={y + Math.sin(ang) * r2}
							stroke={i % 2 ? C.or : C.noire}
							strokeWidth={8}
							strokeLinecap="round"
							opacity={1 - p * 0.6}
						/>
					);
				})}
			</svg>
			<div
				style={{
					position: 'absolute',
					left: x,
					top: y - 150,
					transform: `translate(-50%, -50%) scale(${s}) rotate(${(1 - s) * -8}deg)`,
					fontFamily: ANTON,
					fontSize: 110,
					color: C.noire,
					textShadow: `0 0 30px ${C.noire}, 0 6px 0 rgba(0,0,0,0.5)`,
					whiteSpace: 'nowrap',
				}}
			>
				{texte}
			</div>
		</div>
	);
};

// ---------- Escalier ----------
const UNITES = [0, 2, 4, 5, 7, 9, 11, 12];
const Escalier: React.FC<{
	t: number;
	x0: number;
	base: number;
	echelle: number;
	construction: number;
	notes: string[];
	balle: number[] | null;
	grandes?: number;
	petites?: number;
	depart?: number;
	opacite: number;
}> = ({t, x0, base, echelle, construction, notes, balle, grandes, petites, depart, opacite}) => {
	const W = 150 * echelle;
	const U = 40 * echelle;
	const H0 = 70 * echelle;
	const haut = (k: number) => H0 + UNITES[k] * U;
	let bx = 0;
	let by = 0;
	let bo = 0;
	if (balle) {
		const k = balle.reduce((acc, tk, i) => (t >= tk - 0.3 ? i : acc), -1);
		if (k >= 0) {
			bo = 1;
			const p = k === 0 ? 1 : clamp((t - (balle[k] - 0.3)) / 0.3);
			const xa = x0 + (k === 0 ? 0 : k - 1) * W + W / 2;
			const xb = x0 + k * W + W / 2;
			const ya = base - haut(k === 0 ? 0 : k - 1);
			const yb = base - haut(k);
			bx = xa + (xb - xa) * p;
			by = ya + (yb - ya) * p - Math.sin(Math.PI * p) * 70 * echelle;
		}
	}
	return (
		<div style={{position: 'absolute', inset: 0, opacity: opacite}}>
			{UNITES.map((_, k) => {
				const p = rebond(t, construction + k * 0.12);
				const h = haut(k);
				const montee = k > 0 ? FORMULE[k - 1] : 0;
				const surligne = k > 0 && ((grandes !== undefined && montee === 2 && t >= grandes && t < (petites ?? 1e9)) || (petites !== undefined && montee === 1 && t >= petites && t < petites + 2.2));
				const cMarche = montee === 1 ? C.demi : C.ton;
				const estDepart = depart !== undefined && k === 0 && t >= depart;
				return (
					<React.Fragment key={k}>
						<div
							style={{
								position: 'absolute',
								left: x0 + k * W + 3,
								top: base - h,
								width: W - 6,
								height: h,
								transformOrigin: '50% 100%',
								transform: `scaleY(${p})`,
								borderRadius: `${12 * echelle}px ${12 * echelle}px 0 0`,
								background: estDepart ? `linear-gradient(180deg, ${C.or}, #b45309)` : `linear-gradient(180deg, ${k === 0 ? '#5b6bd6' : '#3b4aa8'}, #1e2557)`,
								boxShadow: surligne ? `0 0 40px ${cMarche}` : estDepart ? `0 0 40px ${C.or}` : 'none',
								borderTop: `${6 * echelle}px solid ${surligne ? cMarche : estDepart ? '#fff3' : '#8ea0ff'}`,
							}}
						/>
						{notes[k] && (
							<div
								style={{
									position: 'absolute',
									left: x0 + k * W + W / 2,
									top: base - h + 34 * echelle,
									transform: `translate(-50%, -50%) scale(${p})`,
									fontFamily: ANTON,
									fontSize: 40 * echelle,
									color: C.texte,
								}}
							>
								{notes[k]}
							</div>
						)}
						{k > 0 && echelle > 0.5 && (
							<div
								style={{
									position: 'absolute',
									left: x0 + k * W,
									top: base - h + ((UNITES[k] - UNITES[k - 1]) * U) / 2,
									transform: `translate(-50%, -50%) scale(${rebond(t, construction + 0.9 + k * 0.08)})`,
									padding: '2px 12px',
									borderRadius: 14,
									background: cMarche,
									fontFamily: ANTON,
									fontSize: 34,
									color: C.fond,
									boxShadow: surligne ? `0 0 30px ${cMarche}` : 'none',
								}}
							>
								{montee === 2 ? '1' : '½'}
							</div>
						)}
					</React.Fragment>
				);
			})}
			{bo > 0 && <Balle x={bx} y={by} ecrase={0} opacite={bo} />}
		</div>
	);
};

// ---------- Décor ----------
const Fond: React.FC<{t: number}> = ({t}) => {
	const blob = (x: number, y: number, r: number, c: string, o: number, v: number) => (
		<div
			style={{
				position: 'absolute',
				left: x + Math.sin(t * 0.25 * v) * 120 - r,
				top: y + Math.cos(t * 0.21 * v) * 90 - r,
				width: r * 2,
				height: r * 2,
				borderRadius: '50%',
				background: `radial-gradient(circle, ${c} 0%, transparent 68%)`,
				opacity: o,
			}}
		/>
	);
	const notesFlottantes = Array.from({length: 14}).map((_, i) => {
		const v = 0.02 + (i % 5) * 0.006;
		const y = 1150 - (((t * v * 1000 + i * 173) % 1300) as number);
		const x = (i * 157 + 80) % 1920;
		return (
			<div key={i} style={{position: 'absolute', left: x + Math.sin(t + i) * 20, top: y, fontSize: 34 + (i % 3) * 14, color: '#ffffff', opacity: 0.06}}>
				{i % 2 ? '♪' : '♫'}
			</div>
		);
	});
	return (
		<AbsoluteFill style={{background: C.fond, overflow: 'hidden'}}>
			{blob(300, 200, 520, '#3b2a8f', 0.55, 1)}
			{blob(1600, 300, 480, '#0e7490', 0.45, 1.3)}
			{blob(900, 1000, 560, '#9d174d', 0.32, 0.8)}
			{notesFlottantes}
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

// ---------- Vidéo ----------
export const Video: React.FC<Props> = ({R}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	if (!R) return <AbsoluteFill style={{background: C.fond}} />;
	const W = fenetres(R);

	// Visibilité des grandes parties
	const vClavier = fenetre(t, R.regarde, R.escalier, 0.5) + fenetre(t, R.partantDo, R.entends, 0.5);
	const vEscalier = fenetre(t, R.escalier, R.partantDo, 0.5);
	const vMeme = fenetre(t, R.entends, R.bonus, 0.5);
	const vAccord = fenetre(t, R.bonus, R.retenir, 0.5);
	const vFin = doux(t, R.retenir, 0.5);
	const yClavier = (1 - doux(t, R.regarde, 0.7)) * 300 + (1 - doux(t, R.partantDo, 0.7)) * (t > R.escalier ? 300 : 0);

	// Fenêtre de sauts en cours
	const w = W.find((x) => t >= x.debut && t < x.fin);

	// Secousse sur une touche noire
	let dx = 0;
	for (const x of W) {
		if (!x.gamme) continue;
		for (const s of x.sauts) {
			if (estNoire(s.m) && t >= s.t && t < s.t + 0.45) dx = Math.sin((t - s.t) * 60) * 12 * (1 - (t - s.t) / 0.45);
		}
	}

	// Touches allumées
	const allume = (m: number): Allumage | null => {
		// gamme chromatique
		if (t >= R.suivent && t < R.voisine) {
			const dtc = (R.douze - R.suivent) / 12;
			const k = m - 60;
			if (k >= 0 && k < 12) {
				const tk = R.suivent + k * dtc;
				if (t >= tk && t < tk + 0.6) return {couleur: C.ton, p: 1 - (t - tk) / 0.6};
				if (t >= tk && t < R.doSuivant) return {couleur: '#5eead4', p: 0.25};
			}
			if (m === 72 && t >= R.doSuivant) return {couleur: C.or, p: 1};
			if (m === 60 && t >= R.doSuivant) return {couleur: C.or, p: 1};
		}
		// piège
		if (t >= R.entreMiFa && t < R.pareil && (m === 64 || m === 65)) return {couleur: C.alerte, p: 0.6 + 0.4 * Math.sin(t * 8)};
		if (t >= R.pareil && t < R.escalier && (m === 71 || m === 72)) return {couleur: C.alerte, p: 0.6 + 0.4 * Math.sin(t * 8)};
		if (!w) return null;
		if (w.depart === m) return {couleur: w.gamme ? C.or : C.ton, p: 1};
		const s = w.sauts.find((x: any) => x.m === m && t >= x.t);
		if (s) return {couleur: estNoire(m) ? C.noire : w.gamme ? C.or : C.ton, p: 1};
		return null;
	};
	const nomNoire = (m: number) => nom(m, Boolean(w && w.bemol));

	// Balle et arcs de la fenêtre en cours
	let balle: React.ReactNode = null;
	const arcs: React.ReactNode[] = [];
	const eclats: React.ReactNode[] = [];
	if (w && vClavier > 0) {
		const vArcs = w.resultat ? 1 - doux(t, w.resultat - 0.2, 0.4) : 1;
		let pos = {x: keyX(w.depart), y: ARC_Y};
		let ecrase = 0;
		let prec = w.depart;
		let tPrec = w.debut;
		w.sauts.forEach((s: any, i: number) => {
			const dur = Math.min(0.45, (s.t - tPrec) * 0.8);
			const t0 = s.t - dur;
			const p = clamp((t - t0) / dur);
			const demi = s.m - prec === 1;
			if (t >= t0) {
				arcs.push(
					<Arc key={i} de={prec} a={s.m} p={p} couleur={demi ? C.demi : C.ton} label={demi ? '½' : '1'} opacite={(i === w.sauts.length - 1 || t < s.t + 4 ? 1 : 0.45) * vArcs} />,
				);
				if (t < s.t) pos = pointArc(arcGeo(prec, s.m), p);
				else {
					pos = {x: keyX(s.m), y: ARC_Y};
					ecrase = Math.max(0, 1 - (t - s.t) / 0.18);
				}
			}
			if (w.gamme && estNoire(s.m)) eclats.push(<Eclat key={`e${i}`} t={t} a={s.t} x={keyX(s.m)} y={KY + 40} texte={`${nom(s.m, w.bemol)} !`} />);
			prec = s.m;
			tPrec = s.t;
		});
		balle = <Balle x={pos.x} y={pos.y} ecrase={ecrase} opacite={vArcs} />;
	}
	// Arc « 1 ton » par dessus les deux demi tons
	if (t >= R.unTon && t < R.attention) {
		arcs.push(<Arc key="ton" de={60} a={62} p={clamp((t - R.unTon) / 0.5)} couleur={C.ton} label="1 ton" opacite={1} grand taille={56} />);
	}

	// Pastilles de résultat
	const resultats = W.filter((x) => x.resultat).map((x) => (
		<Pastilles
			key={x.id}
			t={t}
			a={x.resultat}
			notes={gamme(x.depart)}
			bemol={x.bemol}
			y={405}
			opacite={fenetre(t, x.resultat, x.fin, 0.3)}
		/>
	));

	// Formule (escalier puis clavier)
	const sautsGamme = w && w.gamme ? w.sauts.map((s: any) => s.t) : [];
	const tempsFormule = w && w.gamme ? sautsGamme.concat(Array(7).fill(1e9)).slice(0, 7) : Array(7).fill(1e9);
	const actifFormule = (k: number) => (w && w.gamme && w.sauts[k] && t >= w.sauts[k].t - 0.45 && t < w.sauts[k].t + 0.4 ? 1 : 0);

	// Intro
	const lettres = 'LA GAMME MAJEURE'.split('');
	const vIntro = 1 - doux(t, R.regarde - 0.4, 0.4);

	return (
		<AbsoluteFill>
			<Polices />
			<Fond t={t} />
			<Audio src={staticFile('mix.wav')} />

			{/* ---------- Intro ---------- */}
			{vIntro > 0.001 && (
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: vIntro}}>
					<div style={{display: 'flex', fontFamily: ANTON, fontSize: 190, color: C.texte, letterSpacing: 4, marginTop: -80}}>
						{lettres.map((l, i) => {
							const p = rebond(t, 0.6 + i * 0.05);
							return (
								<span
									key={i}
									style={{
										display: 'inline-block',
										width: l === ' ' ? 50 : undefined,
										transform: `translateY(${(1 - p) * 120}px) scale(${p})`,
										color: i >= 9 ? C.or : C.texte,
										textShadow: i >= 9 ? `0 0 40px ${C.or}88` : '0 0 30px rgba(255,255,255,0.25)',
									}}
								>
									{l}
								</span>
							);
						})}
					</div>
					<div
						style={{
							marginTop: 10,
							fontFamily: INTER,
							fontWeight: 800,
							fontSize: 54,
							color: C.doux,
							opacity: doux(t, R.secret, 0.5),
							transform: `translateY(${(1 - doux(t, R.secret, 0.5)) * 20}px)`,
						}}
					>
						Le secret caché derrière presque toutes les mélodies
					</div>
					<div style={{position: 'absolute', top: 760, display: 'flex', gap: 24}}>
						{gamme(60).map((m, k) => {
							const tk = R.secretFin + k * 0.14;
							const p = rebond(t, tk);
							return (
								<div
									key={k}
									style={{
										width: 90,
										height: 90,
										borderRadius: 45,
										background: k === 0 || k === 7 ? C.or : C.ton,
										transform: `scale(${p}) translateY(${-Math.sin(Math.PI * clamp((t - tk) / 0.3)) * 30}px)`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontFamily: ANTON,
										fontSize: 36,
										color: C.fond,
									}}
								>
									{nom(m)}
								</div>
							);
						})}
					</div>
				</AbsoluteFill>
			)}

			{/* ---------- Clavier ---------- */}
			{vClavier > 0.001 && <Clavier allume={allume} nomNoire={nomNoire} dx={dx} opacite={clamp(vClavier)} y={yClavier} />}
			{vClavier > 0.001 && (
				<div style={{position: 'absolute', inset: 0, opacity: clamp(vClavier)}}>
					{arcs}
					{balle}
					{eclats}
					{resultats}
				</div>
			)}

			{/* compteur 1 à 12 */}
			{t >= R.suivent && t < R.voisine && (() => {
				const dtc = (R.douze - R.suivent) / 12;
				const k = Math.min(11, Math.floor((t - R.suivent) / dtc));
				const fin = t >= R.douze;
				return (
					<div
						style={{
							position: 'absolute',
							left: keyX(60 + k),
							top: KY - 90,
							transform: `translate(-50%, -50%) scale(${fin ? 1.6 * rebond(t, R.douze) : 1})`,
							fontFamily: ANTON,
							fontSize: 80,
							color: fin ? C.or : C.ton,
							textShadow: `0 0 24px ${fin ? C.or : C.ton}`,
							opacity: fenetre(t, R.suivent, R.voisine, 0.3),
						}}
					>
						{k + 1}
					</div>
				);
			})()}

			{/* « pas de touche noire » entre Mi et Fa */}
			{t >= R.pasNoire && t < R.escalier && (
				<div
					style={{
						position: 'absolute',
						left: KX + 3 * LB,
						top: KY - 70,
						transform: `translate(-50%, -50%) scale(${rebond(t, R.pasNoire)})`,
						fontFamily: ANTON,
						fontSize: 70,
						color: C.alerte,
						textShadow: `0 0 24px ${C.alerte}`,
						opacity: fenetre(t, R.pasNoire, R.seulement - 0.1, 0.25),
					}}
				>
					✕
				</div>
			)}

			{/* ---------- Escalier ---------- */}
			{vEscalier > 0.001 && (
				<Escalier
					t={t}
					x0={360}
					base={985}
					echelle={1}
					construction={R.escalier + 0.15}
					notes={gamme(60).map((m) => nom(m))}
					balle={[R.motif, ...R.formule]}
					grandes={R.grandes}
					petites={R.petites}
					opacite={clamp(vEscalier)}
				/>
			)}
			<Formule t={t} temps={R.formule} y={235} opacite={clamp(vEscalier) * doux(t, R.motif, 0.5)} />
			<Formule t={t} temps={tempsFormule} y={235} opacite={fenetre(t, R.gDo[0] - 0.6, R.entends, 0.4) * (t >= R.partantDo ? 1 : 0)} />
			{w && w.gamme && t >= w.debut && (
				<div style={{position: 'absolute', inset: 0}}>
					{FORMULE.map((_, k) =>
						actifFormule(k) ? (
							<div
								key={k}
								style={{
									position: 'absolute',
									left: 960 + (k - 3) * 128 - 70,
									top: 235 - 56,
									width: 140,
									height: 112,
									borderRadius: 26,
									border: `4px solid ${C.texte}`,
									opacity: 0.8,
								}}
							/>
						) : null,
					)}
				</div>
			)}

			{/* ---------- Même son ---------- */}
			{vMeme > 0.001 && (
				<div style={{position: 'absolute', inset: 0, opacity: clamp(vMeme)}}>
					{[
						{d: 60, n: 'Do'},
						{d: 67, n: 'Sol'},
						{d: 62, n: 'Ré'},
						{d: 65, n: 'Fa', b: true},
					].map((e, i) => {
						const x0 = 70 + i * 455;
						const p0 = R.departFin + 0.25 + (i === 1 ? 1.6 : 0);
						const balleT = i < 2 ? gamme(e.d).map((_, k) => p0 + k * 0.17 + 0.3) : null;
						const glow = t >= R.memeEsc && t < R.depart ? 0.5 + 0.5 * Math.sin((t - R.memeEsc) * 6) : 0;
						return (
							<div key={i} style={{position: 'absolute', inset: 0, opacity: doux(t, R.toutes + i * 0.25, 0.4)}}>
								<Escalier
									t={t}
									x0={x0}
									base={800}
									echelle={0.37}
									construction={R.toutes + i * 0.25}
									notes={gamme(e.d).map((m) => nom(m, e.b))}
									balle={balleT}
									depart={R.depart}
									opacite={1}
								/>
								<div
									style={{
										position: 'absolute',
										left: x0 + 222,
										top: 870,
										transform: 'translateX(-50%)',
										fontFamily: ANTON,
										fontSize: 54,
										color: C.texte,
										textShadow: glow ? `0 0 ${30 * glow}px ${C.ton}` : 'none',
									}}
								>
									{e.n} majeur
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* ---------- Accord ---------- */}
			{vAccord > 0.001 && (
				<div style={{position: 'absolute', inset: 0, opacity: clamp(vAccord)}}>
					{gamme(60)
						.slice(0, 7)
						.map((m, k) => {
							const choisie = k === 0 || k === 2 || k === 4;
							const couleur = k === 0 ? C.tonique : k === 2 ? C.tierce : C.quinte;
							const tChoix = k === 0 ? R.note1 : k === 2 ? R.note3 : R.note5;
							const vole = choisie ? doux(t, R.doMiSol[k / 2], 0.6) : 0;
							const pApp = rebond(t, R.avecGamme + k * 0.08);
							const allumee = choisie && t >= tChoix;
							const eteinte = !choisie && t >= R.note5 ? (1 - 0.75 * doux(t, R.note5, 0.4)) * (1 - doux(t, R.accordDo, 0.5)) : 1;
							const xL = 960 + (k - 3) * 170;
							const yL = 330;
							const xP = 960;
							const yP = [870, 720, 570][k / 2] ?? 0;
							const x = xL + (xP - xL) * vole;
							const y = yL + (yP - yL) * vole - Math.sin(Math.PI * vole) * 120;
							return (
								<React.Fragment key={k}>
									<div
										style={{
											position: 'absolute',
											left: x - 66,
											top: y - 66,
											width: 132,
											height: 132,
											borderRadius: 66,
											background: allumee ? couleur : '#2a3358',
											border: `5px solid ${allumee ? couleur : '#4b5694'}`,
											boxShadow: allumee ? `0 0 ${40 + 30 * (1 - doux(t, tChoix + 0.3, 0.6))}px ${couleur}` : 'none',
											transform: `scale(${pApp * (allumee ? 1 + 0.15 * (1 - doux(t, tChoix + 0.2, 0.5)) : 1)})`,
											opacity: eteinte,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontFamily: ANTON,
											fontSize: 52,
											color: allumee ? C.fond : C.texte,
											boxSizing: 'border-box',
										}}
									>
										{nom(m)}
									</div>
									<div
										style={{
											position: 'absolute',
											left: x,
											top: y + 100,
											transform: 'translate(-50%, -50%)',
											fontFamily: ANTON,
											fontSize: 44,
											color: allumee ? couleur : C.doux,
											opacity: pApp * eteinte * (1 - vole),
										}}
									>
										{k + 1}
									</div>
								</React.Fragment>
							);
						})}
					{t >= R.accordDo && (
						<div
							style={{
								position: 'absolute',
								left: 960,
								top: 720,
								width: 420,
								height: 420,
								marginLeft: -210,
								marginTop: -210,
								borderRadius: '50%',
								border: `6px solid ${C.or}`,
								opacity: 1 - doux(t, R.accordDo + 0.6, 0.8),
								transform: `scale(${0.6 + 0.9 * doux(t, R.accordDo, 1.2)})`,
							}}
						/>
					)}
				</div>
			)}

			{/* ---------- Fin ---------- */}
			{vFin > 0.001 && (
				<div style={{position: 'absolute', inset: 0, opacity: vFin * (1 - doux(t, R.duree - 0.8, 0.7))}}>
					<div
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 170,
							textAlign: 'center',
							fontFamily: ANTON,
							fontSize: 150,
							color: C.or,
							textShadow: `0 0 50px ${C.or}77`,
							transform: `scale(${rebond(t, R.retenir)})`,
						}}
					>
						À RETENIR
					</div>
					<Formule t={t} temps={R.formule2} y={500} opacite={doux(t, R.retenir + 0.3, 0.4)} taille={1.45} ecart={140} />
					<div
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 680,
							textAlign: 'center',
							fontFamily: INTER,
							fontWeight: 800,
							fontSize: 64,
							color: C.texte,
						}}
					>
						<span style={{opacity: doux(t, R.change, 0.4)}}>Change la note de départ,</span>
						<br />
						<span
							style={{
								display: 'inline-block',
								marginTop: 18,
								color: C.ton,
								opacity: doux(t, R.garde, 0.4),
								transform: `scale(${rebond(t, R.garde)})`,
								textShadow: `0 0 30px ${C.ton}88`,
							}}
						>
							garde l'escalier !
						</span>
					</div>
				</div>
			)}

			{/* ---------- Légendes ---------- */}
			<Legende t={t} a={R.douze} b={R.voisine}>
				<Mot c={C.or}>12 notes</Mot>, puis ça recommence
			</Legende>
			<Legende t={t} a={R.voisine} b={R.deuxDemi}>
				<Mot c={C.demi}>½ ton</Mot> = la touche juste à côté
			</Legende>
			<Legende t={t} a={R.deuxDemi} b={R.attention}>
				<Mot c={C.ton}>1 ton</Mot> = 2 demi tons
			</Legende>
			<Legende t={t} a={R.attention} b={R.entreMiFa} taille={90}>
				<span style={{display: 'inline-block', transform: `rotate(${Math.sin(t * 20) * 2 * (1 - doux(t, R.attention + 0.6, 0.4))}deg)`}}>
					<Mot c={C.alerte}>⚠ LE PIÈGE</Mot>
				</span>
			</Legende>
			<Legende t={t} a={R.entreMiFa} b={R.pareil}>
				<Mot c={C.alerte}>Mi → Fa</Mot> : pas de touche noire = <Mot c={C.demi}>½ ton</Mot>
			</Legende>
			<Legende t={t} a={R.pareil} b={R.escalier}>
				<Mot c={C.alerte}>Si → Do</Mot> : pareil, <Mot c={C.demi}>½ ton</Mot>
			</Legende>
			<Legende t={t} a={R.escalier} b={R.partantDo} y={70}>
				La gamme majeure = un <Mot c={C.ton}>escalier</Mot>
			</Legende>
			<Legende t={t} a={R.partantDo} b={R.blanches} y={70}>
				Départ : <Mot c={C.or}>DO</Mot>
			</Legende>
			<Legende t={t} a={R.blanches} b={R.partSol} y={70}>
				Do majeur : <Mot c={C.or}>que des touches blanches</Mot>
			</Legende>
			<Legende t={t} a={R.partSol} b={R.solMajeur + 0.4} y={70}>
				Départ : <Mot c={C.or}>SOL</Mot>
			</Legende>
			<Legende t={t} a={R.solMajeur + 0.4} b={R.partRe} y={70}>
				Sol majeur : <Mot c={C.noire}>1 dièse (Fa#)</Mot>
			</Legende>
			<Legende t={t} a={R.partRe} b={R.deuxNoires} y={70}>
				Départ : <Mot c={C.or}>RÉ</Mot>
			</Legende>
			<Legende t={t} a={R.deuxNoires} b={R.partFa} y={70}>
				Ré majeur : <Mot c={C.noire}>2 dièses (Fa#, Do#)</Mot>
			</Legende>
			<Legende t={t} a={R.partFa} b={R.siBemol1} y={70}>
				Départ : <Mot c={C.or}>FA</Mot>
			</Legende>
			<Legende t={t} a={R.siBemol1} b={R.gFa[7] + 0.7} y={70}>
				Ici, on dit <Mot c={C.noire}>Si bémol (Si♭)</Mot>
			</Legende>
			<Legende t={t} a={R.gFa[7] + 0.7} b={R.entends} y={70}>
				Fa majeur : <Mot c={C.noire}>1 bémol (Si♭)</Mot>
			</Legende>
			<Legende t={t} a={R.entends} b={R.depart}>
				Même escalier = <Mot c={C.ton}>même mélodie</Mot>
			</Legende>
			<Legende t={t} a={R.depart} b={R.bonus}>
				Seule la <Mot c={C.or}>marche de départ</Mot> change
			</Legende>
			<Legende t={t} a={R.bonus} b={R.accordDo} taille={64}>
				<Mot c={C.or}>BONUS</Mot> : fabriquer un accord avec les notes <Mot c={C.tonique}>1</Mot>, <Mot c={C.tierce}>3</Mot>, <Mot c={C.quinte}>5</Mot>
			</Legende>
			<Legende t={t} a={R.accordDo} b={R.retenir} taille={80}>
				Accord de <Mot c={C.or}>Do majeur</Mot>
			</Legende>
		</AbsoluteFill>
	);
};
