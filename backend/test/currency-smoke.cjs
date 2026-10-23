// Read-only account/rate checks, plus an optional explicitly enabled TEST session that is immediately expired.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const Stripe = require('stripe');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { EncryptionService } = require('../dist/src/crypto/encryption.service');
const { CurrenciesService } = require('../dist/src/sales/currencies.service');
const { Prisma } = require('@prisma/client');

async function run() {
  const config = new ConfigService();
  const prisma = new PrismaService(config);
  try {
    const settings = await prisma.paymentProviderSetting.findUnique({ where: { id: 1 } });
    assert.ok(settings?.stripeSecretKeyEncrypted, 'Stripe secret is not configured');
    const key = new EncryptionService(config).decrypt(settings.stripeSecretKeyEncrypted).trim();
    const client = new Stripe(key, { timeout: 10000, maxNetworkRetries: 0 });
    const service = new CurrenciesService(config);
    const options = await service.options(client, '8.8.8.8');
    assert.ok(options.currencies.includes('USD'));
    const quote = await service.quote(500, 'USD', client);
    assert.equal(service.verify(quote.token, new Prisma.Decimal(500)).amount, quote.amount);
    await prisma.payment.findFirst({ select: { checkoutCurrency: true, checkoutAmount: true, checkoutRate: true, checkoutRateAt: true } });
    console.log('Currency smoke passed: account-supported currencies=' + options.currencies.length + ', signed USD quote and database columns verified. No private keys printed.');
    if (process.env.CURRENCY_HTTP_SMOKE === '1') {
      const response = await fetch('http://127.0.0.1:4000/api/v1/payments/currencies', { signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /no-store/);
      const actualOptions = await response.json();
      assert.ok(actualOptions.currencies.includes('USD'));
      const quoted = await fetch('http://127.0.0.1:4000/api/v1/payments/currency-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountMxn: 500, currency: 'USD' }), signal: AbortSignal.timeout(10000) });
      assert.equal(quoted.status, 201);
      const actualQuote = await quoted.json();
      assert.equal(service.verify(actualQuote.token, new Prisma.Decimal(500)).currency, 'USD');
      console.log('Running backend HTTP endpoints verified: currency list, no-store and signed USD quotation.');
    }
    if (process.env.CURRENCY_TEST_SESSION === '1') {
      assert.ok(key.startsWith('sk_test_'), 'Only standard TEST keys may create the smoke session');
      assert.equal(settings.stripeMode, 'TEST');
      let session;
      try {
        session = await client.checkout.sessions.create({
          mode: 'payment', adaptive_pricing: { enabled: false },
          line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: quote.amount, product_data: { name: 'Currency integration smoke (TEST)' } } }],
          success_url: 'http://localhost:3000/checkout/exito', cancel_url: 'http://localhost:3000/mi-aprendizaje/pedidos',
          custom_text: { submit: { message: 'Cobro en USD. Para elegir otra moneda, usa Volver y cámbiala en el sitio antes de pagar.' } },
        });
        assert.equal(session.currency, 'usd');
        assert.equal(session.amount_total, quote.amount);
        assert.ok(session.url);
        assert.equal(session.adaptive_pricing.enabled, false);
      } finally {
        if (session?.status === 'open') await client.checkout.sessions.expire(session.id);
      }
      console.log('Real Stripe TEST session created, verified in USD and expired. No charge or payment was made.');
    }
  } finally { await prisma.$disconnect(); }
}
run().catch((error) => { console.error('Currency smoke failed: ' + (error.type || error.name || 'Error')); process.exitCode = 1; });
