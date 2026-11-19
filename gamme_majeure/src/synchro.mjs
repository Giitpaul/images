// Tous les repères de la vidéo, en secondes, lus dans alignement.json (voix de Paul).
// Sert à l'image (Remotion) et au son (scripts/audio.mjs).

export const FPS = 30;
export const f = (s) => Math.round(s * FPS);
export const FORMULE = [2, 2, 1, 2, 2, 2, 1]; // 2 = 1 ton, 1 = ½ ton
export const gamme = (depart) => FORMULE.reduce((n, s) => [...n, n[n.length - 1] + s], [depart]);
export const estNoire = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
const NOMS = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const nom = (m, bemol = false) => (bemol && m % 12 === 10 ? 'Si♭' : NOMS[m % 12]);

const normaliser = (s) =>
	s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '');

const jetons = (mots) => {
	const l = [];
	for (const m of mots) for (const p of normaliser(m.mot).split("'").filter(Boolean)) l.push({j: p, debut: m.debut, fin: m.fin});
	return l;
};

const trouveur = (liste) => (expression, {apres = -1, derniere = false} = {}) => {
	const c = expression.split(' ').map(normaliser);
	const tr = [];
	for (let i = 0; i + c.length <= liste.length; i++) {
		if (liste[i].debut < apres) continue;
		if (c.every((x, k) => liste[i + k].j === x)) tr.push(liste.slice(i, i + c.length));
	}
	const r = derniere ? tr[tr.length - 1] : tr[0];
	if (!r) throw new Error(`Mot clé introuvable : "${expression}" après ${apres.toFixed(2)} s`);
	return {debut: r[0].debut, fin: r[r.length - 1].fin, mots: r};
};

// Débuts des noms de notes d'une liste (« fa diese » et « si bemol » comptent pour une note).
const debutsNotes = (r) => r.mots.filter((m) => m.j !== 'diese' && m.j !== 'bemol').map((m) => m.debut);
// Débuts de chaque élément de la formule (« un ton » ou « un demi ton ») : chaque « un ».
const debutsFormule = (r) => r.mots.filter((m) => m.j === 'un').map((m) => m.debut);

export const calculerReperes = (alignement) => {
	const l = jetons(alignement.mots);
	const T = trouveur(l);
	const R = {};
	R.secret = T('le secret');
	R.regarde = T('regarde').debut;
	R.suivent = T('se suivent').debut;
	R.douze = T('douze').debut;
	R.doSuivant = T('do suivant').debut;
	R.voisine = T('voisine').debut;
	R.demiTon1 = T('demi ton', {apres: R.voisine}).debut;
	R.deuxDemi = T('deux demi tons').debut;
	R.unTon = T('fait un ton').mots[1].debut;
	R.attention = T('attention').debut;
	R.entreMiFa = T('entre mi et fa').debut;
	R.pasNoire = T('pas de touche noire').debut;
	R.seulement = T('seulement un demi ton').mots[2].debut;
	const pareil = T('pareil entre si et do');
	R.pareil = pareil.debut;
	R.pareilDo = pareil.mots[4].debut;
	R.escalier = T('comme un escalier').debut;
	R.grandes = T('grandes marches').debut;
	R.petites = T('petites marches').debut;
	const motif = T('le motif ne change jamais');
	R.motif = motif.debut;
	R.formule = debutsFormule(T('un ton un ton un demi ton un ton un ton un ton un demi ton', {apres: motif.fin}));
	R.partantDo = T('partant de do').debut;
	R.gDo = debutsNotes(T('do re mi fa sol la si do', {apres: R.partantDo + 0.5}));
	R.blanches = T('touches blanches').debut;
	R.partSol = T('part de sol').debut;
	R.gSol = debutsNotes(T('sol la si do re mi', {apres: R.partSol + 0.5}));
	R.pourUnTon = T('pour faire un ton').debut;
	R.toucheNoire = T('une touche noire', {apres: R.pourUnTon}).debut;
	R.faDiese1 = T('fa diese', {apres: R.toucheNoire}).debut;
	R.solMajeur = T('sol majeur').debut;
	R.faDiese2 = T('fa diese', {apres: R.solMajeur}).debut;
	R.partRe = T('part de re').debut;
	R.gRe = debutsNotes(T('re mi fa diese sol la si do diese re', {apres: R.partRe + 0.5}));
	R.deuxNoires = T('deux touches noires').debut;
	R.fd3 = T('fa diese', {apres: R.deuxNoires}).debut;
	R.dd3 = T('do diese', {apres: R.deuxNoires}).debut;
	R.partFa = T('part de fa').debut;
	R.gFa3 = debutsNotes(T('fa sol la', {apres: R.partFa + 0.5}));
	R.demiTonFa = T('demi ton', {apres: R.gFa3[2]}).debut;
	R.apresLa = T('juste apres la').debut;
	R.siBemol1 = T('si bemol', {apres: R.apresLa}).debut;
	R.gFa = debutsNotes(T('fa sol la si bemol do re mi fa', {apres: R.siBemol1 + 0.3}));
	R.entends = T('tu entends').debut;
	R.toutes = T('toutes ces gammes').debut;
	R.memeEsc = T('meme escalier').debut;
	const depart = T('marche de depart change');
	R.depart = depart.debut;
	R.departFin = depart.fin;
	R.bonus = T('bonus').debut;
	R.avecGamme = T('avec une gamme').debut;
	R.note1 = T('note un').debut;
	R.note3 = T('note trois').debut;
	R.note5 = T('note cinq').debut;
	R.doMiSol = debutsNotes(T('do mi sol', {derniere: true}));
	R.accordDo = T('accord de do majeur', {derniere: true}).debut;
	R.retenir = T('a retenir').debut;
	R.formule2 = debutsFormule(T('un ton un ton un demi ton un ton un ton un ton un demi ton', {apres: R.retenir}));
	R.change = T('change la note').debut;
	const garde = T('garde l escalier');
	R.garde = garde.debut;
	R.finVoix = l[l.length - 1].fin;
	R.duree = R.finVoix + 3.5;
	R.secretFin = T('melodies').fin + 0.45; // gamme jouée juste après l'accroche
	R.secret = R.secret.debut;
	for (const [k, v] of Object.entries({gDo: 8, gSol: 6, gRe: 8, gFa3: 3, gFa: 8, formule: 7, formule2: 7, doMiSol: 3})) {
		if (R[k].length !== v) throw new Error(`${k} : ${R[k].length} au lieu de ${v}`);
	}
	return R;
};

// ---------- Fenêtres de sauts sur le clavier ----------
// Chaque fenêtre : touche de départ, atterrissages {m, t}, fin.
export const fenetres = (R) => {
	const g = (dep, temps, extra = []) => gamme(dep).slice(1, 1 + temps.length).map((m, k) => ({m, t: temps[k]})).concat(extra);
	return [
		{id: 'demi', debut: R.voisine, depart: 60, sauts: [{m: 61, t: R.demiTon1}], fin: R.deuxDemi},
		{id: 'ton', debut: R.deuxDemi, depart: 60, sauts: [{m: 61, t: R.deuxDemi + 0.55, demi: true}, {m: 62, t: R.deuxDemi + 1.1, demi: true}], fin: R.attention},
		{id: 'mifa', debut: R.entreMiFa, depart: 64, sauts: [{m: 65, t: R.seulement}], fin: R.pareil},
		{id: 'sido', debut: R.pareil, depart: 71, sauts: [{m: 72, t: R.pareilDo}], fin: R.escalier},
		{id: 'do', debut: R.gDo[0], depart: 60, sauts: g(60, R.gDo.slice(1)), fin: R.partSol, gamme: true, resultat: R.blanches},
		{id: 'sol', debut: R.gSol[0], depart: 67, sauts: g(67, [...R.gSol.slice(1), R.faDiese1, R.solMajeur]), fin: R.partRe, gamme: true, resultat: R.solMajeur + 0.4},
		{id: 're', debut: R.gRe[0], depart: 62, sauts: g(62, R.gRe.slice(1)), fin: R.partFa, gamme: true, resultat: R.deuxNoires},
		{id: 'fa1', debut: R.gFa3[0], depart: 65, sauts: g(65, [...R.gFa3.slice(1), R.siBemol1]), fin: R.gFa[0] - 0.3, gamme: true, bemol: true},
		{id: 'fa', debut: R.gFa[0], depart: 65, sauts: g(65, R.gFa.slice(1)), fin: R.entends, gamme: true, bemol: true, resultat: R.gFa[7] + 0.7},
	];
};

// ---------- Notes de piano et bruitages ----------
export const notes = (R) => {
	const n = [];
	const joue = (t, midi, d = 0.8, v = 1) => n.push({t, midi, d, v});
	gamme(60).forEach((m, k) => joue(R.secretFin + k * 0.14, m, 0.4, 0.8));
	const dtc = (R.douze - R.suivent) / 12;
	for (let k = 0; k < 12; k++) joue(R.suivent + k * dtc, 60 + k, 0.4, 0.55);
	joue(R.doSuivant, 72, 1.0, 0.8);
	for (const w of fenetres(R)) {
		joue(w.debut, w.depart, 0.7, 0.8);
		for (const s of w.sauts) joue(s.t, s.m, 0.8, 0.9);
	}
	joue(R.unTon, 60, 0.5, 0.6);
	joue(R.unTon + 0.25, 62, 0.8, 0.8);
	joue(R.motif, 60, 0.7, 0.8);
	gamme(60).slice(1).forEach((m, k) => joue(R.formule[k], m, 0.7, 0.85));
	// même son : Do majeur puis Sol majeur dans la pause
	const p0 = R.departFin + 0.25;
	gamme(60).forEach((m, k) => joue(p0 + k * 0.17, m, 0.35, 0.85));
	gamme(67).forEach((m, k) => joue(p0 + 1.6 + k * 0.17, m, 0.35, 0.85));
	// accord
	[60, 64, 67].forEach((m, k) => joue(R.doMiSol[k], m, 0.9, 0.9));
	for (const m of [60, 64, 67, 72]) joue(R.accordDo + 0.5, m, 2.2, 0.75);
	// fin
	joue(R.retenir, 60, 0.6, 0.7);
	gamme(60).slice(1).forEach((m, k) => joue(R.formule2[k], m, 0.6, 0.8));
	for (const m of [48, 60, 64, 67, 72]) joue(R.finVoix + 0.3, m, 3.0, 0.75);
	return n;
};

export const bruitages = (R) => {
	const b = [];
	for (const t of [0.15, R.regarde, R.escalier, R.partantDo, R.entends, R.bonus, R.retenir]) b.push({t: Math.max(0, t - 0.25), type: 'whoosh'});
	for (let k = 0; k < 8; k++) b.push({t: R.escalier + 0.2 + k * 0.12, type: 'pop'});
	for (const w of fenetres(R)) {
		for (const s of w.sauts) if (w.gamme && estNoire(s.m)) b.push({t: s.t, type: 'eclat'});
		if (w.resultat) for (let k = 0; k < 8; k++) b.push({t: w.resultat + k * 0.07, type: 'pop'});
	}
	b.push({t: R.attention, type: 'alerte'});
	b.push({t: R.seulement, type: 'eclat'});
	b.push({t: R.pareilDo, type: 'eclat'});
	for (const t of R.doMiSol) b.push({t, type: 'pop'});
	b.push({t: R.accordDo, type: 'eclat'});
	b.push({t: R.garde, type: 'eclat'});
	return b;
};
