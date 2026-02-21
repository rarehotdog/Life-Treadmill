import * as React from 'react';
import { cn } from './utils';
import {
  toggleVariants,
  type ToggleSize,
  type ToggleVariant,
} from './_shared/toggle';

export function Toggle({
  className,
  variant = 'default',
  size = 'default',
  pressed,
  defaultPressed = false,
  onPressedChange,
  onClick,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onChange'> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}) {
  const [internalPressed, setInternalPressed] = React.useState(defaultPressed);
  const isControlled = pressed !== undefined;
  const resolvedPressed = isControlled ? pressed : internalPressed;

  return (
    <button
      type="button"
      data-slot="toggle"
      data-state={resolvedPressed ? 'on' : 'off'}
      className={cn(toggleVariants({ variant, size }), resolvedPressed ? 'bg-gray-100 text-gray-900' : '', className)}
      onClick={(event) => {
        onClick?.(event);
        const next = !resolvedPressed;
        if (!isControlled) setInternalPressed(next);
        onPressedChange?.(next);
      }}
      {...props}
    />
  );
}
