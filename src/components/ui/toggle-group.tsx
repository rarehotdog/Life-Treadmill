import * as React from 'react';
import { type ToggleSize, type ToggleVariant, toggleVariants } from './_shared/toggle';
import { cn } from './utils';

type ToggleGroupContextValue = {
  variant?: ToggleVariant;
  size?: ToggleSize;
  value: string[];
  setValue: (value: string[]) => void;
  type: 'single' | 'multiple';
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error('ToggleGroupItem must be used within ToggleGroup.');
  }
  return context;
}

export function ToggleGroup({
  className,
  variant,
  size,
  value,
  defaultValue,
  onValueChange,
  type = 'single',
  children,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  type?: 'single' | 'multiple';
}) {
  const normalizedDefault = React.useMemo(() => {
    if (defaultValue === undefined) return [] as string[];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  }, [defaultValue]);

  const [internalValue, setInternalValue] = React.useState<string[]>(normalizedDefault);
  const isControlled = value !== undefined;
  const controlledValue = React.useMemo(() => {
    if (value === undefined) return undefined;
    return Array.isArray(value) ? value : [value];
  }, [value]);
  const resolvedValue = controlledValue ?? internalValue;

  const setValue = (next: string[]) => {
    if (!isControlled) setInternalValue(next);
    if (onValueChange) onValueChange(type === 'single' ? (next[0] ?? '') : next);
  };

  return (
    <ToggleGroupContext.Provider value={{ variant, size, value: resolvedValue, setValue, type }}>
      <div data-slot="toggle-group" className={cn('flex w-fit items-center rounded-md', className)} {...props}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({
  className,
  children,
  value,
  variant,
  size,
  onClick,
  ...props
}: React.ComponentProps<'button'> & {
  value: string;
  variant?: ToggleVariant;
  size?: ToggleSize;
}) {
  const context = useToggleGroupContext();
  const isSelected = context.value.includes(value);

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      data-state={isSelected ? 'on' : 'off'}
      className={cn(
        toggleVariants({ variant: context.variant ?? variant, size: context.size ?? size }),
        'rounded-none first:rounded-l-md last:rounded-r-md',
        isSelected ? 'bg-gray-100 text-gray-900' : '',
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (context.type === 'single') {
          context.setValue([value]);
          return;
        }

        if (isSelected) {
          context.setValue(context.value.filter((item) => item !== value));
        } else {
          context.setValue([...context.value, value]);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
