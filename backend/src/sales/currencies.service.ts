import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { lookup } from 'geoip-lite';
import countryToCurrency from 'country-to-currency';
import Stripe from 'stripe';

export const currencyDecimals = (currency: string) => {
  if (
    [
      'BIF',
      'CLP',
      'DJF',
      'GNF',
      'JPY',
      'KMF',
      'KRW',
      'MGA',
      'PYG',
      'RWF',
      'VND',
      'VUV',
      'XAF',
      'XOF',
      'XPF',
    ].includes(currency)
  )
    return 0;
  return 2; // Stripe represents ISK and UGX with two API decimals.
};
export type CurrencyQuote = {
  base: string;
  currency: string;
  amount: number;
  rate: string;
  at: number;
  exp: number;
};

@Injectable()
export class CurrenciesService {
  private rates?: {
    values: Record<string, number>;
    at: number;
    refreshAt: number;
  };
  private loading?: Promise<NonNullable<CurrenciesService['rates']>>;
  private supported?: { currencies: string[]; until: number; account: string };
  constructor(private readonly config: ConfigService) {}
  reset() {
    this.supported = undefined;
  }

  private async loadRates() {
    if (this.rates && Date.now() < this.rates.refreshAt) return this.rates;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/MXN', {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('rates unavailable');
        const data = (await response.json()) as {
          result?: string;
          base_code?: string;
          time_last_update_unix?: number;
          time_next_update_unix?: number;
          rates?: Record<string, number>;
        };
        const at = Number(data.time_last_update_unix) * 1000;
        if (
          data.result !== 'success' ||
          data.base_code !== 'MXN' ||
          !data.rates ||
          !Number.isFinite(at) ||
          at > Date.now() + 300000 ||
          Math.abs(Date.now() - at) > 48 * 3600_000 ||
          data.rates.MXN !== 1
        )
          throw new Error('invalid rates');
        const values = Object.fromEntries(
          Object.entries(data.rates).filter(
            ([code, value]) =>
              /^[A-Z]{3}$/.test(code) && Number.isFinite(value) && value > 0,
          ),
        );
        this.rates = {
          values,
          at,
          refreshAt: Math.min(
            Date.now() + 24 * 3600_000,
            Math.max(
              Date.now() + 3600_000,
              Number(data.time_next_update_unix) * 1000 || 0,
            ),
          ),
        };
        return this.rates;
      } catch {
        if (this.rates && Date.now() - this.rates.at < 48 * 3600_000)
          return this.rates;
        throw new ServiceUnavailableException(
          'El tipo de cambio no está disponible. Puedes pagar en MXN o reintentar.',
        );
      }
    })();
    try {
      return await this.loading;
    } finally {
      this.loading = undefined;
    }
  }

  async options(client: Stripe, ip?: string) {
    if (!this.supported || this.supported.until < Date.now()) {
      const account = await client.accounts.retrieve(null);
      if (!account.country)
        throw new ServiceUnavailableException(
          'No fue posible verificar las monedas de la cuenta Stripe.',
        );
      const spec = await client.countrySpecs.retrieve(account.country);
      this.supported = {
        account: account.id,
        currencies: spec.supported_payment_currencies.map((c) =>
          c.toUpperCase(),
        ),
        until: Date.now() + 3600_000,
      };
    }
    const rates = await this.loadRates();
    const currencies = this.supported.currencies
      .filter((code) => Object.hasOwn(rates.values, code))
      .sort();
    const country = ip ? lookup(ip)?.country : undefined;
    const local = country
      ? (countryToCurrency as Record<string, string>)[country]
      : undefined;
    return {
      currencies: [...new Set(['MXN', ...currencies])],
      defaultCurrency: local && currencies.includes(local) ? local : 'MXN',
      country: country ?? null,
      rateUpdatedAt: rates.at,
    };
  }

  async quote(baseAmount: string | number, currency: string, client?: Stripe) {
    const base = new Prisma.Decimal(baseAmount).toFixed(2);
    if (currency === 'MXN')
      return this.sign({
        base,
        currency,
        amount: new Prisma.Decimal(base).mul(100).toNumber(),
        rate: '1',
        at: Date.now(),
        exp: Date.now() + 15 * 60_000,
      });
    if (!client)
      throw new ServiceUnavailableException(
        'Stripe no está disponible para convertir esta moneda.',
      );
    const options = await this.options(client);
    if (!options.currencies.includes(currency))
      throw new BadRequestException(
        'Esta moneda no está disponible para tu pago.',
      );
    const rates = await this.loadRates();
    const rate = new Prisma.Decimal(rates.values[currency]);
    let amount = new Prisma.Decimal(base)
      .mul(rate)
      .mul(10 ** currencyDecimals(currency))
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber();
    if (['ISK', 'UGX'].includes(currency))
      amount = Math.round(amount / 100) * 100;
    if (Number(base) > 0 && amount < 1)
      throw new BadRequestException(
        'El importe es demasiado pequeño para esta moneda.',
      );
    return this.sign({
      base,
      currency,
      amount,
      rate: rate.toString(),
      at: rates.at,
      exp: Date.now() + 15 * 60_000,
    });
  }

  private signature(payload: string) {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('APP_ENCRYPTION_KEY'),
    )
      .update('lta-currency-quote-v1:' + payload)
      .digest();
  }
  private sign(quote: CurrencyQuote) {
    const payload = Buffer.from(JSON.stringify(quote)).toString('base64url');
    return {
      ...quote,
      token: payload + '.' + this.signature(payload).toString('base64url'),
      formatted: new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: quote.currency,
        currencyDisplay: 'code',
      }).format(quote.amount / 10 ** currencyDecimals(quote.currency)),
      source: 'ExchangeRate-API',
    };
  }
  verify(token: string, expectedBase: Prisma.Decimal): CurrencyQuote {
    try {
      const [payload, encoded, extra] = token.split('.');
      const signature = Buffer.from(encoded, 'base64url');
      const expected = this.signature(payload);
      if (
        extra ||
        signature.length !== expected.length ||
        !timingSafeEqual(signature, expected)
      )
        throw new Error();
      const quote = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      ) as CurrencyQuote;
      if (
        quote.exp < Date.now() ||
        quote.exp > Date.now() + 16 * 60_000 ||
        quote.base !== expectedBase.toFixed(2) ||
        !/^[A-Z]{3}$/.test(quote.currency) ||
        !Number.isSafeInteger(quote.amount) ||
        quote.amount < 0
      )
        throw new Error();
      return quote;
    } catch {
      throw new BadRequestException(
        'La cotización cambió o venció. Revisa el total y vuelve a intentar.',
      );
    }
  }
}
