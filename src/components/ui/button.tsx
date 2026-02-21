import * as React from 'react';
import { cn } from './utils';
import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from './_shared/button';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: ButtonProps) {
  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children as React.ReactElement, {
      className: cn(buttonVariants({ variant, size }), (props.children as React.ReactElement<{ className?: string }>).props.className, className),
    });
  }

  return <button data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
