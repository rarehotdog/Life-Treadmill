import { cn } from '../utils';

const variantClass = {
  default: 'bg-transparent hover:bg-gray-100 hover:text-gray-900',
  outline: 'border border-gray-300 bg-white hover:bg-gray-100 hover:text-gray-900',
} as const;

const sizeClass = {
  default: 'h-9 min-w-9 px-2',
  sm: 'h-8 min-w-8 px-1.5 text-xs',
  lg: 'h-10 min-w-10 px-2.5',
} as const;

export type ToggleVariant = keyof typeof variantClass;
export type ToggleSize = keyof typeof sizeClass;

export const toggleVariants = ({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: ToggleVariant;
  size?: ToggleSize;
  className?: string;
} = {}) => {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variantClass[variant],
    sizeClass[size],
    className,
  );
};
