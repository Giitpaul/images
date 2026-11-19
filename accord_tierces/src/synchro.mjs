// Synchronisation : tous les temps sont en secondes, lus dans alignement.json.
// Ce module sert à la fois à la vidéo (Remotion) et au script de vérification (Node).

export const FPS = 30;
export const MARGE_FIN = 1.5; // secondes gardées après la fin de la voix

export const versFrame = (secondes) => Math.round(secondes * FPS);

// Minuscules, sans accents, sans ponctuation.
export const normaliser = (s) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[’']/g, "'")
		.replace(/[^a-z0-9']/g, '');

// Variantes possibles d'une transcription (utile en mode B).
const VARIANTES = {
	do: ['do', 'dos', 'dot', 'doh'],
	re: ['re', 'ray', 'rai', 'rait', 'raie', 'reh'],
	mi: ['mi', 'mie', 'mis', 'mit', 'mee'],
	fa: ['fa', 'fat', 'fah'],
	sol: ['sol', 'sole', 'solle', 'saule', 'sold'],
	la: ['la', 'las', 'lah', 'là'],
	si: ['si', 'scie', 'sie', 'see', 'ci'],
	tonique: ['tonique', 'tonic'],
	tierce: ['tierce', 'tierces', 'tiers'],
	quinte: ['quinte', 'quintes'],
};

const correspond = (jeton, cible) => (VARIANTES[cible] ?? [cible]).includes(jeton);

// Découpe chaque mot en jetons (les apostrophes séparent : "d'une" donne "d" et "une").
export const jetons = (mots) => {
	const liste = [];
	for (const m of mots) {
		const parties = normaliser(m.mot).split("'").filter(Boolean);
		for (const p of parties) liste.push({jeton: p, debut: m.debut, fin: m.fin});
	}
	return liste;
};

// Cherche une expression. occurrence : 1, 2, ... ou 'derniere'. apres : temps minimal en secondes.
export const trouver = (liste, expression, {occurrence = 1, apres = -1} = {}) => {
	const cibles = expression.split(' ').map(normaliser);
	const trouvees = [];
	for (let i = 0; i + cibles.length <= liste.length; i++) {
		if (liste[i].debut < apres) continue;
		if (cibles.every((c, k) => correspond(liste[i + k].jeton, c))) {
			trouvees.push(liste.slice(i, i + cibles.length));
		}
	}
	const choix = occurrence === 'derniere' ? trouvees[trouvees.length - 1] : trouvees[occurrence - 1];
	if (!choix) {
		throw new Error(`Mot clé introuvable dans alignement.json : "${expression}" (occurrence ${occurrence}, après ${apres.toFixed(2)} s)`);
	}
	return {debut: choix[0].debut, fin: choix[choix.length - 1].fin, mots: choix};
};

// Calcule tous les repères de la vidéo à partir des mots.
export const calculerReperes = (alignement) => {
	const liste = jetons(alignement.mots);
	if (liste.length === 0) throw new Error('alignement.json ne contient aucun mot.');

	const gamme = trouver(liste, 'gamme');
	const gammeNotes = trouver(liste, 'do re mi fa sol la si', {apres: gamme.debut});
	const compteur = trouver(liste, 'do re mi', {apres: gammeNotes.fin});
	const arc = trouver(liste, 'il y a une tierce', {apres: compteur.fin});
	const etape1 = trouver(liste, 'premiere etape', {apres: arc.fin});
	const doDescend = trouver(liste, 'do', {apres: etape1.fin});
	const tonique = trouver(liste, 'tonique', {apres: doDescend.fin});
	const etape2 = trouver(liste, 'deuxieme etape', {apres: tonique.fin});
	const miPose = trouver(liste, 'mi', {apres: etape2.fin});
	const tierce = trouver(liste, 'tierce', {apres: miPose.fin});
	const etape3 = trouver(liste, 'troisieme etape', {apres: tierce.fin});
	const solPose = trouver(liste, 'sol', {apres: etape3.fin});
	const quinte = trouver(liste, 'quinte', {apres: solPose.fin});
	const accord = trouver(liste, 'do mi sol', {occurrence: 'derniere', apres: quinte.fin});
	const accolades = trouver(liste, 'une tierce posee', {apres: accord.fin});
	const titreFinal = trouver(liste, 'accord de do majeur', {apres: accolades.fin});

	const finVoix = liste[liste.length - 1].fin;

	return {
		titreFin: gamme.debut,
		notes: gammeNotes.mots.map((m) => m.debut),
		compteur: compteur.mots.map((m) => m.debut),
		arc: arc.debut,
		allumageDo: etape1.debut,
		descenteDo: doDescend.debut,
		etiquetteTonique: tonique.debut,
		griseRe: etape2.debut,
		poseMi: miPose.debut,
		etiquetteTierce: tierce.debut,
		griseFa: etape3.debut,
		poseSol: solPose.debut,
		etiquetteQuinte: quinte.debut,
		accord: accord.mots.map((m) => m.debut),
		accolades: accolades.debut,
		titreFinal: titreFinal.debut,
		finVoix,
		duree: finVoix + MARGE_FIN,
	};
};

// Liste lisible des repères, pour la vérification image par image.
export const reperesAVerifier = (r) => [
	{nom: 'gamme (fin du titre)', t: r.titreFin},
	...['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'].map((n, i) => ({nom: `pastille ${n}`, t: r.notes[i]})),
	...r.compteur.map((t, i) => ({nom: `compteur ${i + 1}`, t})),
	{nom: 'arc tierce', t: r.arc},
	{nom: 'première étape (Do allumé)', t: r.allumageDo},
	{nom: 'Do descend', t: r.descenteDo},
	{nom: 'étiquette tonique', t: r.etiquetteTonique},
	{nom: 'deuxième étape (Ré gris)', t: r.griseRe},
	{nom: 'Mi se pose', t: r.poseMi},
	{nom: 'étiquette tierce', t: r.etiquetteTierce},
	{nom: 'troisième étape (Fa gris)', t: r.griseFa},
	{nom: 'Sol se pose', t: r.poseSol},
	{nom: 'étiquette quinte', t: r.etiquetteQuinte},
	{nom: 'Do Mi Sol (pile)', t: r.accord[0]},
	{nom: 'accolades tierce', t: r.accolades},
	{nom: 'titre Accord de Do majeur', t: r.titreFinal},
	{nom: 'image finale', t: r.duree - 0.6},
];
