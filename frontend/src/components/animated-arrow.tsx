import { ArrowRight } from 'lucide-react';

interface AnimatedArrowProps {
  className?: string;
}

export function AnimatedArrow({ className }: AnimatedArrowProps) {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center">
      <span className="absolute inset-0 -z-10 scale-0 rounded-full bg-current opacity-0 transition-all duration-300 group-hover:scale-[2.2] group-hover:opacity-10" />
      <ArrowRight className={`h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 ${className ?? ''}`} />
    </span>
  );
}
