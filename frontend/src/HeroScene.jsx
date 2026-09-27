import { useEffect, useRef } from "react";
import * as THREE from "three";

export function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.classList.add("scene-fallback");
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.2, 8.5);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.AmbientLight(0x9bd9cf, 1.4));
    const keyLight = new THREE.PointLight(0x08d29d, 12, 14);
    keyLight.position.set(2.8, 3.2, 4);
    scene.add(keyLight);
    const blueLight = new THREE.PointLight(0x4ebdff, 7, 11);
    blueLight.position.set(-3, -1, 2);
    scene.add(blueLight);

    const grid = new THREE.GridHelper(8, 16, 0x174238, 0x102c2d);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -1.8;
    grid.material.transparent = true;
    grid.material.opacity = 0.38;
    root.add(grid);

    const vault = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.18, 1),
      new THREE.MeshStandardMaterial({ color: 0x0e5e52, emissive: 0x063b34, emissiveIntensity: 0.8, metalness: 0.55, roughness: 0.24, wireframe: true })
    );
    root.add(vault);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.73, 1),
      new THREE.MeshStandardMaterial({ color: 0x08d29d, emissive: 0x08d29d, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.2 })
    );
    root.add(core);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x08d29d, transparent: true, opacity: 0.68, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.018, 8, 96), ringMaterial);
    ring.rotation.x = Math.PI / 2.2;
    root.add(ring);
    const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(1.94, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x3e9eff, transparent: true, opacity: 0.5 }));
    ringTwo.rotation.y = Math.PI / 2.8;
    root.add(ringTwo);

    const nodePositions = [
      new THREE.Vector3(-2.55, 1.38, 0),
      new THREE.Vector3(2.55, 1.18, 0.2),
      new THREE.Vector3(2.35, -1.55, -0.1),
      new THREE.Vector3(-2.35, -1.48, 0.3),
    ];
    const nodeGroup = new THREE.Group();
    nodePositions.forEach((position, index) => {
      const node = new THREE.Mesh(
        new THREE.OctahedronGeometry(index === 0 ? 0.2 : 0.15, 0),
        new THREE.MeshStandardMaterial({ color: index === 2 ? 0xf4b91e : 0x4ebdff, emissive: index === 2 ? 0x8d6508 : 0x104d85, emissiveIntensity: 1.1 })
      );
      node.position.copy(position);
      nodeGroup.add(node);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([position, new THREE.Vector3(0, 0, 0)]),
        new THREE.LineBasicMaterial({ color: index === 2 ? 0xf4b91e : 0x287f91, transparent: true, opacity: 0.45 })
      );
      nodeGroup.add(line);
    });
    root.add(nodeGroup);

    const particleGeometry = new THREE.SphereGeometry(0.045, 8, 8);
    const particles = Array.from({ length: 14 }, (_, index) => {
      const particle = new THREE.Mesh(particleGeometry, new THREE.MeshBasicMaterial({ color: index % 3 === 0 ? 0xf4b91e : 0x08d29d }));
      particle.userData.phase = index / 14;
      scene.add(particle);
      return particle;
    });

    const resize = () => {
      const width = mount.clientWidth || 420;
      const height = mount.clientHeight || 420;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame;
    const animate = (time) => {
      const seconds = time * 0.001;
      root.rotation.y = seconds * 0.12;
      root.rotation.x = Math.sin(seconds * 0.45) * 0.045;
      core.scale.setScalar(1 + Math.sin(seconds * 2.2) * 0.045);
      ring.rotation.z = seconds * 0.3;
      ringTwo.rotation.x = seconds * -0.22;
      nodeGroup.rotation.y = -seconds * 0.08;
      particles.forEach((particle) => {
        const progress = (particle.userData.phase + seconds * 0.12) % 1;
        const angle = progress * Math.PI * 2;
        particle.position.set(Math.cos(angle) * 2.1, Math.sin(angle * 1.7) * 1.25, Math.sin(angle) * 0.65);
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      particles.forEach((particle) => particle.material.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="hero-scene" ref={mountRef} aria-label="Animated mandate vault, escrow, and validator visualization" role="img" />;
}
