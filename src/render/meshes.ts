import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Standard Palette from Ticket-02 & PRD-0:
 * Sky/Fog: #0E1430 / #1B2350
 * Grass/Sand/Wood/CloudSea: #2F5D50 / #C9B48A / #6B4A2F / #12384A
 * Lit Lantern / Core / Unlit: #FFB347 / #FFE9B0 / #5B5F6E
 * Firefly Core / Halo: #FFF6C2 / #FFE58A
 * Ink Shadow Body / Rim / Stunned: #120A1A / #7A3CFF / #3A3450
 * May Tunic / Scarf & Charm: #E8E2D0 / #C8102E
 * Gold Accent / Drifter: #F2C14E / #8FA3B8
 */

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

let grassTex: THREE.Texture | null = null;
let woodTex: THREE.Texture | null = null;
let sparkTex: THREE.Texture | null = null;
let waterTex: THREE.Texture | null = null;

function ensureTextures() {
  if (typeof window === 'undefined') return;
  if (!grassTex) {
    grassTex = textureLoader.load('./assets/textures/grasslight.jpg');
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(8, 8);
  }
  if (!woodTex) {
    woodTex = textureLoader.load('./assets/textures/wood.jpg');
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(3, 1);
  }
  if (!sparkTex) {
    sparkTex = textureLoader.load('./assets/textures/spark1.png');
  }
  if (!waterTex) {
    waterTex = textureLoader.load('./assets/textures/waternormals.jpg');
    waterTex.wrapS = THREE.RepeatWrapping;
    waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(16, 16);
  }
}

export function createStarfieldAndWindParticles(): {
  stars: THREE.Points;
  windParticles: THREE.Points;
} {
  ensureTextures();

  // Starfield sky
  const starCount = 450;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = (i * 137.5 * Math.PI) / 180;
    const phi = Math.acos(1 - (i / starCount) * 0.75);
    const r = 135;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = Math.max(8, r * Math.cos(phi));
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffe9b0,
    size: 1.6,
    map: sparkTex ?? undefined,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);

  // Wind leaves / mist particles for Night 3 wind warning & active wind
  const windCount = 160;
  const windPos = new Float32Array(windCount * 3);
  for (let i = 0; i < windCount; i++) {
    windPos[i * 3] = ((i * 19) % 80) - 40;
    windPos[i * 3 + 1] = ((i * 7) % 12) + 0.5;
    windPos[i * 3 + 2] = ((i * 31) % 80) - 40;
  }
  const windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
  const windMat = new THREE.PointsMaterial({
    color: 0xf2c14e,
    size: 0.7,
    transparent: true,
    opacity: 0.0,
  });
  const windParticles = new THREE.Points(windGeo, windMat);

  return { stars, windParticles };
}

function addDecorativeTreesAndRocks(
  group: THREE.Group,
  night: 1 | 2 | 3,
  grassMat: THREE.Material,
  woodMat: THREE.Material
) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b5f6e, roughness: 0.88 });

  const treePositions: Array<[number, number, number]> =
    night === 1
      ? [
          [16, 0, 16],
          [-16, 0, 16],
          [18, 0, -12],
          [-18, 0, -12],
          [0, 0, -28],
          [28, 0, 0],
          [-28, 0, 0],
        ]
      : night === 2
        ? [
            [-12, 0, 12],
            [12, 0, 12],
            [58, 0, 12],
            [82, 0, 12],
            [70, 0, -18],
          ]
        : [
            [26, 0, 22],
            [-26, 0, 22],
            [0, 0, -28],
            [28, 0, -22],
            [-28, 0, -22],
          ];

  for (const [tx, ty, tz] of treePositions) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 10), woodMat);
    trunk.position.y = 1.1;
    tree.add(trunk);

    const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 12), grassMat);
    foliage1.position.y = 2.6;
    tree.add(foliage1);

    const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.8, 12), grassMat);
    foliage2.position.y = 3.7;
    tree.add(foliage2);

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
    rock.position.set(0.8, 0.3, 0.4);
    tree.add(rock);

    tree.position.set(tx, ty, tz);
    group.add(tree);
  }
}

export function createIslandMeshForNight(night: 1 | 2 | 3): {
  group: THREE.Group;
  animatedModels: THREE.Object3D[];
} {
  ensureTextures();
  const group = new THREE.Group();
  const animatedModels: THREE.Object3D[] = [];

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x2f5d50,
    map: grassTex ?? undefined,
    roughness: 0.85,
  });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a2f,
    map: woodTex ?? undefined,
    roughness: 0.8,
  });

  // Cloud sea plane below (#12384A)
  const seaGeo = new THREE.PlaneGeometry(450, 450);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x12384a,
    normalMap: waterTex ?? undefined,
    roughness: 0.6,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -10.2;
  group.add(sea);

  if (night === 1) {
    const mainDisk = new THREE.Mesh(new THREE.CylinderGeometry(40, 38.5, 2.5, 64), grassMat);
    mainDisk.position.y = -1.25;
    group.add(mainDisk);

    const rim = new THREE.Mesh(new THREE.RingGeometry(38.5, 40, 64), sandMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.02;
    group.add(rim);
  } else if (night === 2) {
    const diskA = new THREE.Mesh(new THREE.CylinderGeometry(28, 26.8, 2.5, 48), grassMat);
    diskA.position.set(0, -1.25, 0);
    group.add(diskA);

    const diskB = new THREE.Mesh(new THREE.CylinderGeometry(28, 26.8, 2.5, 48), grassMat);
    diskB.position.set(70, -1.25, 0);
    group.add(diskB);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), woodMat);
    bridge.position.set(35, -0.2, 0);
    group.add(bridge);

    const padMat = new THREE.MeshBasicMaterial({ color: 0xf2c14e });
    for (const pos of [
      [20, 0.08, 18],
      [50, 0.08, -18],
    ]) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 24), padMat);
      pad.position.set(pos[0], pos[1], pos[2]);
      group.add(pad);
    }
  } else {
    const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 43.5, 2.5, 64), grassMat);
    tier0.position.set(0, -1.25, 0);
    group.add(tier0);

    // Tier 1: half-annulus radius 12..24m, z > 0, Y=3
    const tier1Geo = new THREE.CylinderGeometry(24, 24, 3.0, 48, 1, false, 0, Math.PI);
    const tier1 = new THREE.Mesh(tier1Geo, sandMat);
    tier1.rotation.y = -Math.PI / 2;
    tier1.position.set(0, 1.5, 0);
    group.add(tier1);

    // 2 straight ramps at 30° and 150° from r=30 (Y=0) to r=24 (Y=3), width 3m
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rampLen = Math.sqrt(6 * 6 + 3 * 3);
      const rampGeo = new THREE.BoxGeometry(rampLen, 0.3, 3.0);
      const ramp = new THREE.Mesh(rampGeo, woodMat);
      const midR = 27.0;
      ramp.position.set(Math.cos(rad) * midR, 1.5, Math.sin(rad) * midR);
      ramp.rotation.y = -rad;
      ramp.rotation.z = Math.atan2(3.0, -6.0);
      group.add(ramp);
    }

    // Tier 2: disk radius 8m at Y=6
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6.0, 32), grassMat);
    tier2.position.set(0, 3.0, 0);
    group.add(tier2);

    // Bell Tower: cylinder radius 2m, height 8m at center of Tier 2
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 8.0, 24), woodMat);
    tower.position.set(0, 10.0, 0);
    group.add(tower);

    // Jump pad at (0, 3, 13)
    const padMat = new THREE.MeshBasicMaterial({ color: 0xf2c14e });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 24), padMat);
    pad.position.set(0, 3.08, 13);
    group.add(pad);
  }

  addDecorativeTreesAndRocks(group, night, grassMat, woodMat);

  // Load downloaded GLB decorative models (Spirit Bird soaring over cloud sea + Ông Đăng Guardian Statue at spawn)
  if (typeof window !== 'undefined') {
    gltfLoader.load(
      './assets/models/spirit_bird.glb',
      (gltf) => {
        const bird = gltf.scene;
        bird.scale.setScalar(0.035);
        bird.position.set(0, 14, 15);
        group.add(bird);
        animatedModels.push(bird);
      },
      undefined,
      () => {}
    );

    gltfLoader.load(
      './assets/models/guardian_figure.glb',
      (gltf) => {
        const statue = gltf.scene;
        statue.scale.setScalar(0.42);
        statue.position.set(-3.2, 0, -2.5);
        statue.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = new THREE.MeshStandardMaterial({
              color: 0xc9b48a,
              roughness: 0.75,
              metalness: 0.2,
            });
          }
        });
        group.add(statue);
      },
      undefined,
      () => {}
    );
  }

  return { group, animatedModels };
}

export function createMayCharacterMesh(): { group: THREE.Group; orbitGroup: THREE.Group } {
  const group = new THREE.Group();

  // Áo Mây (#E8E2D0)
  const cloakGeo = new THREE.ConeGeometry(0.55, 1.35, 16);
  const cloakMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.6 });
  const cloak = new THREE.Mesh(cloakGeo, cloakMat);
  cloak.position.y = 0.68;
  group.add(cloak);

  // Khăn đỏ (#C8102E)
  const scarfGeo = new THREE.TorusGeometry(0.32, 0.08, 10, 20);
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5 });
  const scarf = new THREE.Mesh(scarfGeo, scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.28;
  group.add(scarf);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.5;
  group.add(head);

  // Nón lá (Conical hat - PRD-0 Section 3: "Mây đội nón lá có treo một chiếc đèn lồng nhỏ")
  const hatGeo = new THREE.ConeGeometry(0.68, 0.4, 24);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.7 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.82;
  group.add(hat);

  // Chiếc đèn lồng nhỏ treo ở vành nón lá
  const smallLanternGeo = new THREE.OctahedronGeometry(0.15, 0);
  const smallLanternMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const smallLantern = new THREE.Mesh(smallLanternGeo, smallLanternMat);
  smallLantern.position.set(0, 1.62, 0.58);
  group.add(smallLantern);

  const playerLight = new THREE.PointLight(0xffb347, 2.4, 14);
  playerLight.position.set(0, 1.65, 0.6);
  group.add(playerLight);

  const orbitGroup = new THREE.Group();
  orbitGroup.position.y = 1.1;
  group.add(orbitGroup);

  return { group, orbitGroup };
}

export function createFireflyMesh(isDropped = false): THREE.Group {
  ensureTextures();
  const group = new THREE.Group();

  // Firefly Core (#FFF6C2)
  const geo = new THREE.SphereGeometry(0.18, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: isDropped ? 0xffb347 : 0xfff6c2 });
  const core = new THREE.Mesh(geo, mat);
  group.add(core);

  // Firefly Halo (#FFE58A) using downloaded spark1.png sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: sparkTex ?? undefined,
    color: 0xffe58a,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Sprite(spriteMat);
  halo.scale.set(0.95, 0.95, 0.95);
  group.add(halo);

  return group;
}

export function createPulseWaveMesh(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.2, 1.0, 48);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe9b0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

export function createGreatLanternMesh(safeRadius: number): {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  light: THREE.PointLight;
  safeRing: THREE.Mesh;
  fuelBarBg: THREE.Mesh;
  fuelBarFill: THREE.Mesh;
  tearBand: THREE.Mesh;
} {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5b5f6e, roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 0.7, 12), stoneMat);
  base.position.y = 0.35;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.1, 12), stoneMat);
  pillar.position.y = 1.75;
  group.add(pillar);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x5b5f6e,
    emissive: 0x1b2350,
    emissiveIntensity: 0.35,
  });
  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 1), coreMat);
  coreMesh.position.y = 3.1;
  group.add(coreMesh);

  // Tear mark on unlit lantern paper (Ticket-03 Section 6: unlit lantern squashed 20% + tear mark)
  const tearMat = new THREE.MeshBasicMaterial({ color: 0x120a1a, side: THREE.DoubleSide });
  const tearBand = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.85), tearMat);
  tearBand.position.y = 3.1;
  tearBand.rotation.z = 0.35;
  group.add(tearBand);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.65, 8), stoneMat);
  roof.position.y = 3.85;
  group.add(roof);

  // 3D Fuel Bar above lantern roof (Ticket-03 Section 1)
  const fuelBarBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.18, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x120a1a })
  );
  fuelBarBg.position.y = 4.55;
  group.add(fuelBarBg);

  const fuelBarFill = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.14, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffb347 })
  );
  fuelBarFill.position.y = 4.55;
  group.add(fuelBarFill);

  const light = new THREE.PointLight(0xffb347, 0.2, safeRadius * 2.2);
  light.position.y = 3.1;
  group.add(light);

  const ringGeo = new THREE.RingGeometry(safeRadius - 0.15, safeRadius, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.1,
  });
  const safeRing = new THREE.Mesh(ringGeo, ringMat);
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.05;
  group.add(safeRing);

  return { group, coreMesh, light, safeRing, fuelBarBg, fuelBarFill, tearBand };
}

export function createInkShadowMesh(): { group: THREE.Group; body: THREE.Mesh; rim: THREE.Mesh } {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x120a1a,
    emissive: 0x7a3cff,
    emissiveIntensity: 0.65,
    roughness: 0.9,
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), bodyMat);
  body.position.y = 0.85;
  group.add(body);

  // Subtle purple/cyan rim aura (#7A3CFF or #00B3FF in Colorblind Mode)
  const rimGeo = new THREE.SphereGeometry(0.88, 12, 12);
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x7a3cff,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.85;
  group.add(rim);

  return { group, body, rim };
}

export function createDrifterMesh(): THREE.Mesh {
  const geo = new THREE.TorusKnotGeometry(0.45, 0.12, 32, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8fa3b8,
    emissive: 0x8fa3b8,
    emissiveIntensity: 0.35,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.2;
  return mesh;
}

export function createCharmMesh(): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.45, 0.75, 0.08);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc8102e,
    emissive: 0xf2c14e,
    emissiveIntensity: 0.45,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.0;
  return mesh;
}
