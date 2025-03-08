import { motion } from 'framer-motion';

const spinTransition = {
  repeat: Infinity,
  duration: 1,
  ease: "linear"
};

export function LoadingSpinner() {
  return (
    <div className="relative w-8 h-8">
      <motion.span
        className="absolute inset-0 border-2 border-transparent border-t-primary-200 rounded-full"
        animate={{ rotate: 360 }}
        transition={spinTransition}
      />
      <motion.span
        className="absolute inset-1 border-2 border-transparent border-t-primary-300 rounded-full"
        animate={{ rotate: -360 }}
        transition={spinTransition}
      />
    </div>
  );
}