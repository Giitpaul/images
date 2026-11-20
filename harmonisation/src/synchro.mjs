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
// Gamme de Ré majeur
export const GAMME_RE = [62, 64, 66, 67, 69, 71, 73];
export const NOMS_RE = ['Ré', 'Mi', 'Fa#', 'Sol', 'La', 'Si', 'Do#'];
const PAROLE_RE = ['re', 'mi', 'fa diese', 'sol', 'la', 'si', 'do diese'];
const midiRe = (d) => GAMME_RE[d % 7] + 12 * Math.floor(d / 7);
export const accordRe = (k) => [midiRe(k), midiRe(k + 2), midiRe(k + 4)];
export const nomRe = (d) => NOMS_RE[d % 7];
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
	return {debut: r[0].debut, fin: r[r.length - 1].fin, mots: r.map((m) => m.debut), jetons: r};
};

// Débuts des noms de notes (« fa diese » compte pour une note).
// Juste après le dernier mot trouvé (les fins corrigées peuvent déborder sur le mot suivant).
const apresDe = (x) => x.mots[x.mots.length - 1] + 0.01;
const debutsNotes = (r) => r.jetons.filter((m) => m.j !== 'diese' && m.j !== 'bemol').map((m) => m.debut);

export const calculerReperes = (alignement) => {
	const l = jetons(alignement.mots);
	const T = trouveur(l);
	const R = {};
	// Accroche
	R.septNotes = T('seules sept notes').mots[1];
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
		apres = apresDe(r);
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
	R.tierceMaj = T('la tierce est majeure').debut;
	R.gai = T('gai').debut;
	R.accordMineur = T('accord mineur').debut;
	R.unTonDemiEcart = T('un ton et demi d ecart').debut;
	R.deLaADo = T('de la a do').mots;
	R.unTonDemi1 = T('un ton et demi', {apres: R.deLaADo[3]}).debut;
	R.tierceMin = T('la tierce est mineure').debut;
	R.melancolique = T('melancolique').debut;
	R.ecoute = T('ecoute').debut;
	R.doMiSol1 = T('do mi sol', {apres: R.ecoute}).mots;
	R.avecTierce = T('avec la tierce majeure').debut;
	R.baisse = T('je baisse le mi').mots[3];
	R.devient = T('devient mi bemol').mots[1];
	R.doMineur = T('do mineur').debut;
	R.doMibSol = T('do mi bemol sol', {apres: R.doMineur + 0.3}).mots;
	R.intervalleMib = T('l intervalle do mi bemol').debut;
	R.difference = T('tu entends la difference').debut;
	R.differenceFin = T('tu entends la difference').fin + 0.2;
	// Attention : Do mineur hors de la tonalité
	R.attention = T('attention').debut;
	R.pasPartie = T('ne fait pas partie').debut;
	R.accordDoMib = T('l accord do mi bemol sol').debut;
	R.nAppartient = T('n appartient pas').debut;
	// Mesures
	R.enDoMajeur = T('en do majeur on mesure').debut;
	R.mesure = T('on mesure').debut;
	R.mesures = [];
	apres = R.mesure;
	for (let k = 0; k < 6; k++) {
		const r = T(`${nomDegre(k)} vers ${nomDegre(k + 2)}`, {apres});
		const it = NATURE[k] === 'majeur' ? T('deux tons', {apres: apresDe(r)}) : T('un ton et demi', {apres: apresDe(r)});
		const na = T(`${nomDegre(k)} ${NATURE[k] === 'majeur' ? 'majeur' : 'mineur'}`, {apres: apresDe(it)});
		R.mesures.push({racine: r.mots[0], tierce: r.mots[2], intervalle: it.debut, nature: na.debut});
		apres = apresDe(na);
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
	R.nousAvons = T('nous avons donc une suite').debut;
	R.suite = T('majeur mineur mineur majeur majeur mineur diminue').mots;
	R.retrouver = T('on peut retrouver cette suite').debut;
	R.nimporte = T('n importe quelle tonalite').debut;
	// Exemple en Ré majeur
	R.exempleRe = T('exemple avec la gamme de re majeur').debut;
	R.gammeRe = debutsNotes(T('re mi fa diese sol la si do diese re', {apres: R.exempleRe + 1})).slice(0, 8);
	R.reLignes = [];
	apres = R.gammeRe[7];
	for (let k = 0; k < 7; k++) {
		const n = [PAROLE_RE[k], PAROLE_RE[(k + 2) % 7], PAROLE_RE[(k + 4) % 7]];
		const r = T(`sur ${PAROLE_RE[k]} ${n.join(' ')}`, {apres});
		const notesT = debutsNotes(r).slice(-3);
		for (let i = 1; i < 3; i++) notesT[i] = Math.max(notesT[i], notesT[i - 1] + 0.25); // écart minimal pour l'animation
		const nat = ['majeur', 'mineur', 'mineur', 'majeur', 'majeur', 'mineur', 'diminue'][k];
		const na = T(`accord ${nat}`, {apres: apresDe(r)});
		const ti = k < 6 ? T(`la tierce ${n[0]} ${n[1]}`, {apres: apresDe(na)}).debut : T('deux tierces mineures', {apres: apresDe(na)}).debut;
		R.reLignes.push({sur: r.mots[0], notes: notesT, nature: na.mots[1], tierce: ti});
		apres = ti;
	}
	R.retrouveBien = T('on retrouve bien notre suite').debut;
	R.suite2 = T('majeur mineur mineur majeur majeur mineur diminue', {derniere: true}).mots;
	R.toutes = T('n importe quelle gamme majeure').debut;
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
	// tierces de l'exemple sonore
	joue(R.avecTierce + 0.6, 60, 0.5, 0.6);
	joue(R.avecTierce + 0.9, 64, 0.8, 0.6);
	joue(R.intervalleMib + 0.5, 60, 0.5, 0.6);
	joue(R.intervalleMib + 0.8, 63, 0.8, 0.6);
	// attention : l'accord de Do mineur, hors tonalité
	for (const m of [48, 60, 63, 67]) joue(R.accordDoMib + 0.3, m, 1.0, 0.55);
	// exemple en Ré majeur
	const plaqueRe = (t, k, d = 1.0, v = 0.65) => {
		for (const m of accordRe(k)) joue(t, m, d, v);
		joue(t, accordRe(k)[0] - 12, d, v * 0.8);
	};
	R.gammeRe.forEach((t, i) => joue(t, [62, 64, 66, 67, 69, 71, 73, 74][i], 0.6, 0.75));
	R.reLignes.forEach((l, k) => {
		l.notes.forEach((t, i) => joue(t, accordRe(k)[i], 0.55, 0.7));
		plaqueRe(l.nature, k, 1.0, 0.6);
	});
	// la suite en Ré, dans la pause après Do# diminué
	const p0 = R.reLignes[6].tierce + 2.2;
	for (let k = 0; k < 7; k++) plaqueRe(Math.min(p0, R.retrouveBien - 2.6) + k * 0.34, k, 0.32, 0.6);
	R.suite2.forEach((t, k) => plaqueRe(t, k, 0.5, 0.55));
	for (const m of [38, 50, 62, 66, 69, 74]) joue(R.finVoix + 0.4, m, 3, 0.7);
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
	b.push({t: R.attention, type: 'alerte'});
	b.push({t: R.nAppartient, type: 'alerte'});
	for (const t of [R.attention, R.nousAvons, R.exempleRe, R.retrouveBien]) b.push({t: Math.max(0, t - 0.25), type: 'whoosh'});
	R.gammeRe.forEach((t) => b.push({t, type: 'pop'}));
	R.reLignes.forEach((l) => b.push({t: l.nature, type: 'pop'}));
	return b;
};
