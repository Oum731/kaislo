import * as THREE from 'three';

// Modèle simple de moto + pilote, construit à partir de formes de base.
export function createMoto(color = 0xff5500) {
  const root = new THREE.Group();       // position + cap
  const body = new THREE.Group();       // tangage + roulis
  root.add(body);
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
  const suit = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, -0.15) });

  const wheelG = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16);
  wheelG.rotateZ(Math.PI / 2);
  const front = new THREE.Mesh(wheelG, dark); front.position.set(0, 0.55, 1.0);
  const rear = new THREE.Mesh(wheelG, dark); rear.position.set(0, 0.55, -1.0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1.8), paint); frame.position.set(0, 1.0, 0);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.7), paint); tank.position.set(0, 1.35, 0.4);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), dark); fork.position.set(0, 1.0, 0.95); fork.rotation.x = -0.3;
  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), dark); bars.position.set(0, 1.6, 0.8);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.35), suit); torso.position.set(0, 1.95, 0.05); torso.rotation.x = 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffffff })); head.position.set(0, 2.55, 0.3);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.2), new THREE.MeshLambertMaterial({ color: 0x111122 })); visor.position.set(0, 2.55, 0.5);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.8), suit); legs.position.set(0, 1.4, -0.1);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.7), suit); arms.position.set(0, 2.0, 0.5); arms.rotation.x = 0.3;
  body.add(front, rear, frame, tank, fork, bars, torso, head, visor, legs, arms);
  body.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.userData = { body, front, rear };
  return root;
}
