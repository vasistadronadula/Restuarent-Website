'use client';

import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Phone-OTP vs email-and-password.
 *
 * One definition shared by the login page, the signup page and the auth modal.
 * All three grew their own copy — a `ToggleButtonGroup` in the modal and
 * hand-rolled pill buttons on the pages — which is how the modal ended up with
 * a visibly different control from the page it opens on top of.
 */

export type AuthMethod = 'otp' | 'email';

interface Props {
  value: AuthMethod;
  onChange: (next: AuthMethod) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: AuthMethod; label: string; icon: React.ElementType }> = [
  { value: 'otp', label: 'Mobile OTP', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
];

export default function AuthMethodToggle({ value, onChange, disabled = false }: Props) {
  return (
    <div role="tablist" aria-label="Sign-in method" className="mb-5 flex gap-2">
      {OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-[13px] border-[1.5px] py-2.5 text-[13.5px] transition-colors outline-none',
              'focus-visible:ring-ring/40 focus-visible:ring-[3px]',
              'disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/5 text-primary font-extrabold'
                : 'border-input bg-card text-muted-foreground hover:border-foreground/25 hover:bg-muted font-semibold'
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
