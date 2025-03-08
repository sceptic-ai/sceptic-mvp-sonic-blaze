import React, { useEffect } from 'react';
import { gsap } from 'gsap';

interface Particle {
  element: HTMLDivElement;
  x: number;
  y: number;
  angle: number;
  velocity: number;
}

export function createParticles(event: MouseEvent | React.MouseEvent) {
  const colors = ['#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5'];
  const particles: Particle[] = [];
  const particleCount = 24; // Increased particle count
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 8 + 6; // Increased particle size
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 10px ${color}; // Added glow effect
    `;
    
    document.body.appendChild(particle);
    
    const angle = (i / particleCount) * Math.PI * 2;
    const velocity = Math.random() * 6 + 6; // Increased velocity
    
    particles.push({
      element: particle,
      x: event.clientX,
      y: event.clientY,
      angle,
      velocity
    });
  }

  gsap.to(particles, {
    duration: 1.2, // Increased duration
    ease: "power2.out",
    onUpdate: () => {
      particles.forEach(particle => {
        particle.x += Math.cos(particle.angle) * particle.velocity;
        particle.y += Math.sin(particle.angle) * particle.velocity + 0.8; // Increased gravity
        particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
        particle.element.style.opacity = gsap.utils.random(0.5, 1); // Added opacity variation
      });
    },
    onComplete: () => {
      particles.forEach(particle => particle.element.remove());
    }
  });
}

export function useClickParticles() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.target instanceof Element && !e.target.closest('button, a, input, select')) {
        createParticles(e);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}