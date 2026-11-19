// Minutage de toute la vidéo, en secondes. Sert à l'image (Remotion) et au son (scripts/audio.mjs).

export const FPS = 30;
export const DUREE = 118;
export const f = (s) => Math.round(s * FPS);

// Scènes [début, fin]
export const S = {
	intro: [0, 6],
	clavier: [6, 17],
	demiTon: [17, 31],
	escalier: [31, 43],
	doMaj: [43, 55],
	solMaj: [55, 68],
	reMaj: [68, 80],
	faMaj: [80, 91],
	memeSon: [91, 100],
	accord: [100, 110],
	fin: [110, DUREE],
};

// La formule : 2 = 1 ton, 1 = ½ ton
export const FORMULE = [2, 2, 1, 2, 2, 2, 1];
export const gamme = (depart) => FORMULE.reduce((n, s) => [...n, n[n.length - 1] + s], [depart]);

const NOMS = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const nom = (midi, bemol = false) => {
	const n = NOMS[midi % 12];
	if (bemol && n === 'La#') return 'Si♭';
	return n;
};
export const estNoire = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);

// Scènes « on applique l'escalier sur le clavier »
export const SAUTS = 0.45; // durée d'un saut
export const GAMMES = [
	{id: 'doMaj', depart: 60, t0: 45.0, dt: 0.95, bemol: false},
	{id: 'solMaj', depart: 67, t0: 56.8, dt: 0.95, bemol: false},
	{id: 'reMaj', depart: 62, t0: 69.5, dt: 0.8, bemol: false},
	{id: 'faMaj', depart: 65, t0: 81.5, dt: 0.8, bemol: true},
];
export const atterrissage = (g, k) => g.t0 + k * g.dt; // k = 0..7
export const finSauts = (g) => atterrissage(g, 7);

// Exemples demi ton / ton : [de, à, début du saut, étiquette]
export const EXEMPLES = [
	{de: 60, a: 61, t: 18.5, label: '½'},
	{de: 60, a: 62, t: 21.5, label: '1'},
	{de: 64, a: 65, t: 25.0, label: '½', piege: true},
	{de: 71, a: 72, t: 28.0, label: '½', piege: true},
];

// Escalier : la balle monte à partir de ESC_T0
export const ESC_T0 = 35.0;
export const ESC_DT = 0.6;

// Même son : deux gammes jouées sur deux escaliers
export const MEME = [
	{depart: 60, t0: 92.5, dt: 0.3},
	{depart: 67, t0: 95.3, dt: 0.3},
];

// ---------- Notes jouées ----------
export const notes = () => {
	const n = [];
	const joue = (t, midi, d = 0.9, v = 1) => n.push({t, midi, d, v});
	// intro : gamme de Do rapide
	gamme(60).forEach((m, k) => joue(2.2 + k * 0.18, m, 0.5, 0.8));
	// clavier : 12 touches puis le Do suivant
	for (let k = 0; k < 12; k++) joue(7.8 + k * 0.4, 60 + k, 0.5, 0.75);
	joue(13.2, 72, 1.2);
	// demi ton / ton
	for (const e of EXEMPLES) {
		joue(e.t, e.de, 0.6);
		joue(e.t + SAUTS, e.a, 1.0);
	}
	// escalier
	gamme(60).forEach((m, k) => joue(ESC_T0 + k * ESC_DT, m, 0.7));
	// gammes sur le clavier
	for (const g of GAMMES) gamme(g.depart).forEach((m, k) => joue(atterrissage(g, k), m, 0.85));
	// même son
	for (const g of MEME) gamme(g.depart).forEach((m, k) => joue(g.t0 + k * g.dt, m, 0.45, 0.85));
	// accord
	for (const m of [60, 64, 67]) joue(104.8, m, 2.0, 0.8);
	[60, 64, 67].forEach((m, k) => joue(106.8 + k * 0.3, m, 0.6));
	for (const m of [60, 64, 67, 72]) joue(107.8, m, 2.2, 0.75);
	// fin
	gamme(60).forEach((m, k) => joue(112.5 + k * 0.2, m, 0.4, 0.75));
	for (const m of [48, 60, 64, 67, 72]) joue(114.2, m, 3.0, 0.7);
	return n;
};

// ---------- Bruitages ----------
export const bruitages = () => {
	const b = [];
	for (const k of Object.keys(S)) if (S[k][0] > 0) b.push({t: S[k][0], type: 'whoosh'});
	b.push({t: 0.2, type: 'whoosh'});
	for (let k = 0; k < 7; k++) b.push({t: 31.6 + k * 0.32, type: 'pop'});
	for (const g of GAMMES) {
		gamme(g.depart).forEach((m, k) => {
			if (estNoire(m)) b.push({t: atterrissage(g, k), type: 'eclat'});
		});
		for (let k = 0; k < 8; k++) b.push({t: finSauts(g) + 0.55 + k * 0.08, type: 'pop'});
	}
	for (const e of EXEMPLES) if (e.piege) b.push({t: e.t + SAUTS, type: 'eclat'});
	b.push({t: 103.5, type: 'whoosh'});
	return b;
};
