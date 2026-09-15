import { describe, expect, it } from 'vitest';
import { tenantInsertFields } from './tenantContext';

describe('tenant insert fields', () => {
  it('omits unconfigured tenant columns so single-restaurant inserts succeed', () => {
    expect(tenantInsertFields({ tenant_id: null, restaurant_id: null, branch_id: null })).toEqual({});
  });
  it('passes through only configured scope values', () => {
    expect(
      tenantInsertFields({ tenant_id: 't', restaurant_id: null, branch_id: 'b' })
    ).toEqual({ tenant_id: 't', branch_id: 'b' });
  });
});
