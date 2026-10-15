// Run after `npm run build` from backend. All fixture data and queued email are rolled back.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { PaidCourseService } = require('../dist/src/paid-course/paid-course.service');
const { SalesService } = require('../dist/src/sales/sales.service');
const { PAID_COURSE } = require('../dist/src/paid-course/paid-course.constants');

const prisma = new PrismaService(new ConfigService());
const rollback = new Error('EXPECTED_TEST_ROLLBACK');
let checks = 0;
async function run() {
  try {
    await prisma.$transaction(async (tx) => {
      const client = new Proxy(tx, { get(target, key) { return key === '$transaction' ? (fn) => fn(tx) : target[key]; } });
      const course = new PaidCourseService(client, new ConfigService());
      // Keep the integration test runnable after the enrollment period without changing production dates.
      course.publicOffer = () => ({ ...PAID_COURSE, registrationOpen: true });
      const sales = new SalesService(client, {}, new ConfigService(), { sendEvent() { throw new Error('Unexpected direct email'); } }, course);
      await tx.contactSetting.upsert({ where: { id: 1 }, create: { id: 1, recipientEmail: 'test-owner@example.invalid' }, update: { recipientEmail: 'test-owner@example.invalid' } });
      await tx.paymentProviderSetting.upsert({ where: { id: 1 }, create: { id: 1, bankTransferEnabled: true }, update: { bankTransferEnabled: true } });
      const suffix = randomUUID();
      const student = await tx.user.create({ data: { email: `installments-${suffix}@example.invalid`, firstName: 'Integration', lastName: 'Test', passwordHash: 'not-a-login-credential', status: 'ACTIVE' } });
      const checkout = await sales.checkout(student.id, 'BANK_TRANSFER', undefined, 'asistente-ia', 'INSTALLMENTS');
      assert.equal(Number(checkout.order.total), 500);
      assert.equal(await tx.order.count({ where: { userId: student.id } }), 1); checks++;
      await sales.approveBankTransfer(checkout.order.id);
      await sales.approveBankTransfer(checkout.order.id);
      let plan = await tx.coursePaymentPlan.findUniqueOrThrow({ where: { userId_courseId: { userId: student.id, courseId: PAID_COURSE.courseId } }, include: { orders: { orderBy: { installmentNumber: 'asc' } } } });
      assert.equal(plan.orders.length, 3);
      assert.deepEqual(plan.orders.map((order) => Number(order.total)), [500, 990, 990]);
      assert.ok(plan.activatedAt);
      assert.equal(await tx.enrollment.count({ where: { userId: student.id, courseId: PAID_COURSE.courseId, status: 'ACTIVE' } }), 1);
      assert.equal(await tx.emailQueue.count({ where: { userId: student.id, event: 'PAID_COURSE_ENROLLED' } }), 1);
      assert.equal(await tx.emailQueue.count({ where: { userId: student.id, event: 'PAID_COURSE_ADMIN_NOTIFICATION' } }), 1); checks++;
      await tx.coursePaymentPlan.update({ where: { id: plan.id }, data: { lastReminderAt: new Date(Date.now() - 8 * 86400000) } });
      await tx.order.updateMany({ where: { paymentPlanId: plan.id, installmentNumber: { gt: 1 } }, data: { dueAt: new Date(Date.now() + 86400000) } });
      await course.queueWeeklyReminders(); await course.queueWeeklyReminders();
      assert.equal(await tx.emailQueue.count({ where: { userId: student.id, event: 'PAID_COURSE_PAYMENT_REMINDER' } }), 1); checks++;
      for (const order of plan.orders.slice(1)) await sales.approveBankTransfer(order.id);
      plan = await tx.coursePaymentPlan.findUniqueOrThrow({ where: { id: plan.id } });
      assert.ok(plan.completedAt);
      assert.equal(await tx.order.count({ where: { paymentPlanId: plan.id, status: 'PAID' } }), 3);
      assert.equal(await tx.emailQueue.count({ where: { userId: student.id, event: 'PAID_COURSE_PAYMENT_RECEIVED' } }), 2); checks++;
      const cashStudent = await tx.user.create({ data: { email: `cash-${suffix}@example.invalid`, firstName: 'Cash', lastName: 'Test', passwordHash: 'not-a-login-credential', status: 'ACTIVE' } });
      const cash = await sales.checkout(cashStudent.id, 'BANK_TRANSFER', undefined, 'asistente-ia', 'FULL');
      assert.equal(Number(cash.order.total), 1790);
      await sales.approveBankTransfer(cash.order.id);
      const cashPlan = await tx.coursePaymentPlan.findUniqueOrThrow({ where: { userId_courseId: { userId: cashStudent.id, courseId: PAID_COURSE.courseId } }, include: { orders: true } });
      assert.ok(cashPlan.completedAt); assert.equal(cashPlan.orders.length, 1); checks++;
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log(`${checks} integration checks passed; all users, orders, enrollments and email fixtures rolled back. No email was sent.`);
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
