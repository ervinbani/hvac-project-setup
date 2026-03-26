/**
 * Brillo - Seed Script
 * Populates the DB (real or in-memory) with realistic fake data.
 *
 * Usage:
 *   npm run seed              → seeds real DB (uses MONGODB_URI from .env)
 *   npm run seed:mock         → starts in-memory DB, seeds, then keeps server running
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');
const Customer = require('../src/models/Customer');
const Service = require('../src/models/Service');
const Job = require('../src/models/Job');
const RecurringRule = require('../src/models/RecurringRule');
const Invoice = require('../src/models/Invoice');
const MessageLog = require('../src/models/MessageLog');
const AutomationRule = require('../src/models/AutomationRule');
const AuditLog = require('../src/models/AuditLog');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ─── Raw data ─────────────────────────────────────────────────────────────────

const FIRST_NAMES = ['Maria', 'James', 'Sofia', 'Carlos', 'Emily', 'Luis', 'Ashley', 'Miguel', 'Jennifer', 'Diego', 'Patricia', 'Roberto', 'Sandra', 'Kevin', 'Rosa'];
const LAST_NAMES  = ['Garcia', 'Johnson', 'Martinez', 'Williams', 'Lopez', 'Brown', 'Hernandez', 'Davis', 'Gonzalez', 'Miller', 'Rodriguez', 'Wilson', 'Perez', 'Moore', 'Torres'];
const STREETS     = ['Oak Street', 'Maple Ave', 'Pine Rd', 'Cedar Blvd', 'Elm St', 'Sunset Dr', 'Lake View Ln', 'Park Ave', 'River Rd', 'Mountain View Dr'];
const CITIES      = ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'];
const ZIP_CODES   = ['33101', '33102', '33103', '32801', '33601', '32202', '33301'];

const fakePerson = (i) => ({
  firstName: FIRST_NAMES[i % FIRST_NAMES.length],
  lastName:  LAST_NAMES[i % LAST_NAMES.length],
});

const fakeAddress = () => ({
  street:  `${randInt(100, 9999)} ${randItem(STREETS)}`,
  city:    randItem(CITIES),
  state:   'FL',
  zipCode: randItem(ZIP_CODES),
  country: 'US',
  location: {
    lat: 25.7617 + (Math.random() - 0.5) * 0.5,
    lng: -80.1918 + (Math.random() - 0.5) * 0.5,
  },
});

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  // ── 1. Tenant ──────────────────────────────────────────────────────────────
  console.log('🌱 Seeding tenant...');
  const tenant = await Tenant.create({
    name: 'Brillo Cleaning Co.',
    slug: 'brillo',
    businessType: 'cleaning',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es'],
    timezone: 'America/New_York',
    contactEmail: 'owner@brillocleaning.com',
    contactPhone: '+13055550100',
    branding: { primaryColor: '#4F46E5' },
    address: {
      street: '1200 Brickell Ave',
      city: 'Miami',
      state: 'FL',
      zipCode: '33131',
      country: 'US',
    },
    subscription: {
      plan: 'pro',
      status: 'active',
      renewalDate: daysFromNow(30),
    },
  });
  const tid = tenant._id;
  console.log(`   ✅ Tenant: ${tenant.name} (${tid})`);

  // ── 2. Users ───────────────────────────────────────────────────────────────
  console.log('🌱 Seeding users...');
  const seedPassword = process.env.SEED_PASSWORD || 'Dev@Brillo2026!';
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const usersData = [
    { firstName: 'Alex',    lastName: 'Brillo',   email: 'owner@brillocleaning.com',   role: 'owner',   phone: '+13055550100', preferredLanguage: 'en' },
    { firstName: 'Laura',   lastName: 'Vega',     email: 'manager@brillocleaning.com', role: 'manager', phone: '+13055550101', preferredLanguage: 'en' },
    { firstName: 'Carlos',  lastName: 'Ruiz',     email: 'carlos@brillocleaning.com',  role: 'cleaner', phone: '+13055550102', preferredLanguage: 'es' },
    { firstName: 'Ana',     lastName: 'Morales',  email: 'ana@brillocleaning.com',     role: 'cleaner', phone: '+13055550103', preferredLanguage: 'es' },
    { firstName: 'Michael', lastName: 'Thompson', email: 'mike@brillocleaning.com',    role: 'cleaner', phone: '+13055550104', preferredLanguage: 'en' },
  ];

  const users = await User.insertMany(
    usersData.map((u) => ({ ...u, tenantId: tid, passwordHash, isActive: true, lastLoginAt: daysAgo(randInt(0, 5)) }))
  );
  console.log(`   ✅ ${users.length} users created`);
  const [owner, manager, cleaner1, cleaner2, cleaner3] = users;

  // ── 3. Services ───────────────────────────────────────────────────────────
  console.log('🌱 Seeding services...');
  const servicesData = [
    { name: { en: 'Standard Cleaning',   es: 'Limpieza Estándar'  }, description: { en: 'Full home clean', es: 'Limpieza completa del hogar' }, durationMinutes: 120, basePrice: 120 },
    { name: { en: 'Deep Cleaning',       es: 'Limpieza Profunda'  }, description: { en: 'Deep scrub & sanitize', es: 'Limpieza profunda y sanitización' }, durationMinutes: 240, basePrice: 220 },
    { name: { en: 'Move-In / Move-Out',  es: 'Entrada / Salida'   }, description: { en: 'Full clean for move', es: 'Limpieza completa para mudanza' }, durationMinutes: 300, basePrice: 280 },
    { name: { en: 'Office Cleaning',     es: 'Limpieza de Oficina' }, description: { en: 'Commercial office clean', es: 'Limpieza de oficina comercial' }, durationMinutes: 90, basePrice: 95 },
    { name: { en: 'Post-Construction',   es: 'Post-Construcción'  }, description: { en: 'Clean after renovation', es: 'Limpieza después de remodelación' }, durationMinutes: 360, basePrice: 350 },
  ];
  const services = await Service.insertMany(
    servicesData.map((s) => ({ ...s, tenantId: tid, isActive: true }))
  );
  console.log(`   ✅ ${services.length} services created`);

  // ── 4. Customers ──────────────────────────────────────────────────────────
  console.log('🌱 Seeding customers...');
  const customerStatuses = ['active', 'active', 'active', 'lead', 'inactive'];
  const sources          = ['manual', 'website', 'phone', 'referral', 'google', 'facebook'];

  const customersData = Array.from({ length: 20 }, (_, i) => {
    const { firstName, lastName } = fakePerson(i);
    return {
      tenantId:          tid,
      firstName,
      lastName,
      email:             `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
      phone:             `+1305555${String(i + 200).padStart(4, '0')}`,
      preferredLanguage: i % 3 === 0 ? 'es' : 'en',
      address:           fakeAddress(),
      notes:             i % 4 === 0 ? 'Prefers afternoon appointments' : undefined,
      tags:              i % 2 === 0 ? ['vip'] : ['regular'],
      status:            customerStatuses[i % customerStatuses.length],
      source:            sources[i % sources.length],
    };
  });
  const customers = await Customer.insertMany(customersData);
  console.log(`   ✅ ${customers.length} customers created`);

  // ── 5. Recurring Rules ────────────────────────────────────────────────────
  console.log('🌱 Seeding recurring rules...');
  const recurringData = customers.slice(0, 6).map((c, i) => ({
    tenantId:   tid,
    customerId: c._id,
    serviceId:  services[i % 2]._id,
    frequency:  ['weekly', 'biweekly', 'monthly'][i % 3],
    dayOfWeek:  (i + 1) % 7,
    startDate:  daysAgo(30),
    endDate:    daysFromNow(180),
    isActive:   true,
  }));
  const recurringRules = await RecurringRule.insertMany(recurringData);
  console.log(`   ✅ ${recurringRules.length} recurring rules created`);

  // ── 6. Jobs ───────────────────────────────────────────────────────────────
  console.log('🌱 Seeding jobs...');

  const jobStatuses = ['completed', 'completed', 'scheduled', 'confirmed', 'in_progress', 'canceled', 'no_show'];
  const checklistItems = [
    { label: { en: 'Vacuum all floors',    es: 'Aspirar todos los pisos'        } },
    { label: { en: 'Clean bathrooms',      es: 'Limpiar baños'                  } },
    { label: { en: 'Wipe kitchen surfaces',es: 'Limpiar superficies de cocina'  } },
    { label: { en: 'Mop floors',           es: 'Trapear pisos'                  } },
    { label: { en: 'Take out trash',       es: 'Sacar la basura'                } },
  ];

  const jobsData = Array.from({ length: 30 }, (_, i) => {
    const customer  = customers[i % customers.length];
    const service   = services[i % services.length];
    const status    = jobStatuses[i % jobStatuses.length];
    const daysOffset = i < 15 ? -(15 - i) : (i - 15);  // past & future jobs
    const start     = daysFromNow(daysOffset);
    start.setHours(8 + (i % 4) * 2, 0, 0, 0);
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    const assignedTo = [cleaner1, cleaner2, cleaner3][i % 3];

    return {
      tenantId:        tid,
      customerId:      customer._id,
      serviceId:       service._id,
      title:           `${service.name.en} @ ${customer.address?.city || 'Miami'}`,
      propertyAddress: customer.address,
      scheduledStart:  start,
      scheduledEnd:    end,
      status,
      assignedUsers:   [assignedTo._id],
      checklist:       checklistItems.map((item) => ({ ...item, completed: status === 'completed' })),
      notesInternal:   i % 5 === 0 ? 'Client has a dog, be careful with the door' : undefined,
      notesCustomer:   i % 7 === 0 ? 'Please use eco-friendly products' : undefined,
      recurringRuleId: i < 6 ? recurringRules[i]._id : undefined,
      price:           service.basePrice,
    };
  });

  const jobs = await Job.insertMany(jobsData);
  console.log(`   ✅ ${jobs.length} jobs created`);

  // ── 7. Invoices ───────────────────────────────────────────────────────────
  console.log('🌱 Seeding invoices...');
  const invoiceStatuses = ['paid', 'paid', 'sent', 'draft', 'overdue'];
  const paymentMethods  = ['cash', 'card', 'stripe', 'bank_transfer'];

  const invoicesData = jobs.slice(0, 20).map((job, i) => {
    const subtotal = job.price;
    const tax      = parseFloat((subtotal * 0.07).toFixed(2));
    const total    = parseFloat((subtotal + tax).toFixed(2));
    const status   = invoiceStatuses[i % invoiceStatuses.length];
    const isPaid   = status === 'paid';

    return {
      tenantId:      tid,
      customerId:    job.customerId,
      jobId:         job._id,
      invoiceNumber: `INV-BRILLO-${String(i + 1).padStart(5, '0')}`,
      items: [
        {
          description: `Cleaning service`,
          quantity:    1,
          unitPrice:   subtotal,
          total:       subtotal,
        },
      ],
      subtotal,
      tax,
      total,
      currency:      'USD',
      status,
      dueDate:       daysFromNow(14 - i),
      paidAt:        isPaid ? daysAgo(randInt(1, 10)) : undefined,
      paymentMethod: isPaid ? randItem(paymentMethods) : undefined,
    };
  });

  const invoices = await Invoice.insertMany(invoicesData);
  console.log(`   ✅ ${invoices.length} invoices created`);

  // Link invoices back to jobs
  await Promise.all(
    invoices.map((inv) => Job.findByIdAndUpdate(inv.jobId, { invoiceId: inv._id }))
  );

  // ── 8. Message Logs ────────────────────────────────────────────────────────
  console.log('🌱 Seeding message logs...');
  const msgStatuses  = ['sent', 'delivered', 'failed', 'opened'];
  const channels     = ['sms', 'email'];
  const templateKeys = ['job_reminder', 'job_confirmation', 'invoice_sent', 'job_completed'];

  const messagesData = Array.from({ length: 25 }, (_, i) => {
    const customer = customers[i % customers.length];
    const job      = jobs[i % jobs.length];
    const channel  = channels[i % 2];
    const lang     = customer.preferredLanguage;
    const tKey     = templateKeys[i % templateKeys.length];

    return {
      tenantId:          tid,
      customerId:        customer._id,
      jobId:             job._id,
      channel,
      direction:         'outbound',
      language:          lang,
      templateKey:       tKey,
      subject:           channel === 'email' ? `Your cleaning appointment reminder` : undefined,
      body:              lang === 'es'
        ? `Hola ${customer.firstName}, recordatorio de su cita de limpieza.`
        : `Hi ${customer.firstName}, reminder about your upcoming cleaning appointment.`,
      provider:          channel === 'sms' ? 'twilio' : 'sendgrid',
      providerMessageId: `MSG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      status:            msgStatuses[i % msgStatuses.length],
    };
  });

  const messages = await MessageLog.insertMany(messagesData);
  console.log(`   ✅ ${messages.length} message logs created`);

  // ── 9. Automation Rules ────────────────────────────────────────────────────
  console.log('🌱 Seeding automation rules...');
  const automationsData = [
    { name: 'Job Reminder 24h (SMS)',  trigger: 'job_reminder_24h', channel: 'sms',   templateKey: 'job_reminder',    isActive: true },
    { name: 'Job Confirmation (Email)',trigger: 'job_created',      channel: 'email', templateKey: 'job_confirmation', isActive: true },
    { name: 'Job Completed (SMS)',     trigger: 'job_completed',    channel: 'sms',   templateKey: 'job_completed',   isActive: true },
    { name: 'Invoice Overdue (Email)', trigger: 'invoice_overdue',  channel: 'email', templateKey: 'invoice_overdue', isActive: false },
  ];
  const automations = await AutomationRule.insertMany(
    automationsData.map((a) => ({ ...a, tenantId: tid }))
  );
  console.log(`   ✅ ${automations.length} automation rules created`);

  // ── 10. Audit Logs ─────────────────────────────────────────────────────────
  console.log('🌱 Seeding audit logs...');
  const auditData = [
    { userId: owner._id,   entityType: 'Tenant',   entityId: tenant._id,   action: 'tenant.updated',   metadata: { field: 'subscription.plan', from: 'trial', to: 'pro' } },
    { userId: manager._id, entityType: 'Job',       entityId: jobs[0]._id,  action: 'job.status_changed', metadata: { from: 'scheduled', to: 'completed' } },
    { userId: owner._id,   entityType: 'User',      entityId: cleaner1._id, action: 'user.created',     metadata: { role: 'cleaner' } },
    { userId: manager._id, entityType: 'Invoice',   entityId: invoices[0]._id, action: 'invoice.sent', metadata: { invoiceNumber: invoices[0].invoiceNumber } },
    { userId: owner._id,   entityType: 'Customer',  entityId: customers[0]._id, action: 'customer.created', metadata: { source: 'website' } },
  ];
  await AuditLog.insertMany(auditData.map((a) => ({ ...a, tenantId: tid })));
  console.log(`   ✅ ${auditData.length} audit log entries created`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log('─'.repeat(40));
  console.log(`  Tenant:          ${tenant.name}`);
  console.log(`  Users:           ${users.length}`);
  console.log(`  Customers:       ${customers.length}`);
  console.log(`  Services:        ${services.length}`);
  console.log(`  Jobs:            ${jobs.length}`);
  console.log(`  Recurring Rules: ${recurringRules.length}`);
  console.log(`  Invoices:        ${invoices.length}`);
  console.log(`  Messages:        ${messages.length}`);
  console.log(`  Automations:     ${automations.length}`);
  console.log('─'.repeat(40));
  console.log('\n🔑 Seeded user emails (use SEED_PASSWORD env var or default dev password):');
  usersData.forEach((u) => console.log(`  ${u.role.padEnd(10)} → ${u.email}`));
}

module.exports = seed;
