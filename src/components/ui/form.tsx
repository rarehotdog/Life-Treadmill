import * as React from 'react';
import { cn } from './utils';
import { Label } from './label';

type FormFieldContextValue = {
  name: string;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  if (!fieldContext || !itemContext) {
    throw new Error('useFormField should be used within <FormField> and <FormItem>.');
  }

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    error: undefined,
  };
}

export function Form(props: React.ComponentProps<'form'>) {
  return <form {...props} />;
}

export function FormField({
  name,
  children,
}: React.PropsWithChildren<{ name: string }>) {
  return <FormFieldContext.Provider value={{ name }}>{children}</FormFieldContext.Provider>;
}

export function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel({ className, ...props }: React.ComponentProps<'label'>) {
  const { formItemId } = useFormField();

  return <Label data-slot="form-label" className={cn(className)} htmlFor={formItemId} {...props} />;
}

export function FormControl({ className, ...props }: React.ComponentProps<'div'>) {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <div
      data-slot="form-control"
      id={formItemId}
      aria-describedby={`${formDescriptionId} ${formMessageId}`}
      className={cn(className)}
      {...props}
    />
  );
}

export function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return <p data-slot="form-description" id={formDescriptionId} className={cn('text-sm text-gray-500', className)} {...props} />;
}

export function FormMessage({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { formMessageId } = useFormField();

  if (!children) return null;

  return <p data-slot="form-message" id={formMessageId} className={cn('text-sm text-red-600', className)} {...props}>{children}</p>;
}
