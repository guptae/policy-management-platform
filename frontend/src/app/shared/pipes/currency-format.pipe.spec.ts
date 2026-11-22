import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  const pipe = new CurrencyFormatPipe();

  it('formats with the currency code', () => {
    expect(pipe.transform(10590, 'SGD')).toBe('SGD 10,590.00');
  });

  it('uses currency minor units (JPY has none)', () => {
    expect(pipe.transform(125000, 'JPY')).toBe('JPY 125,000');
  });

  it('handles empty and invalid input', () => {
    expect(pipe.transform(null, 'USD')).toBe('');
    expect(pipe.transform(12.5, 'not-a-code')).toBe('NOT-A-CODE 12.50');
    expect(pipe.transform(12.5, null)).toBe('12.50');
  });
});
