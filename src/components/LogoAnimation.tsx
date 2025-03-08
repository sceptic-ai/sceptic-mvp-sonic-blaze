import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface LogoAnimationProps {
  className?: string;
}

export function LogoAnimation({ className = '' }: LogoAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    sceneRef.current = new THREE.Scene();
    
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    cameraRef.current = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    cameraRef.current.position.z = 8;

    rendererRef.current = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(rendererRef.current.domElement);

    const particleCount = 6000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const color = new THREE.Color('#a8e6cf');

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const t = (i / particleCount);
      let x = 0, y = 0;

      if (t < 0.3) {
        const angle = (t / 0.3) * Math.PI;
        x = Math.cos(angle) * 2;
        y = Math.sin(angle) * 2 + 1.6;
      }
      else if (t < 0.6) {
        const progress = (t - 0.3) / 0.3;
        x = -Math.cos(progress * Math.PI) * 1.4;
        y = progress * -3.2 + 1.6;
      }
      else {
        const angle = ((t - 0.6) / 0.4) * Math.PI + Math.PI;
        x = Math.cos(angle) * 2;
        y = Math.sin(angle) * 2 - 1.6;
      }

      const randomness = 0.4;
      x += (Math.random() - 0.5) * randomness;
      y += (Math.random() - 0.5) * randomness;
      const z = (Math.random() - 0.5) * randomness;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      color.toArray(colors, i3);
      sizes[i] = Math.random() * 0.2 + 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    particlesRef.current = new THREE.Points(geometry, material);
    particlesRef.current.rotation.z = -Math.PI / 2;
    sceneRef.current.add(particlesRef.current);

    const animate = () => {
      if (!particlesRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      particlesRef.current.rotation.y += 0.002;
      particlesRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.2;
      particlesRef.current.position.x = Math.cos(Date.now() * 0.0008) * 0.1;

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    animate();

    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position;
      const originalPositions = positions.array.slice();
      
      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;
        positions.array[i3] += (Math.random() - 0.5) * 15;
        positions.array[i3 + 1] += (Math.random() - 0.5) * 15;
        positions.array[i3 + 2] += (Math.random() - 0.5) * 15;
      }
      positions.needsUpdate = true;

      gsap.to(positions.array, {
        duration: 2.5,
        ease: "power3.out",
        ...Object.fromEntries(
          Array.from({ length: positions.count * 3 }, (_, i) => [i, originalPositions[i]])
        ),
        onUpdate: () => {
          positions.needsUpdate = true;
        }
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (particlesRef.current) {
        particlesRef.current.geometry.dispose();
        (particlesRef.current.material as THREE.Material).dispose();
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}