import * as React from 'react';
import { cn } from './utils';
import { badgeVariants, type BadgeVariant } from './_shared/badge';

export function Badge({ className, variant = 'default', ...props }: React.ComponentProps<'span'> & { variant?: BadgeVariant; asChild?: boolean }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
