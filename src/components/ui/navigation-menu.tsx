import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './utils';
import { navigationMenuTriggerStyle } from './_shared/navigation-menu';

export function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<'nav'> & { viewport?: boolean }) {
  return (
    <nav data-slot="navigation-menu" data-viewport={viewport} className={cn('relative flex max-w-max flex-1 items-center justify-center', className)} {...props}>
      {children}
      {viewport ? <NavigationMenuViewport /> : null}
    </nav>
  );
}

export function NavigationMenuList({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="navigation-menu-list" className={cn('flex list-none items-center justify-center gap-1', className)} {...props} />;
}

export function NavigationMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="navigation-menu-item" className={cn('relative', className)} {...props} />;
}

export function NavigationMenuTrigger({ className, children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button type="button" data-slot="navigation-menu-trigger" className={cn(navigationMenuTriggerStyle(), 'group', className)} {...props}>
      {children}
      <ChevronDown className="ml-1 h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
    </button>
  );
}

export function NavigationMenuContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="navigation-menu-content" className={cn('w-full p-2 md:absolute md:w-auto', className)} {...props} />;
}

export function NavigationMenuViewport({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="absolute left-0 top-full z-50 flex justify-center">
      <div data-slot="navigation-menu-viewport" className={cn('mt-1.5 min-h-10 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow md:w-[var(--radix-navigation-menu-viewport-width)]', className)} {...props} />
    </div>
  );
}

export function NavigationMenuLink({ className, ...props }: React.ComponentProps<'a'>) {
  return <a data-slot="navigation-menu-link" className={cn('flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors hover:bg-gray-100', className)} {...props} />;
}

export function NavigationMenuIndicator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="navigation-menu-indicator" className={cn('top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden', className)} {...props}>
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-gray-200 shadow-md" />
    </div>
  );
}
