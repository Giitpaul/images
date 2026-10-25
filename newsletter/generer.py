# Génère le modèle Brevo et le numéro de novembre 2026.
import sys, pathlib

OUT = pathlib.Path(sys.argv[1])

# ===== Charte (à remplacer par celle de l'accès premium) =====
C = dict(
    page="#0c1018", card="#181f2b", line="#263043", text="#cbd5e1",
    title="#ffffff", muted="#94a3b8", accent="#2563eb", accent_text="#ffffff",
    font="Arial, Helvetica, sans-serif",
)

def p(t):
    return f'<p style="margin:0 0 14px 0;font-family:{C["font"]};font-size:16px;line-height:1.6;color:{C["text"]};">{t}</p>'

def small(t):
    return f'<p style="margin:0 0 14px 0;font-family:{C["font"]};font-size:13px;line-height:1.5;color:{C["muted"]};">{t}</p>'

def h3(t):
    return f'<p style="margin:18px 0 6px 0;font-family:{C["font"]};font-size:17px;line-height:1.4;font-weight:bold;color:{C["title"]};">{t}</p>'

def a(label, url):
    return f'<a href="{url}" target="_blank" style="color:{C["accent"]};text-decoration:underline;">{label}</a>'

def ul(items):
    lis = "".join(f'<li style="margin:0 0 8px 0;">{i}</li>' for i in items)
    return f'<ul style="margin:0 0 14px 0;padding:0 0 0 20px;font-family:{C["font"]};font-size:16px;line-height:1.6;color:{C["text"]};">{lis}</ul>'

def button(label, url):
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr>
<td align="center" bgcolor="{C["accent"]}" style="border-radius:6px;">
<a href="{url}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:{C["font"]};font-size:15px;font-weight:bold;color:{C["accent_text"]};text-decoration:none;border-radius:6px;">{label}</a>
</td></tr></table>'''

def video(vid, url=None):
    url = url or f"https://www.youtube.com/watch?v={vid}"
    return f'''<a href="{url}" target="_blank" style="text-decoration:none;"><img src="https://img.youtube.com/vi/{vid}/hqdefault.jpg" width="520" alt="Voir la vidéo sur YouTube" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:6px;margin:0 0 12px 0;"></a>'''

def image(src, alt):
    return f'<img src="{src}" width="520" alt="{alt}" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:6px;margin:0 0 12px 0;">'

def section(num, title, inner):
    return f'''
<!-- ===== RUBRIQUE {num} ===== -->
<tr><td style="padding:0 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid {C["line"]};">
<tr><td style="padding:26px 0 8px 0;">
<p style="margin:0 0 4px 0;font-family:{C["font"]};font-size:13px;letter-spacing:2px;font-weight:bold;color:{C["accent"]};">RUBRIQUE {num:02d}</p>
<p style="margin:0 0 16px 0;font-family:{C["font"]};font-size:22px;line-height:1.3;font-weight:bold;color:{C["title"]};">{title}</p>
{inner}
</td></tr></table>
</td></tr>'''

def page(subject, preheader, issue_label, intro, sections, signature):
    body = "".join(section(n, t, i) for n, t, i in sections)
    return f'''<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>{subject}</title>
<style>
  body {{ margin:0; padding:0; background:{C["page"]}; }}
  a {{ color:{C["accent"]}; }}
  @media only screen and (max-width:620px) {{
    .wrap {{ width:100% !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background-color:{C["page"]};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{C["page"]}" style="background-color:{C["page"]};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="{C["card"]}" style="width:600px;max-width:600px;background-color:{C["card"]};border-radius:10px;">

<!-- ===== EN-TÊTE ===== -->
<tr><td style="padding:32px 24px 8px 24px;">
<p style="margin:0 0 6px 0;font-family:{C["font"]};font-size:13px;letter-spacing:2px;font-weight:bold;color:{C["accent"]};">NEWSLETTER · {issue_label}</p>
<p style="margin:0 0 18px 0;font-family:{C["font"]};font-size:26px;line-height:1.25;font-weight:bold;color:{C["title"]};">apprendrelharmonica.com</p>
{intro}
</td></tr>
{body}

<!-- ===== SIGNATURE ===== -->
<tr><td style="padding:8px 24px 32px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid {C["line"]};"><tr><td style="padding-top:24px;">
{signature}
</td></tr></table>
</td></tr>
</table>

<!-- ===== PIED DE PAGE ===== -->
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td style="padding:18px 24px;text-align:center;">
<p style="margin:0 0 6px 0;font-family:{C["font"]};font-size:12px;line-height:1.5;color:{C["muted"]};">Vous recevez cet email car vous êtes inscrit à la newsletter de <a href="https://www.apprendrelharmonica.com" target="_blank" style="color:{C["muted"]};">apprendrelharmonica.com</a>.</p>
<p style="margin:0;font-family:{C["font"]};font-size:12px;line-height:1.5;color:{C["muted"]};"><a href="{{{{ mirror }}}}" target="_blank" style="color:{C["muted"]};">Voir dans le navigateur</a> · <a href="{{{{ unsubscribe }}}}" target="_blank" style="color:{C["muted"]};">Se désinscrire</a></p>
</td></tr></table>

</td></tr></table>
</body>
</html>
'''

RAPPELS = (
    h3("Rejoindre l'accès Premium")
    + p("Tablatures, backing tracks, licks, exercices. Tout le contenu, mis à jour chaque semaine.")
    + button("Découvrir l'accès Premium", "https://www.apprendrelharmonica.com/acces-premium-harmonica")
    + h3("Prendre des cours avec moi")
    + p("À mon domicile, près de Nancy, ou par webcam partout dans le monde.")
    + button("Voir les cours", "https://www.apprendrelharmonica.com/cours")
    + h3("Vous débutez ?")
    + p("Sept vidéos gratuites pour bien démarrer et éviter les mauvaises habitudes.")
    + button("Recevoir les 7 vidéos gratuites", "https://paul-lassey.systeme.io/7videosgratuites")
    + h3("Soutenir mon travail")
    + p("Si vous en avez l'envie et les moyens, un petit coup de pouce m'aide à continuer.")
    + button("Me soutenir sur PayPal", "https://paypal.me/PaulLassey")
)

# ======================= MODÈLE VIERGE =======================
def modele():
    S = [
        (1, "La sortie d'album", p("[[Artiste, titre de l'album, label, date de sortie]]") + p("[[Deux ou trois phrases sur l'album et ce qu'il faut écouter]]") + video("VIDEO_ID") + button("Écouter l'album", "[[LIEN]]")),
        (2, "La vidéo à ne pas manquer", p("[[Pourquoi cette vidéo, ce qu'il faut regarder]]") + video("VIDEO_ID") + button("Voir la vidéo", "[[LIEN]]")),
        (3, "Le backing track à bosser", p("[[Tonalité, tempo, grille, harmonica conseillé et position]]") + p("[[Une piste de travail concrète]]") + video("VIDEO_ID") + button("Lancer le backing track", "[[LIEN]]")),
        (4, "L'astuce du mois", p("[[L'astuce en quelques phrases, avec un exercice à faire]]") + button("Voir la vidéo", "[[LIEN]]")),
        (5, "Trois infos concert, festival ou stage", h3("[[Type : Nom, lieu, dates]]") + p("[[Une ou deux phrases]]") + p(a("Plus d'infos", "[[LIEN]]")) + h3("[[Type : Nom, lieu, dates]]") + p("[[Une ou deux phrases]]") + p(a("Plus d'infos", "[[LIEN]]")) + h3("[[Type : Nom, lieu, dates]]") + p("[[Une ou deux phrases]]") + p(a("Plus d'infos", "[[LIEN]]"))),
        (6, "Le phrasé du mois", p("[[Titre du phrasé, harmonica, position, tempo]]") + p("[[Ce qu'il faut travailler]]") + image("[[LIEN_IMAGE_TABLATURE]]", "Tablature du phrasé du mois") + button("Écouter le MP3", "[[LIEN_MP3]]") + small("[[Lien du backing track seul si besoin]]")),
        (7, "Ce que vous avez raté ce mois-ci si vous n'êtes pas membre Premium", ul(["[[Contenu 1]]", "[[Contenu 2]]", "[[Contenu 3]]"]) + button("Rejoindre l'accès Premium", "https://www.apprendrelharmonica.com/acces-premium-harmonica")),
        (8, "Le live du premier dimanche", p("[[Dimanche X, 10h, sur ma chaîne YouTube. Thème éventuel.]]") + button("Rejoindre le live", "https://www.youtube.com/@apprendrelharmonica/streams")),
        (9, "Avant de se quitter", RAPPELS),
    ]
    intro = p("[[Introduction courte, à la première personne]]")
    sig = p("[[Mot de fin]]") + p("Paul")
    return page("[[Objet de l'email]]", "[[Texte d'aperçu]]", "[[MOIS ANNÉE]]", intro, S, sig)

# ======================= NOVEMBRE 2026 =======================
def novembre(avec_phrase=True):
    r1 = (
        h3("Max Hightower, <i>The Blues Chooses You</i>")
        + p("Max Hightower chante et joue de l'harmonica. Il vient de Caroline du Sud. Il a appris le blues auprès de Cootie Stark et de Mac Arnold.")
        + p("Son nouvel album est sorti le 9 octobre chez MoMojo Records. Il l'a enregistré en direct sur bande, au studio The Bomb Shelter de Nashville. Aucun ajout après coup. Joe Moss tient la guitare. Soul Bag lui donne quatre étoiles.")
        + p("Le son est brut et l'harmonica passe devant. Écoutez sa reprise de <i>Things I Used To Do</i> de Guitar Slim, jouée façon gospel. Du blues comme je l'aime ;-)")
        + video("dIDLQWV3uWU")
        + button("Écouter The Blues Chooses You", "https://www.youtube.com/watch?v=dIDLQWV3uWU")
        + small("Pour aller plus loin : " + a("son interview pour Blues Matters", "https://www.youtube.com/watch?v=3KgHQRmKSaY") + " (en anglais, 50 minutes). Il y parle de sa découverte de l'harmonica.")
    )
    r2 = (
        h3("Will Wilde en concert à Augustibluus 2026")
        + p("Will Wilde est un harmoniciste anglais. Voici 45 minutes de concert filmées cet été au festival Augustibluus, en Estonie.")
        + p("Écoutez son attaque et son son amplifié. Regardez surtout où il place ses silences entre deux phrases. Ça rejoint l'astuce du mois, plus bas.")
        + video("3frsrUSerXw")
        + button("Voir le concert", "https://www.youtube.com/watch?v=3frsrUSerXw")
        + small("Mon passage préféré : <i>Voodoo Man</i>, à 39 min 10.")
    )
    r3 = (
        h3("Shuffle en Sol, 122 bpm")
        + p("Un shuffle de 12 mesures en Sol. La grille tient en trois accords : G7, C7 et D7. Prenez votre harmonica en Do et jouez en 2e position.")
        + p("Ma piste de travail :")
        + ul([
            "Un tour entier avec trois notes seulement : 2 aspiré, 3 aspiré, 4 soufflé.",
            "Sur le C7, essayez le 3 aspiré baissé d'un demi ton. C'est la septième de l'accord.",
            "Sur le D7 de la mesure 9, visez le 4 aspiré. C'est la fondamentale de l'accord.",
        ])
        + p("Lancez la vidéo en boucle et jouez au moins dix minutes sans vous arrêter.")
        + video("nPGluKoCmUI")
        + button("Lancer le backing track", "https://www.youtube.com/watch?v=nPGluKoCmUI")
        + small("Backing track de la chaîne JamTracksChannel.")
    )
    r4 = (
        h3("Les silences")
        + p("Dans un solo, le silence compte autant que les notes. Il laisse respirer la phrase. Il donne envie d'entendre la suite.")
        + p("L'exercice : jouez une phrase de deux mesures. Laissez ensuite deux mesures vides. Recommencez sur tout un tour de grille. Pendant le silence, écoutez la basse. Elle vous dira où relancer.")
        + p("Testez ça sur le shuffle de la rubrique 3.")
        + p("J'en parle dans une courte vidéo. C'est la première d'une série de quatre, tirée de mon atelier du 10 octobre sur la construction d'un solo :")
        + ul([
            a("01 Les silences", "https://www.youtube.com/shorts/nbS897N5Iz4"),
            a("02 Répéter un riff court", "https://www.youtube.com/shorts/KNuh2m4aLq4"),
            a("03 Varier le rythme d'une phrase", "https://www.youtube.com/shorts/iXfcvcUTCNQ"),
            a("04 Les articulations", "https://www.youtube.com/shorts/I7Msv834QNY"),
        ])
    )
    r5 = (
        h3("Festival : Bay Car Blues Festival, Grande Synthe (Nord), 6 et 7 novembre")
        + p("Au programme : Kid Ramos et Brian Templeton, Kévin Doublé Quartet, Swampin Blues. Brian Templeton chante et joue de l'harmonica. Un rendez vous blues bien installé dans le Nord.")
        + p(a("Le site du festival", "https://www.baycarbluesfestival.fr"))
        + h3("Festival : Blues sur Seine, du 6 au 21 novembre")
        + p("Un festival itinérant dans les villes de la vallée de la Seine. Deux semaines de concerts blues, souvent dans des petites salles.")
        + p(a("Le programme", "https://www.infoconcert.com/festival/blues-sur-seine-2135/concerts"))
        + h3("Stage : Alain Messier, Normandie, 18 novembre")
        + p("Une journée de 6 heures sur les bends et les altérations. Une autre journée porte sur le nettoyage et le réglage de l'harmonica. Repas du midi compris.")
        + p(a("Les infos du stage", "https://www.alain-messier.net/2025/11/stages-harmonica-normandie-2025-et-2026.debutants-ouavances.html"))
    )
    r6 = (
        h3("[[Titre du phrasé]]")
        + p("[[Harmonica en X, Xe position, X bpm.]]")
        + p("[[Ce qu'il faut travailler dans ce phrasé.]]")
        + p("Essayez d'abord de jouer la tablature sans écouter le MP3. Ensuite, écoutez et comparez.")
        + image("[[LIEN_IMAGE_TABLATURE]]", "Tablature du phrasé du mois")
        + button("Écouter le MP3", "[[LIEN_MP3]]")
        + small("Besoin de ralentir ? Chargez le MP3 dans " + a("HarmonicaTrainer", "https://www.harmonicatrainer.com") + " ou dans Audacity.")
    )
    r7 = (
        p("En octobre, les membres Premium ont reçu :")
        + ul([
            "<i>Piano Man</i> de Billy Joel, harmonica en Do",
            "<i>La complainte de la butte</i>, harmonica en Do",
            "<i>Il faut que je m'en aille</i> de Graeme Allwright, grille et tablature karaoké, avec une version ralentie à 130 bpm",
            "<i>Sarbacane</i> de Francis Cabrel : quand jouer dans le morceau",
            "Un exercice de blues en Sol et un lick country blues en Sol, harmonica en Do",
            "<i>Thriller</i> de Michael Jackson à l'harmonica",
        ])
        + p("Et le portail Premium a été entièrement refait fin septembre. Plus clair, avec une recherche bien plus rapide.")
        + video("QzrBYrDIlcg")
        + button("Rejoindre l'accès Premium", "https://www.apprendrelharmonica.com/acces-premium-harmonica")
    )
    r8 = (
        h3("Dimanche 1er novembre, 10h")
        + p("Je vous retrouve en direct sur ma chaîne YouTube. On joue ensemble et je réponds à vos questions.")
        + p("Activez le rappel pour être prévenu au démarrage.")
        + button("Rejoindre le live", "https://www.youtube.com/@apprendrelharmonica/streams")
    )
    S = [
        (1, "La sortie d'album", r1),
        (2, "La vidéo à ne pas manquer", r2),
        (3, "Le backing track à bosser", r3),
        (4, "L'astuce du mois", r4),
        (5, "Trois infos concert, festival ou stage", r5),
    ]
    if avec_phrase:
        S.append((6, "Le phrasé du mois", r6))
    S += [
        (len(S) + 1, "Ce que vous avez raté en octobre si vous n'êtes pas membre Premium", r7),
        (len(S) + 2, "Le live du premier dimanche", r8),
        (len(S) + 3, "Avant de se quitter", RAPPELS),
    ]
    intro = (
        p("Bonjour à toutes et à tous,")
        + p("La newsletter revient. Elle arrive une fois par mois, le mercredi avant mon live du premier dimanche.")
        + p("Au menu : un album, un concert à regarder, un backing track, une astuce, des dates" + (", un phrasé à travailler" if avec_phrase else "") + " et le rendez vous de dimanche.")
        + p("Bonne lecture ;-)")
    )
    sig = p("Merci de m'avoir lu jusqu'ici. On se retrouve dimanche à 10h ;-)") + p("Paul")
    return page(
        "Novembre : Max Hightower, un shuffle en Sol et le live de dimanche",
        "Un album, un concert, un backing track, une astuce et le live du 1er novembre.",
        "NOVEMBRE 2026", intro, S, sig,
    )

(OUT / "modele-newsletter-brevo.html").write_text(modele(), encoding="utf-8")
(OUT / "2026-11" / "newsletter-2026-11-brouillon.html").write_text(novembre(True), encoding="utf-8")
(OUT / "2026-11" / "newsletter-2026-11-sans-phrase.html").write_text(novembre(False), encoding="utf-8")
print("ok")
