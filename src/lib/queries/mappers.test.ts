import { describe, expect, it } from 'vitest';
import { mapMenuItem } from './mappers';

describe('menu rating mapping', () => {
  it.each([undefined, null, 0, '', 'invalid'])('does not invent a rating for %s', (rating) => {
    expect(mapMenuItem({ id: 'dish', rating }).rating).toBe(0);
  });

  it('preserves a supplied rating and review count', () => {
    const item = mapMenuItem({ id: 'dish', rating: '4.6', review_count: '12' });
    expect(item.rating).toBe(4.6);
    expect(item.reviewCount).toBe(12);
  });

});
