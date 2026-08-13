/**
 * adminSchemas.ts — what a valid admin record looks like, stated once.
 *
 * Every admin dialog used to validate by hand at the top of its save handler:
 * a couple of `if (!x.trim())` checks, then `toast.error('Name and price are
 * required')`. That has three problems a manager actually feels. The message
 * appears in a corner of the screen rather than under the field that is wrong,
 * so on a form with three number inputs you are told something is invalid but
 * not which one. The checks only ever covered one or two fields, so a price of
 * `-50` or a discount of `900%` sailed through into the database. And each
 * dialog drew its own line about what "required" meant, so the same field was
 * mandatory on one screen and optional on another.
 *
 * These schemas are the contract instead. `zodResolver` runs them on blur and
 * on submit, react-hook-form puts each message under its own field, and the
 * save button can't fire until the whole object parses — the pattern every
 * large consumer app uses, and the reason their forms tell you exactly which
 * box to fix.
 *
 * Numbers deliberately use `z.coerce`: an <input type="number"> hands back a
 * string, and coercing here means no page has to remember to wrap a field in
 * `Number()` before it validates.
 */

import { z } from 'zod';

import type { VegStatus } from '@/types';

/** Rejects "   " — `.min(1)` alone accepts a string of spaces. */
const requiredText = (label: string, min = 2) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`);

/**
 * Money and stock figures. Kept finite and non-negative because Postgres will
 * happily store `-1` or `NaN`-turned-`null` and the damage only shows up later
 * on a bill.
 */
const money = (label: string, { max = 100_000 }: { max?: number } = {}) =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .refine(Number.isFinite, `${label} must be a number`)
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} looks too large`);

/**
 * The same rules, but an empty box is a valid answer meaning "not set".
 *
 * Built from `.refine` rather than `.pipe(money(...).optional())` because the
 * coercion in `money` widens its input to `unknown`, which a pipe then refuses
 * to accept from an optional upstream.
 */
const optionalMoney = (label: string, { max = 100_000 }: { max?: number } = {}) =>
  z
    .union([z.literal(''), z.coerce.number()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || Number.isFinite(v), `${label} must be a number`)
    .refine((v) => v === undefined || v >= 0, `${label} cannot be negative`)
    .refine((v) => v === undefined || v <= max, `${label} looks too large`);

/** 10 digits starting 6–9, the only shape an Indian mobile takes. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+?91|0)/, ''))
  .pipe(z.string().regex(INDIAN_MOBILE, 'Enter a valid 10-digit mobile number'));

/**
 * An image field that is optional. Accepts storage URLs, web links, local paths,
 * base64 data URLs, or empty strings.
 */
export const optionalImage = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === '' ||
      /^https?:\/\/\S+$/i.test(v) ||
      /^\/[^\s]+$/i.test(v) ||
      /^data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(v),
    'Enter a valid image URL, path, or upload a photo'
  );

// ─── Menu item ────────────────────────────────────────────────────────────────

// These are the default slugs — new categories added via the admin are stored
// in the `menu_categories` DB table and the category field on menu_items is a
// free-form string. The schema validates non-empty rather than enum membership.
export const CATEGORY_VALUES = [
  'starters', 'south-indian', 'north-indian', 'chinese', 'biryani', 'tandoori',
  'desserts', 'beverages', 'combos', 'rice', 'breads',
] as const;

export const VEG_STATUS_VALUES = ['veg', 'non-veg', 'egg'] as const satisfies readonly VegStatus[];

export const menuItemSchema = z
  .object({
    name: requiredText('Dish name'),
    category: z.string().trim().min(1, 'Pick a category'),
    vegStatus: z.enum(VEG_STATUS_VALUES, { message: 'Pick a veg status' }),
    price: money('Price', { max: 50_000 }).refine((v) => v > 0, 'Price must be more than ₹0'),
    // The three portion prices the storefront actually reads. Leaving all
    // three blank is normal — most dishes come one way.
    portionSingle: optionalMoney('Single price', { max: 50_000 }),
    portionFull: optionalMoney('Full price', { max: 50_000 }),
    portionLarge: optionalMoney('Large price', { max: 50_000 }),
    prepTime: z.coerce
      .number({ message: 'Prep time must be a number' })
      .int('Prep time must be whole minutes')
      .min(1, 'Prep time must be at least 1 minute')
      .max(240, 'Prep time cannot exceed 4 hours'),
    image: optionalImage,
    description: z.string().trim().max(500, 'Keep the description under 500 characters'),
    isAvailable: z.boolean(),
    isSpecial: z.boolean(),
    isPopular: z.boolean(),
  })
  // A larger portion that costs less than a smaller one is a typo every time,
  // and it reaches the customer as a menu that prices Large below Single.
  .refine(
    (v) => v.portionSingle === undefined || v.portionFull === undefined || v.portionFull >= v.portionSingle,
    { path: ['portionFull'], message: 'Full must cost at least as much as Single' }
  )
  .refine(
    (v) => v.portionFull === undefined || v.portionLarge === undefined || v.portionLarge >= v.portionFull,
    { path: ['portionLarge'], message: 'Large must cost at least as much as Full' }
  );

export type MenuItemFormValues = z.input<typeof menuItemSchema>;
export type MenuItemFormOutput = z.output<typeof menuItemSchema>;

// ─── Inventory ────────────────────────────────────────────────────────────────

export const INVENTORY_CATEGORIES = [
  'Poultry & Meat', 'Rice & Grains', 'Spices & Condiments', 'Dairy & Milk',
  'Vegetables', 'Beverages',
] as const;

export const INVENTORY_UNITS = ['Kg', 'Grams', 'Liters', 'Packs', 'Units', 'Bags', 'Tins'] as const;

export const inventoryItemSchema = z.object({
  name: requiredText('Item name'),
  category: z.enum(INVENTORY_CATEGORIES, { message: 'Pick a category' }),
  unit: z.enum(INVENTORY_UNITS, { message: 'Pick a unit' }),
  currentStock: money('Stock', { max: 1_000_000 }),
  minStockThreshold: money('Minimum threshold', { max: 1_000_000 }),
  unitCost: money('Unit cost', { max: 1_000_000 }),
  supplier: z.string().trim().max(80, 'Supplier name is too long'),
});

export type InventoryFormValues = z.input<typeof inventoryItemSchema>;
export type InventoryFormOutput = z.output<typeof inventoryItemSchema>;

// ─── Coupon ───────────────────────────────────────────────────────────────────

export const couponSchema = z
  .object({
    // Uppercased before it is checked, so a manager typing `save10` sees the
    // field correct itself rather than a complaint about lowercase letters.
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(
        z
          .string()
          .min(3, 'Code must be at least 3 characters')
          .max(20, 'Code must be 20 characters or fewer')
          .regex(/^[A-Z0-9]+$/, 'Use letters and numbers only — no spaces or symbols')
      ),
    discount: z.coerce
      .number({ message: 'Discount must be a number' })
      .min(1, 'Discount must be at least 1%')
      .max(100, 'Discount cannot exceed 100%'),
    maxDiscount: money('Max discount', { max: 100_000 }),
    minOrder: money('Minimum order', { max: 100_000 }),
    description: z.string().trim().max(120, 'Keep the description under 120 characters'),
    isActive: z.boolean(),
  })
  // A cap of ₹0 silently disables the coupon it is attached to: the customer
  // types a valid code, the discount computes to nothing, and nobody can tell
  // why. Requiring a real cap on a percentage coupon makes that impossible.
  .refine((v) => v.maxDiscount > 0, {
    path: ['maxDiscount'],
    message: 'Set a cap above ₹0, or the coupon takes nothing off',
  });

export type CouponFormValues = z.input<typeof couponSchema>;
export type CouponFormOutput = z.output<typeof couponSchema>;

// ─── Employee ─────────────────────────────────────────────────────────────────

export const STAFF_ROLE_VALUES = ['admin', 'manager', 'chef', 'cashier', 'waiter'] as const;
export const SHIFT_VALUES = ['morning', 'evening', 'night'] as const;

/** Supabase Auth's own floor. Checking here saves a failed round-trip. */
export const MIN_STAFF_PASSWORD = 8;

const employeeBase = {
  name: requiredText('Name'),
  role: z.enum(STAFF_ROLE_VALUES, { message: 'Pick a role' }),
  shift: z.enum(SHIFT_VALUES, { message: 'Pick a shift' }),
  phone,
  salary: money('Salary', { max: 10_000_000 }),
};

export const newEmployeeSchema = z.object({
  ...employeeBase,
  email: z.email({ message: 'Enter a valid email address' }),
  // This becomes a real login, so it is held to the same length rule the
  // storefront holds customers to — the old form accepted 6 characters, which
  // Supabase itself would then reject on a slow round-trip.
  password: z.string().min(MIN_STAFF_PASSWORD, `Use at least ${MIN_STAFF_PASSWORD} characters`),
});

export const editEmployeeSchema = z.object({
  ...employeeBase,
  isActive: z.boolean(),
  // Blank means "leave the password alone". Anything else has to be a valid
  // new one, so a half-typed reset can't be saved.
  password: z
    .string()
    .refine(
      (v) => v === '' || v.length >= MIN_STAFF_PASSWORD,
      `Use at least ${MIN_STAFF_PASSWORD} characters, or leave blank to keep the current password`
    ),
});

export type NewEmployeeFormValues = z.input<typeof newEmployeeSchema>;
export type EditEmployeeFormValues = z.input<typeof editEmployeeSchema>;

// ─── Dining table ─────────────────────────────────────────────────────────────

export const diningTableSchema = z.object({
  tableNumber: z.coerce
    .number({ message: 'Table number must be a number' })
    .int('Table number must be a whole number')
    .min(1, 'Table number starts at 1')
    .max(999, 'Table number cannot exceed 999'),
  capacity: z.coerce
    .number({ message: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'A table seats at least 1')
    .max(50, 'Capacity cannot exceed 50'),
  description: z.string().trim().max(80, 'Keep the note under 80 characters'),
  isActive: z.boolean(),
});

export type DiningTableFormValues = z.input<typeof diningTableSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: requiredText('Category name'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(40, 'Slug must be 40 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  image: optionalImage,
  sortOrder: z.coerce
    .number({ message: 'Sort order must be a number' })
    .int('Sort order must be a whole number')
    .min(0, 'Sort order cannot be negative')
    .max(999, 'Sort order cannot exceed 999'),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.input<typeof categorySchema>;
export type CategoryFormOutput = z.output<typeof categorySchema>;
