import { describe, expect, it } from 'vitest';
import { shiftDeviationSamples } from './BookingPage';

describe('shiftDeviationSamples', () => {
  it('keeps each deviation on its own sample when an earlier sample is removed', () => {
    // Samples 1, 2, 3 (positions 0, 1, 2); sample 1 is removed.
    expect(shiftDeviationSamples(['', '0', '1', '2'], 0)).toEqual(['', '', '0', '1']);
  });

  it('leaves deviations on earlier samples alone', () => {
    expect(shiftDeviationSamples(['0', '2'], 1)).toEqual(['0', '1']);
  });
});
