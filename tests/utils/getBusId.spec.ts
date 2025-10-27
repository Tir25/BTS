import { describe, it, expect } from '@jest/globals';
import { getBusId } from '../../frontend/src/utils/mapHelpers';

describe('getBusId', () => {
  it('should return id when bus has id property', () => {
    const bus = { id: 'bus-123' };
    expect(getBusId(bus)).toBe('bus-123');
  });

  it('should return bus_id when id is not present', () => {
    const bus = { bus_id: 'bus-456' };
    expect(getBusId(bus)).toBe('bus-456');
  });

  it('should return busId when id and bus_id are not present', () => {
    const bus = { busId: 'bus-789' };
    expect(getBusId(bus)).toBe('bus-789');
  });

  it('should return meta.id when other properties are not present', () => {
    const bus = { meta: { id: 'bus-meta-123' } };
    expect(getBusId(bus)).toBe('bus-meta-123');
  });

  it('should handle numeric IDs', () => {
    const bus1 = { id: 123 };
    const bus2 = { bus_id: 456 };
    expect(getBusId(bus1)).toBe(123);
    expect(getBusId(bus2)).toBe(456);
  });

  it('should return primitive string ID', () => {
    expect(getBusId('bus-string-123')).toBe('bus-string-123');
  });

  it('should return primitive number ID', () => {
    expect(getBusId(999)).toBe(999);
  });

  it('should return null for null input', () => {
    expect(getBusId(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(getBusId(undefined)).toBeNull();
  });

  it('should return null for empty object', () => {
    expect(getBusId({})).toBeNull();
  });

  it('should return null for non-object, non-primitive input', () => {
    expect(getBusId('')).toBeNull();
    expect(getBusId([])).toBeNull();
  });

  it('should prioritize id over bus_id', () => {
    const bus = { id: 'primary-id', bus_id: 'secondary-id' };
    expect(getBusId(bus)).toBe('primary-id');
  });

  it('should prioritize id over busId', () => {
    const bus = { id: 'primary-id', busId: 'camel-id' };
    expect(getBusId(bus)).toBe('primary-id');
  });

  it('should prioritize bus_id over busId', () => {
    const bus = { bus_id: 'snake-id', busId: 'camel-id' };
    expect(getBusId(bus)).toBe('snake-id');
  });

  it('should handle nested bus.data.id pattern', () => {
    const bus = { data: { id: 'nested-id' } };
    // Note: This doesn't currently handle data.id, but demonstrates current behavior
    expect(getBusId(bus)).toBeNull();
  });

  it('should handle null/undefined ID values', () => {
    const bus1 = { id: null };
    const bus2 = { id: undefined };
    const bus3 = { bus_id: null };
    
    expect(getBusId(bus1)).toBeNull();
    expect(getBusId(bus2)).toBeNull();
    expect(getBusId(bus3)).toBeNull();
  });
});

