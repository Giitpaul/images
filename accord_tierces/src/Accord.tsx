import React from 'react';
import {AbsoluteFill, Audio, interpolate, interpolateColors, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS, versFrame} from './synchro.mjs';

export type Reperes = {
	titreFin: number;
	notes: number[];
	compteur: number[];
	arc: number;
	allumageDo: number;
	descenteDo: number;
	etiquetteTonique: number;
	griseRe: number;
	poseMi: number;
	etiquetteTierce: number;
	griseFa: number;
	poseSol: number;
	etiquetteQuinte: number;
	accord: number[];
	accolades: number;
	titreFinal: number;
	finVoix: number;
	duree: number;
};

export type AccordProps = {reperes: Reperes | null; audio: string};

// Couleurs : une par fonction, réutilisée partout.
const C = {
	fond: '#0e1320',
	texte: '#f4f1ea',
	neutre: '#26304a',
	neutreBord: '#3b4766',
	gris: '#3a3e47',
	grisTexte: '#7c818c',
	tonique: '#ff6b57',
	tierce: '#f6c344',
	quinte: '#4fb0ff',
};

const NOTES = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const TAILLE = 130; // diamètre d'une pastille
const LIGNE_Y = 300;
const ESPACE = 210;
const xNote = (i: number) => 960 + (i - 3) * ESPACE;
const PILE_X = 960;
const PILE_Y = [860, 720, 580]; // Do, Mi, Sol

const POLICE = 'Inter, sans-serif';

// Ressort doux, sans rebond, qui démarre au temps t (secondes).
const doux = (frame: number, t: number, duree = 0.6) =>
	spring({frame: frame - versFrame(t), fps: FPS, config: {damping: 200}, durationInFrames: Math.round(duree * FPS)});
// Ressort pour les déplacements, légère souplesse à l'arrivée.
const souple = (frame: number, t: number) =>
	spring({frame: frame - versFrame(t), fps: FPS, config: {damping: 18, stiffness: 110, mass: 1}});

const Polices: React.FC = () => (
	<style>{`
@font-face { font-family: 'Inter'; font-weight: 500; src: url('${staticFile('polices/Inter-Medium.otf')}') format('opentype'); }
@font-face { font-family: 'Inter'; font-weight: 700; src: url('${staticFile('polices/Inter-Bold.otf')}') format('opentype'); }
`}</style>
);

const Pastille: React.FC<{
	x: number;
	y: number;
	nom: string;
	fond: string;
	bord: string;
	couleurTexte: string;
	opacite?: number;
	echelle?: number;
	fantome?: boolean;
}> = ({x, y, nom, fond, bord, couleurTexte, opacite = 1, echelle = 1, fantome = false}) => (
	<div
		style={{
			position: 'absolute',
			left: x - TAILLE / 2,
			top: y - TAILLE / 2,
			width: TAILLE,
			height: TAILLE,
			borderRadius: TAILLE / 2,
			background: fantome ? 'transparent' : fond,
			border: `5px ${fantome ? 'dashed' : 'solid'} ${bord}`,
			boxSizing: 'border-box',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: couleurTexte,
			fontFamily: POLICE,
			fontWeight: 700,
			fontSize: 50,
			opacity: opacite,
			transform: `scale(${echelle})`,
		}}
	>
		{nom}
	</div>
);

const Etiquette: React.FC<{x: number; y: number; texte: string; couleur: string; p: number; aligne?: 'gauche' | 'droite' | 'centre'; taille?: number}> = ({
	x,
	y,
	texte,
	couleur,
	p,
	aligne = 'gauche',
	taille = 46,
}) => {
	const decalage = aligne === 'gauche' ? '0%' : aligne === 'droite' ? '-100%' : '-50%';
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: `translate(${decalage}, -50%) translateY(${(1 - p) * 18}px)`,
				opacity: p,
				color: couleur,
				fontFamily: POLICE,
				fontWeight: 700,
				fontSize: taille,
				whiteSpace: 'nowrap',
			}}
		>
			{texte}
		</div>
	);
};

// Accolade verticale, pointe vers la gauche.
const accolade = (x: number, y1: number, y2: number, l: number) => {
	const m = (y1 + y2) / 2;
	const r = 14;
	const xm = x - l / 2;
	return `M ${x} ${y1} Q ${xm} ${y1} ${xm} ${y1 + r} L ${xm} ${m - r} Q ${xm} ${m} ${x - l} ${m} Q ${xm} ${m} ${xm} ${m + r} L ${xm} ${y2 - r} Q ${xm} ${y2} ${x} ${y2}`;
};

export const Accord: React.FC<AccordProps> = ({reperes: r, audio}) => {
	const frame = useCurrentFrame();
	if (!r) return <AbsoluteFill style={{background: C.fond}} />;

	// 1. Titre : visible de 0 au mot « gamme ».
	const titreIn = doux(frame, 0.1, 0.8);
	const titreOut = doux(frame, r.titreFin, 0.4);
	const titreOpacite = titreIn * (1 - titreOut);

	// 7. La ligne de la gamme s'efface un peu quand la pile devient le sujet.
	const ligneAttenuee = 1 - 0.7 * doux(frame, r.accord[0], 0.8);

	// Couleur et état de chaque pastille de la gamme.
	const couleursLigne = NOTES.map((_, i) => {
		let fond = C.neutre;
		let bord = C.neutreBord;
		let texte = C.texte;
		let numero = C.grisTexte;
		const vers = (cible: string, p: number) => {
			fond = interpolateColors(p, [0, 1], [fond, cible]);
			bord = interpolateColors(p, [0, 1], [bord, cible]);
			numero = interpolateColors(p, [0, 1], [numero, cible]);
		};
		if (i === 0) {
			const p = doux(frame, r.allumageDo, 0.5);
			vers(C.tonique, p);
			texte = interpolateColors(p, [0, 1], [C.texte, C.fond]);
		}
		if (i === 2) {
			const p = doux(frame, r.poseMi, 0.4);
			vers(C.tierce, p);
			texte = interpolateColors(p, [0, 1], [C.texte, C.fond]);
		}
		if (i === 4) {
			const p = doux(frame, r.poseSol, 0.4);
			vers(C.quinte, p);
			texte = interpolateColors(p, [0, 1], [C.texte, C.fond]);
		}
		if (i === 1 || i === 3) {
			const p = doux(frame, i === 1 ? r.griseRe : r.griseFa, 0.5);
			fond = interpolateColors(p, [0, 1], [fond, C.gris]);
			bord = interpolateColors(p, [0, 1], [bord, C.gris]);
			texte = interpolateColors(p, [0, 1], [texte, C.grisTexte]);
		}
		return {fond, bord, texte, numero};
	});

	// Les notes qui partent dans la pile : 0 = Do, 2 = Mi, 4 = Sol.
	const departs: {i: number; t: number; slot: number; couleur: string}[] = [
		{i: 0, t: r.descenteDo, slot: 0, couleur: C.tonique},
		{i: 2, t: r.poseMi, slot: 1, couleur: C.tierce},
		{i: 4, t: r.poseSol, slot: 2, couleur: C.quinte},
	];

	// 3. Compteur 1, 2, 3.
	const compteurIndex = r.compteur.reduce((acc, t, k) => (frame >= versFrame(t) ? k : acc), -1);
	const anneauX =
		compteurIndex < 0
			? xNote(0)
			: r.compteur.reduce((x, t, k) => (k === 0 ? xNote(0) : x + (xNote(k) - xNote(k - 1)) * doux(frame, t, 0.22)), xNote(0));
	const compteurOpacite = doux(frame, r.compteur[0], 0.3) * (1 - doux(frame, r.arc, 0.4));
	const chiffrePop = compteurIndex >= 0 ? doux(frame, r.compteur[compteurIndex], 0.3) : 0;

	// Arc Do → Mi.
	const arcP = doux(frame, r.arc, 0.9);
	const arcSortie = doux(frame, r.allumageDo, 0.5);
	const arcOpacite = (arcP > 0 ? 1 : 0) * (1 - arcSortie);
	const x0 = xNote(0);
	const x2 = xNote(2);
	const haut = LIGNE_Y - TAILLE / 2 - 12;
	const arcChemin = `M ${x0} ${haut} Q ${(x0 + x2) / 2} ${haut - 150} ${x2} ${haut}`;
	const arcLongueur = 560;

	// Accolades.
	const accP = doux(frame, r.accolades, 0.7);
	const ACC_X = PILE_X - TAILLE / 2 - 30;

	// Pulsation de la pile sur « Do, Mi, Sol ».
	const pulsation = (slot: number) => {
		const t = r.accord[slot];
		const f = frame - versFrame(t);
		if (f < 0) return 1;
		return 1 + 0.08 * Math.sin(Math.PI * Math.min(f / (0.45 * FPS), 1));
	};

	return (
		<AbsoluteFill style={{background: C.fond}}>
			<Polices />
			<Audio src={staticFile(audio)} />

			{/* Titre */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: titreOpacite}}>
				<div
					style={{
						fontFamily: POLICE,
						fontWeight: 700,
						fontSize: 110,
						color: C.texte,
						transform: `translateY(${(1 - titreIn) * 30}px)`,
					}}
				>
					Construire un accord
				</div>
			</AbsoluteFill>

			{/* 2. Gamme */}
			<AbsoluteFill style={{opacity: ligneAttenuee}}>
				{NOTES.map((nom, i) => {
					const p = doux(frame, r.notes[i], 0.5);
					const depart = departs.find((d) => d.i === i);
					const parti = depart ? frame >= versFrame(depart.t) : false;
					const c = couleursLigne[i];
					return (
						<React.Fragment key={nom}>
							<div style={{position: 'absolute', inset: 0, opacity: p, transform: `translateY(${(1 - p) * 24}px)`}}>
								<Pastille
									x={xNote(i)}
									y={LIGNE_Y}
									nom={nom}
									fond={c.fond}
									bord={parti && depart ? depart.couleur : c.bord}
									couleurTexte={parti && depart ? depart.couleur : c.texte}
									fantome={parti}
									opacite={parti ? 0.55 : 1}
								/>
								<Etiquette x={xNote(i)} y={LIGNE_Y + TAILLE / 2 + 38} texte={String(i + 1)} couleur={c.numero} p={1} aligne="centre" taille={36} />
							</div>
						</React.Fragment>
					);
				})}
			</AbsoluteFill>

			{/* 3. Compteur */}
			<div
				style={{
					position: 'absolute',
					left: anneauX - (TAILLE + 34) / 2,
					top: LIGNE_Y - (TAILLE + 34) / 2,
					width: TAILLE + 34,
					height: TAILLE + 34,
					borderRadius: '50%',
					border: `5px solid ${C.texte}`,
					boxSizing: 'border-box',
					opacity: compteurOpacite,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: anneauX,
					top: LIGNE_Y - TAILLE / 2 - 70,
					transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * chiffrePop})`,
					opacity: compteurOpacite,
					fontFamily: POLICE,
					fontWeight: 700,
					fontSize: 64,
					color: C.texte,
				}}
			>
				{compteurIndex >= 0 ? compteurIndex + 1 : ''}
			</div>

			{/* Arc tierce */}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: arcOpacite}}>
				<path
					d={arcChemin}
					fill="none"
					stroke={C.tierce}
					strokeWidth={6}
					strokeLinecap="round"
					strokeDasharray={arcLongueur}
					strokeDashoffset={arcLongueur * (1 - arcP)}
				/>
			</svg>
			<div style={{opacity: arcOpacite}}>
				<Etiquette x={(x0 + x2) / 2} y={haut - 115} texte="tierce" couleur={C.tierce} p={doux(frame, r.arc + 0.2, 0.5)} aligne="centre" />
			</div>

			{/* Pile */}
			{departs.map((d) => {
				if (frame < versFrame(d.t)) return null;
				const p = souple(frame, d.t);
				const x = interpolate(p, [0, 1], [xNote(d.i), PILE_X]);
				const y = interpolate(p, [0, 1], [LIGNE_Y, PILE_Y[d.slot]]);
				return (
					<Pastille
						key={d.i}
						x={x}
						y={y}
						nom={NOTES[d.i]}
						fond={d.couleur}
						bord={d.couleur}
						couleurTexte={C.fond}
						echelle={pulsation(d.slot)}
					/>
				);
			})}

			{/* Étiquettes de fonction */}
			<Etiquette x={PILE_X + TAILLE / 2 + 34} y={PILE_Y[0]} texte="tonique" couleur={C.tonique} p={doux(frame, r.etiquetteTonique)} />
			<Etiquette x={PILE_X + TAILLE / 2 + 34} y={PILE_Y[1]} texte="tierce" couleur={C.tierce} p={doux(frame, r.etiquetteTierce)} />
			<Etiquette x={PILE_X + TAILLE / 2 + 34} y={PILE_Y[2]} texte="quinte" couleur={C.quinte} p={doux(frame, r.etiquetteQuinte)} />

			{/* 7. Accolades tierce */}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: accP}}>
				<path d={accolade(ACC_X, PILE_Y[1] + 6, PILE_Y[0] - 6, 34)} fill="none" stroke={C.texte} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
				<path d={accolade(ACC_X, PILE_Y[2] + 6, PILE_Y[1] - 6, 34)} fill="none" stroke={C.texte} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			<Etiquette x={ACC_X - 50} y={(PILE_Y[0] + PILE_Y[1]) / 2} texte="tierce" couleur={C.texte} p={accP} aligne="droite" taille={40} />
			<Etiquette x={ACC_X - 50} y={(PILE_Y[1] + PILE_Y[2]) / 2} texte="tierce" couleur={C.texte} p={accP} aligne="droite" taille={40} />

			{/* Titre final */}
			<Etiquette x={960} y={1000} texte="Accord de Do majeur" couleur={C.texte} p={doux(frame, r.titreFinal, 0.7)} aligne="centre" taille={66} />
		</AbsoluteFill>
	);
};
