/**
 * CopyCraft — Order Timestamp Formatting Test Suite
 * -------------------------------------------------
 * Validates canonical timestamp resolution, edge cases, error handling,
 * and human-readable format specifications across all roles.
 */

import assert from 'node:assert';
import { formatOrderDate } from './src/utils/dateUtils.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL ${desc}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   CopyCraft — Order Creation Timestamp Formatting Test Suite   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. Direct ISO string formatting
it('Formats a valid ISO timestamp to readable Day Mon Year, Time AM/PM format', () => {
  const formatted = formatOrderDate('2026-10-23T14:15:00.000Z');
  assert.match(formatted, /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+2026,\s+\d{1,2}:\d{2}\s+(AM|PM)/);
});

// 2. Order object with createdAt
it('Extracts and formats canonical order.createdAt', () => {
  const order = {
    id: 'ORD-2026-101',
    createdAt: '2026-10-23T19:45:00.000Z',
    orderStatus: 'PRINTING'
  };
  const formatted = formatOrderDate(order);
  assert(formatted.length > 0);
  assert(formatted.includes('2026'));
  assert(formatted.includes(':'));
});

// 3. Order object with missing createdAt but timeline event
it('Falls back to original creation timeline event if createdAt is missing', () => {
  const order = {
    id: 'ORD-2026-102',
    timeline: [
      { status: 'CREATED', time: '2026-10-23T08:30:00.000Z', note: 'Order placed' },
      { status: 'PRINTING', time: '2026-10-23T09:00:00.000Z', note: 'Started printing' }
    ]
  };
  const formatted = formatOrderDate(order);
  assert(formatted.length > 0);
  assert(formatted.includes('2026'));
});

// 4. Missing or undefined dates
it('Handles null, undefined, or empty order without throwing or fabricating', () => {
  assert.strictEqual(formatOrderDate(null), '');
  assert.strictEqual(formatOrderDate(undefined), '');
  assert.strictEqual(formatOrderDate({}), '');
  assert.strictEqual(formatOrderDate({ id: 'ORD-NO-DATE' }), '');
  assert.strictEqual(formatOrderDate(null, { fallback: '—' }), '—');
});

// 5. Invalid date values
it('Gracefully handles invalid date string without rendering "Invalid Date"', () => {
  const formatted = formatOrderDate('not-a-valid-date');
  assert.strictEqual(formatted, '');
  assert(!formatted.includes('Invalid Date'));

  const withFallback = formatOrderDate({ createdAt: 'corrupted-timestamp' }, { fallback: 'N/A' });
  assert.strictEqual(withFallback, 'N/A');
});

// 6. Never fabricates current time
it('Never fabricates current time when order timestamp is absent', () => {
  const emptyOrder = { id: 'ORD-EMPTY', orderStatus: 'DELIVERED' };
  const res = formatOrderDate(emptyOrder);
  assert.strictEqual(res, '', 'Must not generate current date when absent');
});

console.log(`\n════════════════════════════════════════════════════════════════`);
console.log(`Results: ${passed} / ${total} checks passed`);
if (passed === total) {
  console.log('🎉 ALL TIMESTAMP FORMATTING TESTS PASSED!\n');
} else {
  process.exit(1);
}
