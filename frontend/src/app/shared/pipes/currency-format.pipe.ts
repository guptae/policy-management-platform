import { Pipe, PipeTransform } from '@angular/core';

export type CurrencyDisplay = 'code' | 'none';

/**
 * Formats a premium amount with its ISO currency code, e.g. `10590 | currencyFormat:'SGD'` → "SGD 10,590.00".
 * Uses the currency's own minor units (JPY → no decimals). Unknown codes fall back to 2 decimals.
 * Pass display `'none'` to omit the code (e.g. when a column header already names the currency).
 */
@Pipe({ name: 'currencyFormat' })
export class CurrencyFormatPipe implements PipeTransform {
  private static readonly cache = new Map<string, Intl.NumberFormat>();

  transform(
    amount: number | string | null | undefined,
    currency: string | null | undefined,
    display: CurrencyDisplay = 'code',
    locale = 'en-US',
  ): string {
    if (amount === null || amount === undefined || amount === '') return '';
    const value = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(value)) return '';

    const code = (currency ?? '').toUpperCase();
    const formatter = CurrencyFormatPipe.formatter(code, locale, display);
    if (formatter) {
      // Normalise the non-breaking space some locales put between code and number.
      return formatter.format(value).replace(/ /g, ' ');
    }
    const plain = value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return code && display === 'code' ? `${code} ${plain}` : plain;
  }

  private static formatter(code: string, locale: string, display: CurrencyDisplay): Intl.NumberFormat | null {
    if (!/^[A-Z]{3}$/.test(code)) return null;
    const key = `${locale}|${code}|${display}`;
    let f = this.cache.get(key);
    if (!f) {
      try {
        const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'code' });
        // For 'none', reuse the currency's minor units but format as a plain number.
        const digits = currency.resolvedOptions().maximumFractionDigits;
        f =
          display === 'code'
            ? currency
            : new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      } catch {
        return null;
      }
      this.cache.set(key, f);
    }
    return f;
  }
}
