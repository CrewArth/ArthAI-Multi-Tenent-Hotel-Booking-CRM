import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWindow, overlappingQuery, parseEventDate, rangeBounds } from '../utils/banquetSchedule.js';

const hall = {
  availableFrom: '09:00', availableUntil: '23:00', timeIncrement: 30,
  minimumBookingDuration: 60, setupBufferMinutes: 60, cleanupBufferMinutes: 30,
  allowedEventTypes: ['Wedding'], capacities: [{ layout: 'Theatre', guests: 250 }],
};
const request = { eventDate: '2026-11-15', startTime: '10:00', endTime: '13:00', eventType: 'Wedding', layout: 'Theatre', expectedGuests: 200 };

test('uses one time interval with setup and cleanup buffers', () => {
  const window = buildWindow(hall, request);
  assert.equal(window.startAt.toISOString(), '2026-11-15T10:00:00.000Z');
  assert.equal(window.endAt.toISOString(), '2026-11-15T13:00:00.000Z');
  assert.equal(window.effectiveStartAt.toISOString(), '2026-11-15T09:00:00.000Z');
  assert.equal(window.effectiveEndAt.toISOString(), '2026-11-15T13:30:00.000Z');
});

test('overlap query allows adjacent effective intervals but catches intersecting ones', () => {
  const window = buildWindow(hall, request);
  const query = overlappingQuery('hall-1', window);
  const overlaps = (start, end) => start < query.effectiveStartAt.$lt && end > query.effectiveEndAt.$gt;
  assert.equal(overlaps(new Date('2026-11-15T13:30:00.000Z'), new Date('2026-11-15T15:00:00.000Z')), false);
  assert.equal(overlaps(new Date('2026-11-15T13:29:00.000Z'), new Date('2026-11-15T15:00:00.000Z')), true);
  assert.equal(overlaps(new Date('2026-11-15T07:00:00.000Z'), new Date('2026-11-15T09:00:00.000Z')), false);
});

test('buffers remain effective across midnight', () => {
  const window = buildWindow({ ...hall, availableFrom: '00:00', availableUntil: '23:59', setupBufferMinutes: 45 }, { ...request, startTime: '00:30', endTime: '01:30' });
  assert.equal(window.effectiveStartAt.toISOString(), '2026-11-14T23:45:00.000Z');
});

test('rejects capacity, event type, operating hours, duration, and increment violations', () => {
  assert.match(buildWindow(hall, { ...request, expectedGuests: 251 }).reason, /layout/);
  assert.match(buildWindow(hall, { ...request, eventType: 'Conference' }).reason, /event type/);
  assert.match(buildWindow(hall, { ...request, startTime: '08:30' }).reason, /operating hours/);
  assert.match(buildWindow(hall, { ...request, endTime: '10:30' }).reason, /Minimum/);
  assert.match(buildWindow(hall, { ...request, startTime: '10:15' }).reason, /increments/);
});

test('date ranges reject invalid dates and oversized calendar requests', () => {
  assert.equal(parseEventDate('2026-02-30'), null);
  assert.equal(rangeBounds('2026-11-20', '2026-11-19'), null);
  assert.equal(rangeBounds('2026-01-01', '2026-04-01'), null);
  assert.equal(rangeBounds('2026-11-15', '2026-11-15').endExclusive.toISOString(), '2026-11-16T00:00:00.000Z');
});
