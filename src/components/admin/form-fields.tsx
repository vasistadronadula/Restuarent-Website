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
import { Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/* One label voice for every field: the system's 11px wide-tracked upper. */
const labelClass = 'ad-kicker';

/* Controls are the system's square, surface-filled box. `ad-input` carries the
   whole look, so each control only adds what is specific to it. */
const controlClass = 'ad-input';

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
  control, name, label, hint, className, placeholder, type = 'text', autoFocus, disabled, prefix, suffix,
}: BaseFieldProps<T> & {
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  autoFocus?: boolean;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
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
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-ad-muted select-none">
                {prefix}
              </span>
            )}
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                type={type}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                autoComplete={type === 'password' ? 'new-password' : undefined}
                className={cn(controlClass, prefix && '!pl-8', suffix && '!pr-12')}
              />
            </FormControl>
            {suffix && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-ad-muted select-none">
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
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-ad-muted select-none">
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
                className={cn(controlClass, 'tabular-nums', prefix && '!pl-8', suffix && '!pr-12')}
              />
            </FormControl>
            {suffix && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-ad-muted select-none">
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
              <SelectTrigger className={cn(controlClass, 'w-full')}>
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
              className={cn(controlClass, 'resize-none')}
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
            'flex flex-row items-center justify-between gap-4 border border-ad-hairline bg-ad-surface p-3',
            className
          )}
        >
          <div className="min-w-0 space-y-0.5">
            <FormLabel className="text-[14px] font-semibold text-ad-ink">{label}</FormLabel>
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
        <DialogHeader className="border-b-2 border-ad-line px-5 py-4 text-left">
          <DialogTitle className="ad-h text-[18px]">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-[12px] ad-muted">{description}</DialogDescription>
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

            <DialogFooter className="flex-row gap-2 border-t-2 border-ad-line bg-ad-surface px-5 py-3.5">
              <button
                type="button"
                className="ad-btn ad-btn-secondary flex-1 sm:flex-none"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </button>
              <button type="submit" className="ad-btn ad-btn-primary flex-1 sm:flex-none sm:min-w-36" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? 'Saving…' : submitLabel}
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

/** Formats both the client check and /api/upload accept. */
const UPLOADABLE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];

async function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.size < 200 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function ImageUploadField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  className,
  folder = 'dishes',
}: BaseFieldProps<T> & { folder?: 'dishes' | 'categories' | 'general' }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>('');
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [urlDraft, setUrlDraft] = React.useState('');

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const rawValue = field.value;
        const imageVal: string = typeof rawValue === 'string' ? rawValue : '';

        const handleFile = async (file: File) => {
          // Mirrors the allow-list /api/upload enforces, so an unsupported
          // file is refused here with a clear message instead of round-
          // tripping to a 400. SVG is excluded on both sides deliberately:
          // it executes script when served from our own origin.
          if (!UPLOADABLE_IMAGE_TYPES.includes(file.type)) {
            toast.error('Please select a PNG, JPG, WEBP or AVIF image');
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB');
            return;
          }

          setUploading(true);
          setUploadProgress('Optimizing photo…');

          try {
            const optimized = await compressImageFile(file);

            setUploadProgress('Uploading to cloud storage…');

            const formData = new FormData();
            formData.append('file', optimized);
            formData.append('folder', folder);

            // /api/upload is staff-gated — it holds the service-role key and
            // writes to a public bucket, so it verifies the caller's role
            // server-side rather than trusting AdminGuard to have kept
            // non-staff off this screen.
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token;
            if (!accessToken) {
              throw new Error('Your session has expired — sign in again to upload.');
            }

            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
              body: formData,
            });

            const data = await res.json();

            if (!res.ok || !data.url) {
              throw new Error(data.error || 'Failed to upload photo');
            }

            field.onChange(data.url);
            toast.success('Photo uploaded successfully');
          } catch (err) {
            console.error('Upload error:', err);
            // Local fallback so user can still proceed
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                field.onChange(reader.result);
                toast.info('Image attached locally');
              }
            };
            reader.readAsDataURL(file);
            toast.error((err as Error).message || 'Cloud upload failed');
          } finally {
            setUploading(false);
            setUploadProgress('');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };

        return (
          <FormItem className={cn('gap-1.5', className)}>
            <div className="flex items-center justify-between">
              <FormLabel className={labelClass}>{label}</FormLabel>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(!showUrlInput);
                  if (!showUrlInput) setUrlDraft(imageVal);
                }}
                className="text-[11px] font-medium text-ad-muted hover:text-ad-ink transition-colors cursor-pointer"
              >
                {showUrlInput ? 'Switch to Upload' : 'Enter URL instead'}
              </button>
            </div>

            <FormControl>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />

                {showUrlInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className={cn(controlClass, 'flex-1 text-[13px]')}
                    />
                    <button
                      type="button"
                      className="ad-btn ad-btn-secondary shrink-0"
                      onClick={() => {
                        field.onChange(urlDraft.trim());
                        toast.success('Image link set');
                      }}
                    >
                      Apply
                    </button>
                  </div>
                ) : imageVal ? (
                  <div className="flex items-center gap-3.5 p-3 border border-ad-hairline bg-ad-surface">
                    <div className="relative w-16 h-16 overflow-hidden shrink-0 bg-ad-n200 border border-ad-hairline">
                      <img
                        src={String(imageVal)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate m-0">
                        {uploading ? uploadProgress : 'Photo attached'}
                      </p>
                      <p className="ad-kicker mt-0.5 truncate text-[10.5px]">
                        {String(imageVal).startsWith('http') ? 'Cloud storage' : 'Uploaded file'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploading}
                        className="ad-btn ad-btn-secondary ad-btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : 'Replace'}
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        className="ad-btn ad-btn-sm"
                        style={{ color: 'var(--ad-a700)' }}
                        onClick={() => {
                          field.onChange('');
                          setUrlDraft('');
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (uploading) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFile(file);
                    }}
                    className={cn(
                      'border-2 border-dashed border-ad-line hover:border-ad-accent p-5 text-center cursor-pointer transition-colors bg-ad-surface',
                      uploading && 'opacity-70 pointer-events-none cursor-wait'
                    )}
                  >
                    {uploading ? (
                      <div className="py-2">
                        <Loader2 className="w-6 h-6 mx-auto mb-2 text-ad-accent animate-spin" />
                        <p className="text-[13px] font-semibold m-0">{uploadProgress || 'Uploading photo…'}</p>
                        <p className="ad-kicker mt-1">Please wait</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 mx-auto mb-2 text-ad-accent" />
                        <p className="text-[13px] font-semibold m-0">Click or drag dish photo here</p>
                        <p className="ad-kicker mt-1">PNG, JPG, WEBP · up to 10MB · No link needed</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </FormControl>
            {hint && !fieldState.error && <FormDescription>{hint}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
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
          <DialogTitle className="ad-h text-[18px]">{title}</DialogTitle>
          <DialogDescription className="text-[13px] ad-muted">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 pt-2">
          <button type="button" className="ad-btn ad-btn-secondary flex-1" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="button" className="ad-btn ad-btn-primary flex-1" disabled={busy} onClick={() => onConfirm()}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
