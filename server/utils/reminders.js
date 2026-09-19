// ======================================================
// MOVIE REMINDER SCHEDULING
//
// Reminders are scheduled after a booking is confirmed as
// paid. Each reminder is:
//
//   1. Persisted as a "pending" EmailEvent (unique per
//      booking + kind) so it can never be double-sent.
//   2. Dispatched as an Inngest event scheduled with `ts`
//      so delivery fires at (showStart - lead), not via
//      setTimeout in application memory.
//
// If a booking is confirmed less than the lead time before
// the show, that reminder is skipped.
// ======================================================

import { inngest } from "../configs/inngest.js";

import {
  EMAIL_KIND_REMINDER_24H,
  EMAIL_KIND_REMINDER_2H,
  enqueueEmail,
} from "./paymentSync.js";

export const REMINDER_EVENTS = {
  [EMAIL_KIND_REMINDER_24H]:
    "app/movie-reminder.24h",
  [EMAIL_KIND_REMINDER_2H]:
    "app/movie-reminder.2h",
};

export const REMINDER_LEAD_MS = {
  [EMAIL_KIND_REMINDER_24H]:
    24 * 60 * 60 * 1000,
  [EMAIL_KIND_REMINDER_2H]:
    2 * 60 * 60 * 1000,
};

// ======================================================
// COMPUTE REMINDER SCHEDULE
//
// Pure decision function (no I/O) so it is unit-testable.
//
// Returns:
//
//   { schedule: Date|null, skip: string|null }
//
// The reminder is schedulable when the target time
// (showStart - lead) is still in the future relative to
// `now`.
// ======================================================

export const computeReminderSchedule = ({
  showDateTime,
  kind,
  now = new Date(),
}) => {
  const showMs = new Date(
    showDateTime
  ).getTime();

  if (!Number.isFinite(showMs)) {
    return {
      schedule: null,
      skip: "invalid-show-date-time",
    };
  }

  if (showMs <= now.getTime()) {
    return {
      schedule: null,
      skip: "show-already-started",
    };
  }

  const lead = REMINDER_LEAD_MS[kind];

  if (!lead) {
    return {
      schedule: null,
      skip: "unknown-reminder-kind",
    };
  }

  const targetMs = showMs - lead;

  if (targetMs <= now.getTime()) {
    return {
      schedule: null,
      skip:
        kind === EMAIL_KIND_REMINDER_24H
          ? "booking-made-inside-24h-window"
          : "booking-made-inside-2h-window",
    };
  }

  return {
    schedule: new Date(targetMs),
    skip: null,
  };
};

export const getReminderEventName = (kind) =>
  REMINDER_EVENTS[kind] || null;

// ======================================================
// SCHEDULE ALL REMINDERS FOR A BOOKING
//
//  1. Enqueue a pending EmailEvent for each eligible kind
//     (idempotent — an existing record is left untouched).
//  2. Send a `ts`-scheduled Inngest event for each
//     eligible kind.
//
// Reminders whose lead target has already passed are
// skipped (e.g. booking made < 24h before the show).
//
// Returns { scheduled: string[], skipped: string[] }.
// ======================================================

export const scheduleMovieReminders = async ({
  bookingId,
  showDateTime,
  now = new Date(),
}) => {
  const id = String(bookingId);

  const kinds = [
    EMAIL_KIND_REMINDER_24H,
    EMAIL_KIND_REMINDER_2H,
  ];

  const scheduled = [];
  const skipped = [];

  for (const kind of kinds) {
    const { schedule, skip } =
      computeReminderSchedule({
        showDateTime,
        kind,
        now,
      });

    if (!schedule) {
      skipped.push({
        kind,
        reason: skip,
      });

      continue;
    }

    await enqueueEmail(id, kind);

    await inngest.send({
      name: getReminderEventName(kind),
      data: {
        bookingId: id,
      },
      ts: schedule.getTime(),
    });

    scheduled.push({
      kind,
      at: schedule.toISOString(),
    });
  }

  return {
    scheduled,
    skipped,
  };
};