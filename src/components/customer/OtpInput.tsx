'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * OtpInput — the six-box code field every delivery app uses.
 *
 * A single "6-digit code" text field works, but it is the part of the sign-in a
 * customer is most likely to fumble: there is no feedback on how many digits
 * have landed, fixing a mistyped digit means selecting text on a phone, and
 * pasting out of the SMS app drops stray characters into the field. Separate
 * boxes solve all three, and they are what every other app that texts a code
 * has already trained the customer to expect.
 *
 * Notes on the implementation:
 *
 * - It stays *controlled* — the parent owns the string. That is what lets the
 *   WebOTP autofill in PhoneOtpAuth (`navigator.credentials.get`) drop a whole
 *   code in and have the boxes simply render it.
 * - `autoComplete="one-time-code"` is on the first box only. Repeating it on
 *   all six makes iOS offer the code six separate times.
 * - The value is always a *compact* digit string, so `code.length === 6` stays
 *   a valid "is it filled in" test for callers. Focus is therefore pinned to
 *   the first empty box: clicking box 5 with two digits entered puts the caret
 *   in box 3, which is the only place a keystroke could legally go.
 * - `onComplete` is latched per code, so a re-render with a full field cannot
 *   fire a second submit.
 */

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Fired once when the final digit lands — used to auto-submit. */
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  label?: string;
}

/** One box. `filled` and `hasError` only change the border and ring colour. */
const slotClass = (filled: boolean, hasError: boolean) =>
  cn(
    'h-12.5 w-full rounded-[14px] border-[1.5px] bg-card p-0 text-center text-xl font-extrabold tabular-nums',
    'caret-primary transition-[border-color,box-shadow,transform] duration-150 outline-none',
    'sm:h-14 sm:text-[22px]',
    'disabled:bg-muted disabled:text-muted-foreground',
    'focus:-translate-y-px',
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-[3px] focus:ring-destructive/20 hover:not-disabled:border-destructive'
      : cn(
          filled ? 'border-primary' : 'border-input',
          'focus:border-primary focus:ring-[3px] focus:ring-primary/15 hover:not-disabled:border-primary'
        )
  );

export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = false,
  label = 'Verification code',
}: Props) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const completedFor = useRef<string | null>(null);

  /**
   * The two refs below exist because of a race that is easy to hit and easy to
   * miss: focus moves synchronously, React state does not.
   *
   * Typing "1" writes the digit, calls onChange("1") and moves the caret to box
   * 2 — all in one event. If the next keystroke arrives before React has
   * re-rendered with the new prop, its handler still closes over `value === ""`
   * and overwrites the first digit instead of appending. It is not a
   * theoretical window: it opens for anything faster than a render, which
   * includes a quick typist and, more importantly, Android's SMS autofill
   * pushing six digits in as fast as it can.
   *
   * `live` is therefore the authoritative value — updated the instant a key is
   * handled — and `emitted` records what was last handed upwards, so a value
   * the *parent* changed (WebOTP autofill, a reset after a wrong code) can
   * still be told apart from one that simply has not come back yet.
   */
  const live = useRef(value);
  const emitted = useRef(value);

  useEffect(() => {
    // Only when the prop is something we did not send up. A value that is
    // simply our own, coming back after a render, must not overwrite a newer
    // one a keystroke has already recorded.
    if (value !== emitted.current) {
      live.current = value;
      emitted.current = value;
    }
  }, [value]);

  const commit = useCallback((next: string) => {
    live.current = next;
    emitted.current = next;
    onChange(next);
  }, [onChange]);

  const digits = useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ''),
    [value, length],
  );

  useEffect(() => {
    if (value.length === length) {
      // Latched on the exact code: correcting a digit and re-completing still
      // fires, but an unrelated re-render never does.
      if (completedFor.current !== value) {
        completedFor.current = value;
        onComplete?.(value);
      }
    } else {
      completedFor.current = null;
    }
  }, [value, length, onComplete]);

  const focusBox = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    const target = inputsRef.current[clamped];
    target?.focus();
    target?.select();
  }, [length]);

  /** Writes one or more digits starting at `index`, clamped so no gaps form. */
  const writeAt = useCallback((index: number, text: string) => {
    const clean = text.replace(/\D/g, '');
    if (!clean) return;

    const chars = live.current.split('');
    let cursor = Math.min(index, chars.length);
    for (const char of clean) {
      if (cursor >= length) break;
      chars[cursor] = char;
      cursor += 1;
    }
    commit(chars.join('').slice(0, length));
    focusBox(cursor);
  }, [length, commit, focusBox]);

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    const current = live.current;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (!current.length) return;
      // An empty box means the caret is past the end — delete the last digit.
      const target = index < current.length ? index : current.length - 1;
      const chars = current.split('');
      chars.splice(target, 1);
      commit(chars.join(''));
      focusBox(target);
      return;
    }
    if (event.key === 'ArrowLeft') { event.preventDefault(); focusBox(index - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); focusBox(Math.min(index + 1, current.length)); }
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="grid w-full gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          className={slotClass(Boolean(digit), error)}
          aria-invalid={error || undefined}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => writeAt(index, e.target.value)}
          onKeyDown={handleKeyDown(index)}
          onPaste={(e) => {
            e.preventDefault();
            writeAt(index, e.clipboardData.getData('text'));
          }}
          onFocus={(e) => {
            // Keep the caret at the first empty box so the string stays compact.
            if (index > live.current.length) { focusBox(live.current.length); return; }
            e.currentTarget.select();
          }}
        />
      ))}
    </div>
  );
}
