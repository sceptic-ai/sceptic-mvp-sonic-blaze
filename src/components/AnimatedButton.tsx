import { motion } from 'framer-motion';
import { buttonTap } from '../lib/animations';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

export function AnimatedButton({ variant = 'primary', children, className, ...props }: AnimatedButtonProps) {
  const baseClass = variant === 'primary' 
    ? 'btn-primary' 
    : variant === 'secondary' 
    ? 'btn-secondary' 
    : 'btn-outline';

  return (
    <motion.button
      className={`${baseClass} ${className || ''}`}
      {...buttonTap}
      {...props}
    >
      {children}
    </motion.button>
  );
}