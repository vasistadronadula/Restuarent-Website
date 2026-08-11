/**
 * Barrel for the data layer. Pages import from `@/lib/queries` so a hook can
 * move between domain files without a rename sweep across the app.
 */

export { queryKeys } from './keys';
export * from './mappers';
export * from './orders';
export * from './reservations';
export * from './menu';
export * from './inventory';
export * from './employees';
export * from './tables';
export * from './coupons';
export * from './categories';
