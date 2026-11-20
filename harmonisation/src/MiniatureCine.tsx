import React, {useEffect, useRef, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';

// Miniature 1280×720 : rendu 3D cinématique des sept accords de Do majeur.
// Rien d'important en bas à droite : YouTube y affiche la durée.

const W = 1280;
const H = 720;
const NOTES = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NATURE = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
const TEINTE: Record<string, number> = {maj: 0xffb020, min: 0x2f7bff, dim: 0xff3d9a};

// Dégradé radial (flaques de lumière, halo)
const degrade = () => {
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 256;
	const g = c.getContext('2d')!;
	const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
	r.addColorStop(0, 'rgba(255,255,255,1)');
	r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
	r.addColorStop(0.6, 'rgba(255,255,255,0.12)');
	r.addColorStop(0.98, 'rgba(255,255,255,0)');
	r.addColorStop(1, 'rgba(255,255,255,0)');
	g.fillStyle = r;
	g.fillRect(0, 0, 256, 256);
	return new THREE.CanvasTexture(c);
};

// Étiquette de note dessinée sur une texture
const etiquette = (txt: string) => {
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 256;
	const g = c.getContext('2d')!;
	g.clearRect(0, 0, 256, 256);
	g.fillStyle = 'rgba(255,255,255,0.95)';
	g.font = '800 92px Inter, sans-serif';
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	g.shadowColor = 'rgba(0,0,0,0.35)';
	g.shadowBlur = 8;
	g.fillText(txt, 128, 136);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
};

const Scene3D: React.FC = () => {
	const ref = useRef<HTMLCanvasElement>(null);
	const [handle] = useState(() => delayRender('rendu 3D'));
	useEffect(() => {
		const canvas = ref.current!;
		const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
		renderer.setSize(W, H, false);
		renderer.setPixelRatio(1);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.05;
		renderer.outputColorSpace = THREE.SRGBColorSpace;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x04060d);
		scene.fog = new THREE.FogExp2(0x070a16, 0.06);

		const camera = new THREE.PerspectiveCamera(37, W / H, 0.1, 100);
		camera.position.set(-0.6, 1.15, 8.2);
		camera.lookAt(new THREE.Vector3(2.55, 1.4, -1.6));

		// Sol miroir, assombri par un voile
		const miroir = new Reflector(new THREE.PlaneGeometry(60, 60), {textureWidth: W, textureHeight: H, color: 0x6b7280});
		miroir.rotation.x = -Math.PI / 2;
		scene.add(miroir);
		const voile = new THREE.Mesh(
			new THREE.PlaneGeometry(60, 60),
			new THREE.MeshLambertMaterial({color: 0x05070e, transparent: true, opacity: 0.86}),
		);
		voile.rotation.x = -Math.PI / 2;
		voile.position.y = 0.002;
		scene.add(voile);

		// Lumières
		scene.add(new THREE.AmbientLight(0x1a2240, 0.6));
		const cle = new THREE.SpotLight(0xffd6a0, 14, 30, Math.PI / 7, 0.7, 1.6);
		cle.position.set(1, 9, 5);
		cle.target.position.set(4, 0, -2);
		scene.add(cle, cle.target);
		const contre = new THREE.PointLight(0x5aa0ff, 10, 20, 1.8);
		contre.position.set(9, 4, -7);
		scene.add(contre);
		const arete = new THREE.DirectionalLight(0xbcd4ff, 0.9);
		arete.position.set(12, 6, -14);
		scene.add(arete);

		// Halo bleuté derrière la scène
		const tex = degrade();
		const fond = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, color: 0x3b5bdb, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}));
		fond.position.set(8, 2.4, -9);
		fond.scale.set(18, 10, 1);
		scene.add(fond);

		// Les sept tours
		const cote = 0.86;
		const ecart = 0.06;
		const geo = new THREE.BoxGeometry(cote, cote, cote);
		const plan = new THREE.PlaneGeometry(cote * 0.9, cote * 0.9);
		for (let k = 0; k < 7; k++) {
			const x = 2.4 + k * 1.3;
			const z = -k * 0.62;
			const teinte = new THREE.Color(TEINTE[NATURE[k]]);
			// flaque de lumière au sol
			const flaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({map: tex, color: teinte, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true}));
			flaque.rotation.x = -Math.PI / 2;
			flaque.position.set(x, 0.05, z + 0.25);
			scene.add(flaque);
			for (let j = 0; j < 3; j++) {
				const mat = new THREE.MeshPhysicalMaterial({
					color: teinte,
					emissive: teinte,
					emissiveIntensity: 0.4 + 0.07 * j,
					roughness: 0.12,
					metalness: 0.05,
					clearcoat: 1,
					clearcoatRoughness: 0.08,
					transparent: true,
					opacity: 0.93,
				});
				const bloc = new THREE.Mesh(geo, mat);
				const y = cote / 2 + j * (cote + ecart) + 0.02;
				bloc.position.set(x, y, z);
				bloc.rotation.y = -0.5;
				scene.add(bloc);
				const lab = new THREE.Mesh(plan, new THREE.MeshBasicMaterial({map: etiquette(NOTES[(k + 2 * j) % 7]), transparent: true, depthWrite: false, fog: true}));
				lab.position.copy(bloc.position);
				lab.rotation.y = -0.5;
				lab.translateZ(cote / 2 + 0.004);
				scene.add(lab);
			}
		}

		// Poussières en suspension
		const n = 700;
		const pos = new Float32Array(n * 3);
		let graine = 3;
		const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
		for (let i = 0; i < n; i++) {
			pos[i * 3] = -2 + alea() * 14;
			pos[i * 3 + 1] = alea() * 5;
			pos[i * 3 + 2] = -9 + alea() * 12;
		}
		const pg = new THREE.BufferGeometry();
		pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		scene.add(new THREE.Points(pg, new THREE.PointsMaterial({color: 0xffe2b8, size: 0.022, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false})));

		// Post traitement : profondeur de champ, halo, sortie
		const composer = new EffectComposer(renderer);
		composer.setSize(W, H);
		composer.addPass(new RenderPass(scene, camera));
		const focus = camera.position.distanceTo(new THREE.Vector3(2.4 + 2 * 1.3, 1.3, -2 * 0.62));
		composer.addPass(new BokehPass(scene, camera, {focus, aperture: 0.0005, maxblur: 0.006}));
		composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.75, 0.6, 0.4));
		composer.addPass(new OutputPass());

		const go = async () => {
			await document.fonts.ready;
			composer.render();
			continueRender(handle);
		};
		go();
		return () => renderer.dispose();
	}, [handle]);
	return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0, width: W, height: H}} />;
};

export const MiniatureCine: React.FC = () => (
	<AbsoluteFill style={{background: '#04060d', overflow: 'hidden'}}>
		<style>{`
@font-face { font-family: 'Anton'; src: url('${staticFile('polices/Anton.woff2')}') format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 800; src: url('${staticFile('polices/Inter-ExtraBold.otf')}') format('opentype'); }
`}</style>
		<Scene3D />
		{/* assombrir la gauche pour le texte, vignettage */}
		<AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(3,5,12,0.92) 0%, rgba(3,5,12,0.7) 30%, rgba(3,5,12,0) 52%)'}} />
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 60% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)'}} />

		<div style={{position: 'absolute', left: 58, top: 120}}>
			<div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 26, letterSpacing: 9, color: '#c9d2f0', opacity: 0.85}}>7 NOTES · 7 ACCORDS</div>
			<div style={{marginTop: 10, fontFamily: 'Anton', fontSize: 120, lineHeight: 0.98, color: '#f6f1e7', textShadow: '0 8px 30px rgba(0,0,0,0.6)'}}>
				MAJEUR
				<br />
				<span style={{color: '#5b9bff'}}>OU MINEUR</span>
				<span style={{color: '#ffb020'}}> ?</span>
			</div>
			<div style={{marginTop: 24, width: 440, height: 3, background: 'linear-gradient(90deg, #ffb020, #2f7bff 60%, #ff3d9a)'}} />
			<div style={{marginTop: 18, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#f6f1e7'}}>Harmoniser la gamme</div>
		</div>

		<Img src={staticFile('logo-apprendre.png')} style={{position: 'absolute', left: 52, bottom: 26, width: 112, filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))'}} />

		{/* grain de pellicule */}
		<svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.22}}>
			<filter id="grainCine">
				<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={11} />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<rect width={W} height={H} filter="url(#grainCine)" />
		</svg>
	</AbsoluteFill>
);
