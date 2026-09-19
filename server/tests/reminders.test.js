import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EMAIL_KIND_REMINDER_24H,
  EMAIL_KIND_REMINDER_2H,
} from "../utils/paymentSync.js";

import {
  computeReminderSchedule,
  getReminderEventName,
} from "../utils/reminders.js";

const SHOW = new Date(
  "2026-09-21T20:00:00.000Z"
).getTime();

// ======================================================
// computeReminderSchedule
// ======================================================

test("24h reminder schedules 24h before a far-future show", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: SHOW,
      kind: EMAIL_KIND_REMINDER_24H,
      now: new Date(SHOW - 48 * 60 * 60 * 1000),
    });

  assert.equal(skip, null);
  assert.ok(schedule);
  assert.equal(
    schedule.getTime(),
    SHOW - 24 * 60 * 60 * 1000
  );
});

test("2h reminder schedules 2h before a far-future show", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: SHOW,
      kind: EMAIL_KIND_REMINDER_2H,
      now: new Date(SHOW - 48 * 60 * 60 * 1000),
    });

  assert.equal(skip, null);
  assert.ok(schedule);
  assert.equal(
    schedule.getTime(),
    SHOW - 2 * 60 * 60 * 1000
  );
});

test("skips the 24h reminder when booked within 24h of the show", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: SHOW,
      kind: EMAIL_KIND_REMINDER_24H,
      now: new Date(SHOW - 12 * 60 * 60 * 1000),
    });

  assert.equal(schedule, null);
  assert.equal(
    skip,
    "booking-made-inside-24h-window"
  );
});

test("skips the 2h reminder when booked within 2h of the show", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: SHOW,
      kind: EMAIL_KIND_REMINDER_2H,
      now: new Date(SHOW - 60 * 60 * 1000),
    });

  assert.equal(schedule, null);
  assert.equal(
    skip,
    "booking-made-inside-2h-window"
  );
});

test("2h reminder still schedules when the 24h window has passed", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: SHOW,
      kind: EMAIL_KIND_REMINDER_2H,
      now: new Date(SHOW - 12 * 60 * 60 * 1000),
    });

  assert.equal(skip, null);
  assert.ok(schedule);
});

test("never schedules a reminder for a show that already started", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: SHOW,
      kind: EMAIL_KIND_REMINDER_2H,
      now: new Date(SHOW + 5 * 60 * 1000),
    });

  assert.equal(schedule, null);
  assert.equal(skip, "show-already-started");
});

test("never schedules a reminder for an invalid show time", () => {
  const { schedule, skip } =
    computeReminderSchedule({
      showDateTime: "not-a-date",
      kind: EMAIL_KIND_REMINDER_24H,
    });

  assert.equal(schedule, null);
  assert.equal(skip, "invalid-show-date-time");
});

// ======================================================
// getReminderEventName
// ======================================================

test("maps reminder kinds to their Inngest event names", () => {
  assert.equal(
    getReminderEventName(EMAIL_KIND_REMINDER_24H),
    "app/movie-reminder.24h"
  );

  assert.equal(
    getReminderEventName(EMAIL_KIND_REMINDER_2H),
    "app/movie-reminder.2h"
  );

  assert.equal(getReminderEventName("nope"), null);
});