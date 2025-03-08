import { AnimatePresence, motion } from 'framer-motion';

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const slideUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
  transition: { duration: 0.3 }
};

export const scaleUp = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { duration: 0.2 }
};

export const buttonTap = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400, damping: 17 }
};

export const successConfetti = () => {
  const colors = ['#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5'];
  const count = 50;
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 10 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
    `;
    
    document.body.appendChild(particle);
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 300 + 200;
    const posX = window.innerWidth / 2;
    const posY = window.innerHeight / 2;
    
    const animation = particle.animate([
      {
        transform: `translate(${posX}px, ${posY}px)`,
        opacity: 1
      },
      {
        transform: `translate(${posX + Math.cos(angle) * velocity}px, ${posY + Math.sin(angle) * velocity - 500}px)`,
        opacity: 0
      }
    ], {
      duration: Math.random() * 1000 + 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    });
    
    animation.onfinish = () => particle.remove();
  }
};