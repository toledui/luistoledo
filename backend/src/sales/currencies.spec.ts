import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { CurrenciesService } from './currencies.service';
jest.mock('geoip-lite', () => ({
  lookup: (ip: string) => (ip === 'public-us-ip' ? { country: 'US' } : null),
}));

describe('Currency quotations and privacy', () => {
  let service: CurrenciesService;
  const accounts = { retrieve: jest.fn() };
  const specs = { retrieve: jest.fn() };
  const client = { accounts, countrySpecs: specs } as unknown as Stripe;
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new CurrenciesService(
      new ConfigService({ APP_ENCRYPTION_KEY: 'unit-test-signing-key' }),
    );
    accounts.retrieve.mockResolvedValue({ id: 'acct_test', country: 'MX' });
    specs.retrieve.mockResolvedValue({
      supported_payment_currencies: ['mxn', 'usd', 'eur', 'jpy', 'isk', 'ugx'],
    });
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: 'success',
          base_code: 'MXN',
          time_last_update_unix: Math.floor(Date.now() / 1000),
          time_next_update_unix: Math.floor(Date.now() / 1000) + 86400,
          rates: {
            MXN: 1,
            USD: 0.05,
            EUR: 0.04,
            JPY: 7.5,
            ISK: 7.2,
            UGX: 200,
            XXX: 1,
          },
        }),
    });
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });
  it('offers only the intersection of account currencies and available exchange rates', async () => {
    const options = await service.options(client, 'public-us-ip');
    expect(options.currencies).toEqual([
      'MXN',
      'EUR',
      'ISK',
      'JPY',
      'UGX',
      'USD',
    ]);
    expect(options.defaultCurrency).toBe('USD');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://open.er-api.com/v6/latest/MXN',
      expect.anything(),
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('public-us-ip');
    await service.options(client);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(accounts.retrieve).toHaveBeenCalledTimes(1);
  });
  it('defaults to MXN for an unresolvable local IP', async () => {
    expect((await service.options(client, '127.0.0.1')).defaultCurrency).toBe(
      'MXN',
    );
  });
  it('signs rounded amounts and binds the quote to the authoritative MXN total', async () => {
    const quote = await service.quote('500.00', 'USD', client);
    expect(quote.amount).toBe(2500);
    expect(service.verify(quote.token, new Prisma.Decimal(500)).currency).toBe(
      'USD',
    );
    expect(() => service.verify(quote.token, new Prisma.Decimal(499))).toThrow(
      'cotización',
    );
    const [payload, signature] = quote.token.split('.');
    const altered = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as { amount: number };
    altered.amount = 1;
    expect(() =>
      service.verify(
        Buffer.from(JSON.stringify(altered)).toString('base64url') +
          '.' +
          signature,
        new Prisma.Decimal(500),
      ),
    ).toThrow('cotización');
  });
  it('rejects expired quotes', async () => {
    const quote = await service.quote(500, 'MXN');
    jest.useFakeTimers().setSystemTime(Date.now() + 16 * 60000);
    expect(() => service.verify(quote.token, new Prisma.Decimal(500))).toThrow(
      'cotización',
    );
  });
  it('respects zero-decimal currencies and special Stripe API units', async () => {
    expect((await service.quote(10, 'JPY', client)).amount).toBe(75);
    expect((await service.quote(10, 'ISK', client)).amount).toBe(7200);
    expect((await service.quote(10, 'UGX', client)).amount).toBe(200000);
  });
  it('rejects currencies not supported by the Stripe account', async () => {
    await expect(service.quote(500, 'XXX', client)).rejects.toThrow(
      'moneda no está disponible',
    );
  });
  it('keeps MXN available when the rate provider is down, without inventing foreign rates', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(service.quote(500, 'MXN')).resolves.toEqual(
      expect.objectContaining({ amount: 50000, currency: 'MXN' }),
    );
    await expect(service.quote(500, 'USD', client)).rejects.toThrow(
      'tipo de cambio no está disponible',
    );
  });
});
