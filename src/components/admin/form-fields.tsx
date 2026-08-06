'use client';

/**
 * form-fields.tsx — the admin's form controls, wired to react-hook-form.
 *
 * Every admin dialog was building the same three-part stack by hand: a bold
 * `<label>`, a control, and a hand-rolled `className` string repeated verbatim
 * a dozen times per file. None of them rendered a validation message, because
 * there was nowhere to put one — errors went to a toast in the corner instead.
 *
 * These wrap `@/components/ui/form` so a field owns its own label, control,
 * hint and error, and the error appears under the box that caused it. Each one
 * takes the form's `control` and a field name, and react-hook-form does the
 * rest: the message text comes from the zod schema in `lib/adminSchemas`, and
 * `aria-invalid` on the control is what paints the red ring (see ui/input).
 *
 * `FormDialog` is the shell they sit in. It owns the submit wiring, so no page
 * has to remember to disable its own save button while a write is in flight —
 * a double-tap on a slow connection used to send the request twice.
 */

import * as React from 'react';
import type { Control, FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const labelClass = 'text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400';

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Static helper text. Hidden automatically once the field has an error. */
  hint?: string;
  className?: string;
}

// ─── Text ─────────────────────────────────────────────────────────────────────

export function TextField<T extends FieldValues>({
  control, name, label, hint, className, placeholder, type = 'text', autoFocus, disabled,
}: BaseFieldProps<T> & {
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn('gap-1.5', className)}>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ''}
              type={type}
              placeholder={placeholder}
              autoFocus={autoFocus}
              disabled={disabled}
              // Autofill on a staff password field offers the manager's own
              // saved credentials, which is never what a new-hire form wants.
              autoComplete={type === 'password' ? 'new-password' : undefined}
              className="rounded-xl bg-stone-50/60 dark:bg-stone-900/50"
            />
          </FormControl>
          {hint && !fieldState.error && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Number ───────────────────────────────────────────────────────────────────

/**
 * Bound as a string, not a number.
 *
 * `onChange={e => field.onChange(Number(e.target.value))}` is the obvious
 * version and it makes the field unusable: clearing the box yields `Number('')
 * === 0`, so the zero reappears under the cursor and you cannot type `50` over
 * it without selecting the `0` first. Every price field in the admin behaved
 * that way. The raw string is kept here and `z.coerce` in the schema converts
 * it once, at validation time.
 */
export function NumberField<T extends FieldValues>({
  control, name, label, hint, className, placeholder, prefix, suffix, min = 0, step = 1, disabled,
}: BaseFieldProps<T> & {
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn('gap-1.5', className)}>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <div className="relative">
            {prefix && (
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-stone-400">
                {prefix}
              </span>
            )}
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                type="number"
                inputMode="decimal"
                min={min}
                step={step}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'rounded-xl bg-stone-50/60 tabular-nums dark:bg-stone-900/50',
                  prefix && 'pl-7',
                  suffix && 'pr-10'
                )}
              />
            </FormControl>
            {suffix && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-stone-400">
                {suffix}
              </span>
            )}
          </div>
          {hint && !fieldState.error && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function SelectField<T extends FieldValues>({
  control, name, label, hint, className, options, placeholder = 'Select…', disabled,
}: BaseFieldProps<T> & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn('gap-1.5', className)}>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger className="w-full rounded-xl bg-stone-50/60 dark:bg-stone-900/50">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint && !fieldState.error && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function TextAreaField<T extends FieldValues>({
  control, name, label, hint, className, placeholder, rows = 3,
}: BaseFieldProps<T> & { placeholder?: string; rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn('gap-1.5', className)}>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ''}
              rows={rows}
              placeholder={placeholder}
              className="resize-none rounded-xl bg-stone-50/60 dark:bg-stone-900/50"
            />
          </FormControl>
          {hint && !fieldState.error && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Switch ───────────────────────────────────────────────────────────────────

export function SwitchField<T extends FieldValues>({
  control, name, label, hint, className,
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            'flex flex-row items-center justify-between gap-4 rounded-xl border border-stone-200/60 bg-stone-50/60 p-3 dark:border-[#2C2C2E]/50 dark:bg-stone-900/40',
            className
          )}
        >
          <div className="min-w-0 space-y-0.5">
            <FormLabel className="text-xs font-bold text-stone-800 dark:text-stone-200">
              {label}
            </FormLabel>
            {hint && <FormDescription className="text-[10.5px]">{hint}</FormDescription>}
          </div>
          <FormControl>
            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

// ─── Dialog shell ─────────────────────────────────────────────────────────────

interface FormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<T>;
  /**
   * The resolver transforms input values into output values, so the handler
   * receives the parsed shape rather than `T`. Typing that precisely would
   * mean threading a second generic through every call site for no practical
   * gain — each page annotates its own handler with the schema's output type.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: any) => void | Promise<void>;
  title: string;
  description?: string;
  submitLabel: string;
  /** Widen for forms with three columns of numbers. */
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function FormDialog<T extends FieldValues>({
  open, onOpenChange, form, onSubmit, title, description, submitLabel, size = 'md', children,
}: FormDialogProps<T>) {
  const busy = form.formState.isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing mid-write would unmount the form under the request and lose
        // whatever the user typed if it then failed.
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          'gap-0 overflow-hidden p-0',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-2xl'
        )}
        showCloseButton={!busy}
      >
        <DialogHeader className="border-b border-stone-100 px-5 py-4 text-left dark:border-[#2C2C2E]/60">
          <DialogTitle className="text-base font-black">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          ) : (
            // Radix warns when a dialog has no description; the sr-only node
            // satisfies it without printing anything.
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            {/* Caps at 60% of the viewport so a long form scrolls internally
                and the save button stays reachable on a phone. */}
            <div className="max-h-[60dvh] space-y-3.5 overflow-y-auto px-5 py-4">
              {children}
            </div>

            <DialogFooter className="flex-row gap-2 border-t border-stone-100 bg-stone-50/40 px-5 py-3.5 dark:border-[#2C2C2E]/60 dark:bg-stone-950/30">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl font-bold sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-xl bg-amber-600 font-extrabold text-white hover:bg-amber-700 sm:flex-none sm:min-w-36"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? 'Saving…' : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Destructive confirm ──────────────────────────────────────────────────────

/**
 * One confirm dialog for every delete in the admin.
 *
 * Deletes were inconsistent: menu and inventory asked first, coupons deleted on
 * a single click of a trash icon with no way back. This makes the safe version
 * the easy one to reach for, and it names the record being destroyed so the
 * question is answerable without looking behind the dialog.
 */
export function ConfirmDeleteDialog({
  open, onOpenChange, onConfirm, title, description, confirmLabel = 'Delete', busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-sm" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle className="text-base font-black">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl font-bold"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => onConfirm()}
            className="flex-1 rounded-xl font-extrabold"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
