import { describe, expect, it } from 'vitest';
import { parentPath } from '@/components/ui/primitives';
import { filterStates } from './StatePicker';

const states = [
  { code: '09', name: 'Uttar Pradesh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '07', name: 'Delhi' },
  { code: '18', name: 'Assam' },
  { code: '12', name: 'Arunachal Pradesh' },
];

describe('filterStates', () => {
  it('shows every state when nothing is typed', () => {
    expect(filterStates(states, '')).toHaveLength(5);
  });
  it('puts names starting with the text first, then names containing it', () => {
    expect(filterStates(states, 'pra').map((s) => s.name)).toEqual(['Uttar Pradesh', 'Arunachal Pradesh']);
    expect(filterStates(states, 'utt').map((s) => s.name)).toEqual(['Uttar Pradesh', 'Uttarakhand']);
  });
  it('finds a state by its GST code', () => {
    expect(filterStates(states, '07').map((s) => s.name)).toEqual(['Delhi']);
  });
  it('ignores case and spaces around the text', () => {
    expect(filterStates(states, '  ASSAM ').map((s) => s.name)).toEqual(['Assam']);
  });
});

describe('parentPath (where Back goes without history)', () => {
  it('goes up to the section from a detail page', () => {
    expect(parentPath('/samples/jobs/123')).toBe('/samples');
    expect(parentPath('/customers/new')).toBe('/customers');
  });
  it('goes to the dashboard from a section', () => {
    expect(parentPath('/orders')).toBe('/');
  });
});
