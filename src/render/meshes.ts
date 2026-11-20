import * as THREE from 'three';

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

export function createIslandMeshForNight(night: 1 | 2 | 3): THREE.Group {
  const group = new THREE.Group();

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.85 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });

  // Cloud sea plane below
  const seaGeo = new THREE.PlaneGeometry(400, 400);
  const seaMat = new THREE.MeshBasicMaterial({
    color: 0x12384a,
    transparent: true,
    opacity: 0.65,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -10.5;
  group.add(sea);

  if (night === 1) {
    // Night 1: Circular island radius 40m
    const mainDisk = new THREE.Mesh(new THREE.CylinderGeometry(40, 38.5, 2.5, 64), grassMat);
    mainDisk.position.y = -1.25;
    group.add(mainDisk);

    const rim = new THREE.Mesh(new THREE.RingGeometry(38.5, 40, 64), sandMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.02;
    group.add(rim);
  } else if (night === 2) {
    // Night 2: Two circular islands radius 28m at (0,0,0) and (70,0,0) + bridge x in [26,44], z in [-2,2]
    const diskA = new THREE.Mesh(new THREE.CylinderGeometry(28, 26.8, 2.5, 48), grassMat);
    diskA.position.set(0, -1.25, 0);
    group.add(diskA);

    const diskB = new THREE.Mesh(new THREE.CylinderGeometry(28, 26.8, 2.5, 48), grassMat);
    diskB.position.set(70, -1.25, 0);
    group.add(diskB);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), woodMat);
    bridge.position.set(35, -0.2, 0);
    group.add(bridge);

    // Jump pads at (20,0,18) and (50,0,-18)
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
    // Night 3: Radius 45m, 3 tiers + bell tower
    const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 43.5, 2.5, 64), grassMat);
    tier0.position.set(0, -1.25, 0);
    group.add(tier0);

    // Tier 1: half-annulus radius 12..24m, z > 0, Y=3
    const tier1Geo = new THREE.CylinderGeometry(24, 24, 3.0, 48, 1, false, 0, Math.PI);
    const tier1 = new THREE.Mesh(tier1Geo, sandMat);
    tier1.rotation.y = -Math.PI / 2;
    tier1.position.set(0, 1.5, 0);
    group.add(tier1);

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

  return group;
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
  const hatGeo = new THREE.ConeGeometry(0.65, 0.38, 24);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.7 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.82;
  group.add(hat);

  // Chiếc đèn lồng nhỏ treo ở vành nón lá
  const smallLanternGeo = new THREE.OctahedronGeometry(0.14, 0);
  const smallLanternMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const smallLantern = new THREE.Mesh(smallLanternGeo, smallLanternMat);
  smallLantern.position.set(0, 1.62, 0.58);
  group.add(smallLantern);

  const playerLight = new THREE.PointLight(0xffb347, 2.2, 12);
  playerLight.position.set(0, 1.65, 0.6);
  group.add(playerLight);

  const orbitGroup = new THREE.Group();
  orbitGroup.position.y = 1.1;
  group.add(orbitGroup);

  return { group, orbitGroup };
}

export function createFireflyMesh(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.2, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff6c2 });
  return new THREE.Mesh(geo, mat);
}

export function createGreatLanternMesh(safeRadius: number): {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  light: THREE.PointLight;
  safeRing: THREE.Mesh;
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

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.65, 8), stoneMat);
  roof.position.y = 3.85;
  group.add(roof);

  const light = new THREE.PointLight(0xffb347, 0.2, safeRadius * 2.0);
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

  return { group, coreMesh, light, safeRing };
}

export function createInkShadowMesh(): { group: THREE.Group; body: THREE.Mesh } {
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
  return { group, body };
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
