import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Règle absolue de Paul : jamais de GPU. Rendu Chrome 100 % logiciel (scripts/render_all.py le
// vérifie et ajoute --gl=swiftshader à chaque appel). Ne pas retirer.
Config.setChromiumOpenGlRenderer("swiftshader");
