// Repères de la vidéo « Harmoniser la gamme », en secondes, lus dans alignement.json (voix de Paul).
// Sert à l'image (Remotion) et au son (scripts/audio.mjs).

export const FPS = 30;
export const f = (s) => Math.round(s * FPS);

// Gamme de Do majeur et ses sept accords (MIDI)
export const GAMME = [60, 62, 64, 65, 67, 69, 71];
export const NOMS = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
export const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
export const NATURE = ['majeur', 'mineur', 'mineur', 'majeur', 'majeur', 'mineur', 'diminué'];
const midiDegre = (d) => GAMME[d % 7] + 12 * Math.floor(d / 7);
export const accord = (k) => [midiDegre(k), midiDegre(k + 2), midiDegre(k + 4)];
export const nomDegre = (d) => NOMS[d % 7];

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
	return {debut: r[0].debut, fin: r[r.length - 1].fin, mots: r.map((m) => m.debut)};
};

export const calculerReperes = (alignement) => {
	const l = jetons(alignement.mots);
	const T = trouveur(l);
	const R = {};
	// Accroche
	R.septNotes = T('seulement sept notes').mots[1];
	R.septAccords = T('sept accords').debut;
	R.entendent = T('s entendent').debut;
	R.accrocheFin = T('entre eux').fin + 0.3;
	// Rappel
	R.rappel = T('petit rappel').debut;
	R.tierces = T('tierces empilees').debut;
	R.prends1 = T('tu prends une note').mots[3];
	R.sautes = T('tu sautes la suivante').mots[1];
	R.prends2 = T('tu prends celle d apres').mots[3];
	R.recommences = T('et tu recommences').mots[2];
	R.doMiSol0 = T('do mi sol', {apres: 18}).mots;
	// Harmoniser
	R.maintenant = T('maintenant on fait pareil').debut;
	R.chaqueNote = T('chaque note').debut;
	R.harmoniser = T('harmoniser').debut;
	// Les sept accords : « Sur X : X, Y, Z »
	R.lignes = [];
	let apres = 30;
	for (let k = 0; k < 7; k++) {
		const n = [nomDegre(k), nomDegre(k + 2), nomDegre(k + 4)];
		const r = T(`sur ${nomDegre(k)} ${n.join(' ')}`, {apres});
		R.lignes.push({sur: r.mots[0], notes: r.mots.slice(2)});
		apres = r.fin;
	}
	// Famille
	R.famille = T('forment une famille').debut;
	R.tonalite = T('tonalite de do majeur').debut;
	R.enchainer = T('enchainer').debut;
	R.sonneBien = T('ca sonne bien').fin + 0.25;
	R.couleur = T('meme couleur').debut;
	R.joyeux = T('joyeux').debut;
	R.tristes = T('tristes').debut;
	// Majeur / mineur
	R.toutSeJoue = T('tout se joue').debut;
	R.accordMajeur = T('accord majeur').debut;
	R.deuxTonsEcart = T('deux tons d ecart').debut;
	R.deDoAMi = T('de do a mi').mots;
	R.deuxTons1 = T('deux tons', {apres: R.deDoAMi[3]}).debut;
	R.gai = T('gai').debut;
	R.accordMineur = T('accord mineur').debut;
	R.unTonDemiEcart = T('un ton et demi d ecart').debut;
	R.deLaADo = T('de la a do').mots;
	R.unTonDemi1 = T('un ton et demi', {apres: R.deLaADo[3]}).debut;
	R.melancolique = T('melancolique').debut;
	R.ecoute = T('ecoute').debut;
	R.doMiSol1 = T('do mi sol', {apres: R.ecoute}).mots;
	R.baisse = T('je baisse le mi').mots[3];
	R.devient = T('devient mi bemol').mots[1];
	R.doMineur = T('do mineur').debut;
	R.doMibSol = T('do mi bemol sol', {apres: R.doMineur + 0.3}).mots;
	R.difference = T('tu entends la difference').debut;
	R.differenceFin = T('tu entends la difference').fin + 0.2;
	// Mesures
	R.mesure = T('on mesure').debut;
	R.mesures = [];
	apres = R.mesure;
	for (let k = 0; k < 6; k++) {
		const r = T(`${nomDegre(k)} vers ${nomDegre(k + 2)}`, {apres});
		const it = NATURE[k] === 'majeur' ? T('deux tons', {apres: r.fin}) : T('un ton et demi', {apres: r.fin});
		const na = T(`${nomDegre(k)} ${NATURE[k] === 'majeur' ? 'majeur' : 'mineur'}`, {apres: it.fin});
		R.mesures.push({racine: r.mots[0], tierce: r.mots[2], intervalle: it.debut, nature: na.debut});
		apres = na.fin;
	}
	R.etSi = T('et si').debut;
	R.siVersRe = T('si vers re').debut;
	R.siVersReIt = T('un ton et demi', {apres: R.siVersRe}).debut;
	R.reVersFa = T('re vers fa', {apres: R.siVersRe}).debut;
	R.encore = T('encore un ton et demi').debut;
	R.deuxPetites = T('deux petites tierces').debut;
	R.aPart = T('accord a part').debut;
	R.siDiminue = T('si diminue').debut;
	// À retenir
	R.retenir = T('a retenir').debut;
	R.troisMajeurs = T('trois accords majeurs').debut;
	R.recapMaj = T('do fa et sol', {apres: R.troisMajeurs}).mots.filter((_, i) => i !== 2);
	R.troisMineurs = T('trois accords mineurs').debut;
	R.recapMin = T('re mi et la', {apres: R.troisMineurs}).mots.filter((_, i) => i !== 2);
	R.unDiminue = T('un accord diminue', {apres: R.troisMineurs}).debut;
	R.recapDim = T('si', {apres: R.unDiminue}).debut;
	R.suite = T('majeur mineur mineur majeur majeur mineur diminue').mots;
	R.cetteSuite = T('cette suite').debut;
	R.toutes = T('toutes les gammes majeures').debut;
	R.finVoix = l[l.length - 1].fin;
	R.duree = R.finVoix + 3.5;
	return R;
};

// ---------- Notes et accords joués ----------
export const notes = (R) => {
	const n = [];
	const joue = (t, midi, d = 0.8, v = 1) => n.push({t, midi, d, v});
	const plaque = (t, k, d = 1.2, v = 0.75, basse = true) => {
		for (const m of accord(k)) joue(t, m, d, v);
		if (basse) joue(t, accord(k)[0] - 12, d, v * 0.8);
	};
	// accroche : I, IV, V, I
	[0, 3, 4, 0].forEach((k, i) => plaque(R.accrocheFin + i * 0.62, k, 0.55, 0.7));
	// rappel
	joue(R.prends1, 60, 0.6, 0.7);
	joue(R.prends2, 64, 0.6, 0.7);
	joue(R.recommences, 67, 0.6, 0.7);
	R.doMiSol0.forEach((t, i) => joue(t, accord(0)[i], 0.7));
	plaque(R.doMiSol0[2] + 0.55, 0, 1.4, 0.7);
	// sept accords
	R.lignes.forEach((ligne, k) => {
		ligne.notes.forEach((t, i) => joue(t, accord(k)[i], 0.6, 0.75));
		plaque(ligne.notes[2] + 0.38, k, 0.9, 0.6);
	});
	// famille : I, V, VI, IV dans la pause
	[0, 4, 5, 3].forEach((k, i) => plaque(R.sonneBien + i * 0.65, k, 0.6, 0.7));
	plaque(R.joyeux, 0, 0.9, 0.55);
	plaque(R.tristes, 5, 0.9, 0.55);
	// demi tons
	[60, 61, 62, 63, 64].forEach((m, i) => joue(R.deDoAMi[1] + i * ((R.deuxTons1 - R.deDoAMi[1]) / 4), m, 0.35, 0.6));
	plaque(R.gai, 0, 1.6, 0.7);
	[69, 70, 71, 72].forEach((m, i) => joue(R.deLaADo[1] + i * ((R.unTonDemi1 - R.deLaADo[1]) / 3), m, 0.35, 0.6));
	plaque(R.melancolique, 5, 1.6, 0.7);
	R.doMiSol1.forEach((t, i) => joue(t, [60, 64, 67][i], 0.7));
	for (const m of [48, 60, 64, 67]) joue(R.doMiSol1[2] + 0.6, m, 1.6, 0.7);
	joue(R.baisse, 64, 0.8, 0.8);
	joue(R.devient + 0.5, 63, 0.9, 0.8);
	[R.doMibSol[0], R.doMibSol[1], R.doMibSol[3]].forEach((t, i) => joue(t, [60, 63, 67][i], 0.7));
	for (const m of [48, 60, 63, 67]) joue(R.doMibSol[3] + 0.6, m, 1.2, 0.7);
	for (const m of [48, 60, 64, 67]) joue(R.differenceFin, m, 0.9, 0.75);
	for (const m of [48, 60, 63, 67]) joue(R.differenceFin + 1.0, m, 1.0, 0.75);
	// mesures
	R.mesures.forEach((x, k) => plaque(x.nature, k, 1.0, 0.65));
	plaque(R.siDiminue, 6, 1.4, 0.7);
	// à retenir
	R.recapMaj.forEach((t, i) => plaque(t, [0, 3, 4][i], 0.6, 0.55));
	R.recapMin.forEach((t, i) => plaque(t, [1, 2, 5][i], 0.6, 0.55));
	plaque(R.recapDim, 6, 0.8, 0.55);
	R.suite.forEach((t, k) => plaque(t, k, 0.55, 0.6));
	for (const m of [36, 48, 60, 64, 67, 72]) joue(R.finVoix + 0.4, m, 3, 0.7);
	return n;
};

export const bruitages = (R) => {
	const b = [];
	for (const t of [0.1, R.rappel, R.maintenant, R.lignes[0].sur, R.famille, R.toutSeJoue, R.ecoute, R.mesure, R.retenir]) b.push({t: Math.max(0, t - 0.25), type: 'whoosh'});
	for (let k = 0; k < 7; k++) b.push({t: R.septNotes + k * 0.08, type: 'pop'});
	b.push({t: R.harmoniser, type: 'eclat'});
	b.push({t: R.joyeux, type: 'eclat'});
	b.push({t: R.devient, type: 'pop'});
	R.mesures.forEach((x) => b.push({t: x.nature, type: 'pop'}));
	b.push({t: R.siDiminue, type: 'eclat'});
	b.push({t: R.toutes, type: 'eclat'});
	return b;
};
