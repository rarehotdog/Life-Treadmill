import * as React from 'react';
import { PanelLeft } from 'lucide-react';
import { cn } from './utils';
import { useIsMobile } from './use-mobile';
import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

type SidebarContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider.');
  }
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  const open = openProp ?? internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
      document.cookie = `sidebar_state=${next}; path=/; max-age=${60 * 60 * 24 * 7}`;
    },
    [openProp, onOpenChange],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, setOpen]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          className={cn('group/sidebar-wrapper flex min-h-svh w-full', className)}
          style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3rem', ...(style ?? {}) } as React.CSSProperties}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div data-slot="sidebar" className={cn('flex h-full w-64 flex-col bg-white text-gray-900', className)} {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side={side} className="w-72 p-0 [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  const collapsed = state === 'collapsed';

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsed ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      className={cn('group peer hidden text-gray-900 md:block', className)}
      {...props}
    >
      <div className={cn('relative bg-transparent transition-[width] duration-200', collapsed ? 'w-0' : 'w-64')} />
      <div
        className={cn(
          'fixed inset-y-0 z-20 hidden bg-white transition-[left,right,width] duration-200 md:flex',
          side === 'left' ? (collapsed ? '-left-64' : 'left-0') : collapsed ? '-right-64' : 'right-0',
          collapsed ? 'w-64' : 'w-64',
          variant === 'floating' ? 'p-2' : '',
        )}
      >
        <div className={cn('flex h-full w-full flex-col border border-gray-200 bg-white', variant === 'floating' ? 'rounded-lg shadow-sm' : '')}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      onClick={toggleSidebar}
      className={cn('absolute inset-y-0 right-0 hidden w-4 -translate-x-1/2 cursor-ew-resize sm:flex', className)}
      {...props}
    />
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return <main data-slot="sidebar-inset" className={cn('relative flex w-full flex-1 flex-col bg-gray-50', className)} {...props} />;
}

export function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input data-slot="sidebar-input" className={cn('h-8 w-full shadow-none', className)} {...props} />;
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="sidebar-separator" className={cn('mx-2 w-auto bg-gray-200', className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'> & { asChild?: boolean }) {
  return <div data-slot="sidebar-group-label" className={cn('flex h-8 items-center rounded-md px-2 text-xs font-medium text-gray-600', className)} {...props} />;
}

export function SidebarGroupAction({ className, ...props }: React.ComponentProps<'button'> & { asChild?: boolean }) {
  return <button type="button" data-slot="sidebar-group-action" className={cn('absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100', className)} {...props} />;
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('w-full text-sm', className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('group/menu-item relative', className)} {...props} />;
}

const sidebarMenuButtonClass =
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-colors hover:bg-gray-100 disabled:opacity-50';

export function SidebarMenuButton({
  isActive = false,
  tooltip,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}) {
  const { isMobile, state } = useSidebar();

  const button = (
    <button
      type="button"
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(sidebarMenuButtonClass, isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700', className)}
      {...props}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  const tooltipProps = typeof tooltip === 'string' ? { children: tooltip } : tooltip;

  return (
    <Tooltip>
      <TooltipTrigger>{button}</TooltipTrigger>
      <TooltipContent sideOffset={6} hidden={state !== 'collapsed' || isMobile} {...tooltipProps} />
    </Tooltip>
  );
}

export function SidebarMenuAction({ className, showOnHover = false, ...props }: React.ComponentProps<'button'> & { asChild?: boolean; showOnHover?: boolean }) {
  return (
    <button
      type="button"
      data-slot="sidebar-menu-action"
      className={cn(
        'absolute right-1 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        showOnHover ? 'opacity-0 group-hover/menu-item:opacity-100 focus-within:opacity-100' : '',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-menu-badge" className={cn('pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-gray-500', className)} {...props} />;
}

export function SidebarMenuSkeleton({ className, showIcon = false, ...props }: React.ComponentProps<'div'> & { showIcon?: boolean }) {
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);

  return (
    <div data-slot="sidebar-menu-skeleton" className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)} {...props}>
      {showIcon ? <Skeleton className="h-4 w-4 rounded-md" /> : null}
      <Skeleton className="h-4 flex-1" style={{ maxWidth: width }} />
    </div>
  );
}

export function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu-sub" className={cn('mx-3.5 flex min-w-0 flex-col gap-1 border-l border-gray-200 px-2.5 py-0.5', className)} {...props} />;
}

export function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-sub-item" className={cn('group/menu-sub-item relative', className)} {...props} />;
}

export function SidebarMenuSubButton({
  size = 'md',
  isActive = false,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
  size?: 'sm' | 'md';
  isActive?: boolean;
}) {
  return (
    <a
      data-slot="sidebar-menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isActive ? 'bg-gray-100 text-gray-900' : '',
        className,
      )}
      {...props}
    />
  );
}
