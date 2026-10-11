/**
 * Database Seed Script for BookMe event-booking-service
 *
 * Populates:
 * - 2 distinct customer accounts
 * - Multiple events across various event types and lifecycle phases
 * - Budget allocations and milestone checklists
 * - Bookings covering EVERY state machine status:
 *   PENDING, ACCEPTED, CONFIRMED, COMPLETED, CANCELLED, REJECTED
 * - Complete status transition audit history
 */

const { query, pool } = require('../src/shared/db/pool');
const logger = require('../src/shared/logger');

async function seed() {
  logger.info('Starting BookMe event-booking-service database seeding...');

  try {
    const today = new Date();
    const addDays = (d) =>
      new Date(today.getTime() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ==========================================
    // 1. CUSTOMER 1 EVENTS (usr_123 / usr_customer_1)
    // ==========================================
    const evt1Res = await query(
      `INSERT INTO events (customer_id, name, event_type, event_date, budget, guest_count, city, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id;`,
      ['usr_123', 'Aarav & Maya Grand Wedding', 'Wedding', addDays(45), 500000.0, 200, 'Ahmedabad', 'PLANNING']
    );
    const evt1Id = evt1Res.rows[0].id;

    const evt2Res = await query(
      `INSERT INTO events (customer_id, name, event_type, event_date, budget, guest_count, city, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id;`,
      ['usr_123', 'Kabir Superhero 10th Birthday', 'Birthday', addDays(12), 75000.0, 45, 'Ahmedabad', 'PLANNING']
    );
    const evt2Id = evt2Res.rows[0].id;

    // ==========================================
    // 2. CUSTOMER 2 EVENTS (usr_customer_2)
    // ==========================================
    const evt3Res = await query(
      `INSERT INTO events (customer_id, name, event_type, event_date, budget, guest_count, city, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id;`,
      ['usr_customer_2', 'TechCorp Annual Summit 2027', 'Corporate', addDays(25), 350000.0, 120, 'Gandhinagar', 'PLANNING']
    );
    const evt3Id = evt3Res.rows[0].id;

    const evt4Res = await query(
      `INSERT INTO events (customer_id, name, event_type, event_date, budget, guest_count, city, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id;`,
      ['usr_customer_2', 'Alumni Reunion Gala', 'Social', addDays(-15), 120000.0, 80, 'Mumbai', 'COMPLETED']
    );
    const evt4Id = evt4Res.rows[0].id;

    logger.info('Events seeded successfully.');

    // ==========================================
    // 3. BUDGET ALLOCATIONS
    // ==========================================
    const budgetCategories = [
      ['Venue & Catering', 250000.0, 120000.0],
      ['Photography & Video', 75000.0, 75000.0],
      ['Decoration & Floral', 75000.0, 0.0],
      ['Music & Entertainment', 50000.0, 0.0],
      ['Makeup & Styling', 25000.0, 0.0],
      ['Miscellaneous', 25000.0, 0.0],
    ];

    for (const [cat, planned, actual] of budgetCategories) {
      await query(
        `INSERT INTO event_budget (event_id, category, planned_amount, actual_amount)
         VALUES ($1, $2, $3, $4);`,
        [evt1Id, cat, planned, actual]
      );
    }

    // ==========================================
    // 4. CHECKLIST ITEMS
    // ==========================================
    const checklistItems = [
      ['Finalize Royal Banquet Hall and Menu tasting', 'Venue & Catering', addDays(10), true],
      ['Confirm candid wedding photographer & drone crew', 'Photography & Video', addDays(15), true],
      ['Select floral theme and stage backdrop', 'Decoration & Floral', addDays(25), false],
      ['Book DJ and live acoustic sound setup', 'Music & Entertainment', addDays(-2), false], // Overdue
      ['Finalize bridal makeup trial', 'Makeup & Styling', addDays(30), false],
    ];

    for (const [task, category, dueDate, done] of checklistItems) {
      await query(
        `INSERT INTO event_checklist (event_id, task, category, due_date, done)
         VALUES ($1, $2, $3, $4, $5);`,
        [evt1Id, task, category, dueDate, done]
      );
    }
    logger.info('Budgets and Checklists seeded successfully.');

    // ==========================================
    // 5. BOOKINGS ACROSS EVERY LIFECYCLE STATUS
    // ==========================================
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 5.1 STATUS: PENDING
    const bPending = await query(
      `INSERT INTO bookings (event_id, customer_id, vendor_id, service_id, package_id, category, booking_date,
        vendor_name_snapshot, package_name_snapshot, price_snapshot, status, vendor_response_due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11)
       RETURNING id;`,
      [
        evt1Id,
        'usr_123',
        'vnd_456',
        'svc_decor_1',
        'pkg_royal_decor',
        'Decoration & Floral',
        addDays(45),
        'Blossom & Co. Decorators',
        'Imperial Floral Package',
        75000.0,
        in48h,
      ]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, NULL, 'PENDING', $2, 'Initial booking request submitted by customer');`,
      [bPending.rows[0].id, 'usr_123']
    );

    // 5.2 STATUS: ACCEPTED (Awaiting payment within 24h window)
    const bAccepted = await query(
      `INSERT INTO bookings (event_id, customer_id, vendor_id, service_id, package_id, category, booking_date,
        vendor_name_snapshot, package_name_snapshot, price_snapshot, status, payment_due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACCEPTED', $11)
       RETURNING id;`,
      [
        evt1Id,
        'usr_123',
        'vnd_101',
        'svc_music_1',
        'pkg_dj_sound',
        'Music & Entertainment',
        addDays(45),
        'DJ Sonic Beatbox & Lighting',
        'Deluxe Sangeet Sound Package',
        50000.0,
        in24h,
      ]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, NULL, 'PENDING', 'usr_123', 'Booking inquiry submitted');`,
      [bAccepted.rows[0].id]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'PENDING', 'ACCEPTED', 'vnd_101', 'Vendor accepted and reserved date; payment window opened');`,
      [bAccepted.rows[0].id]
    );

    // 5.3 STATUS: CONFIRMED (Payment processed, contract active)
    const bConfirmed = await query(
      `INSERT INTO bookings (event_id, customer_id, vendor_id, service_id, package_id, category, booking_date,
        vendor_name_snapshot, package_name_snapshot, price_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CONFIRMED')
       RETURNING id;`,
      [
        evt1Id,
        'usr_123',
        'vnd_456',
        'svc_789',
        'pkg_111',
        'Venue & Catering',
        addDays(45),
        'Grand Palace Banquet & Lawn',
        'Royal Wedding Feast Package',
        120000.0,
      ]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, NULL, 'PENDING', 'usr_123', 'Inquiry sent');`,
      [bConfirmed.rows[0].id]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'PENDING', 'ACCEPTED', 'vnd_456', 'Vendor date held');`,
      [bConfirmed.rows[0].id]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'ACCEPTED', 'CONFIRMED', 'SYSTEM', 'Payment confirmed via payment-feedback-service');`,
      [bConfirmed.rows[0].id]
    );

    // 5.4 STATUS: COMPLETED (Service delivered for past event)
    const bCompleted = await query(
      `INSERT INTO bookings (event_id, customer_id, vendor_id, service_id, package_id, category, booking_date,
        vendor_name_snapshot, package_name_snapshot, price_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'COMPLETED')
       RETURNING id;`,
      [
        evt4Id,
        'usr_customer_2',
        'vnd_101',
        'svc_photo_1',
        'pkg_reunion_photo',
        'Photography & Video',
        addDays(-15),
        'Prism Studios',
        'Full Reunion HD Video Package',
        45000.0,
      ]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'CONFIRMED', 'COMPLETED', 'vnd_101', 'Service delivery completed successfully on event date');`,
      [bCompleted.rows[0].id]
    );

    // 5.5 STATUS: CANCELLED (Cancelled by customer with refund reason)
    const bCancelled = await query(
      `INSERT INTO bookings (event_id, customer_id, vendor_id, service_id, package_id, category, booking_date,
        vendor_name_snapshot, package_name_snapshot, price_snapshot, status, cancellation_reason, cancelled_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CANCELLED', 'Change of venue selection', 'usr_123')
       RETURNING id;`,
      [
        evt1Id,
        'usr_123',
        'vnd_456',
        'svc_makeup_1',
        'pkg_bridal_glam',
        'Makeup & Styling',
        addDays(45),
        'Glamour Luxe Studio',
        'Bridal & Family Styling',
        25000.0,
      ]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'PENDING', 'CANCELLED', 'usr_123', 'Change of venue selection');`,
      [bCancelled.rows[0].id]
    );

    // 5.6 STATUS: REJECTED (Declined by vendor due to date conflict)
    const bRejected = await query(
      `INSERT INTO bookings (event_id, customer_id, vendor_id, service_id, package_id, category, booking_date,
        vendor_name_snapshot, package_name_snapshot, price_snapshot, status, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'REJECTED', 'Venue booked for government delegate function')
       RETURNING id;`,
      [
        evt2Id,
        'usr_123',
        'vnd_456',
        'svc_bday_1',
        'pkg_magic_show',
        'Entertainment',
        addDays(12),
        'Starline Entertainment',
        'Magic & Puppet Show',
        15000.0,
      ]
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'PENDING', 'REJECTED', 'vnd_456', 'Venue booked for government delegate function');`,
      [bRejected.rows[0].id]
    );

    logger.info('Bookings seeded across ALL statuses (PENDING, ACCEPTED, CONFIRMED, COMPLETED, CANCELLED, REJECTED).');
    logger.info('🎉 Seeding successfully finished!');
  } catch (err) {
    logger.error(`Database seeding failed: ${err.message}`, { error: err.stack });
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {}
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
