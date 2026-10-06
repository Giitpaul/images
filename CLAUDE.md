# Monteur vidéo automatique (apprendrelharmonica.com)

Outil qui transforme une vidéo brute en vidéo montée : coupe des silences et des prises ratées, sous-titres, musique, zooms, effets, motion design.

## Workflow

1. `/grill-with-docs` avec le rapport de recherche (`docs/research/`)
2. `/to-spec` puis `/to-tickets` dans la même conversation
3. `/clear`, puis `/implement <ticket>` et `/clear` entre chaque ticket

## Agent skills

### Issue tracker

Issues et specs en fichiers markdown locaux sous `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq labels par défaut (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context : un `GLOSSARY.md` et `docs/adr/` à la racine. See `docs/agents/domain.md`.
