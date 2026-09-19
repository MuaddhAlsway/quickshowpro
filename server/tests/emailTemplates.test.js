import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildBookingConfirmationEmail,
  buildMovieReminderEmail,
  escapeHtml,
  formatCurrency,
  formatShowDateTime,
  getPosterUrl,
} from "../utils/emailTemplates.js";

// ======================================================
// escapeHtml
// ======================================================

test("escapes HTML special characters", () => {
  assert.equal(
    escapeHtml(`<script>alert("x'&y")</script>`),
    "&lt;script&gt;alert(&quot;x&#39;&amp;y&quot;)&lt;/script&gt;"
  );
});

test("coerces null and undefined to empty string", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

// ======================================================
// formatCurrency
// ======================================================

test("formats usd amounts without hardcoding the symbol", () => {
  assert.equal(formatCurrency(1495, "usd"), "$1,495");
  assert.equal(formatCurrency(299, "usd"), "$299");
});

test("falls back gracefully for unknown currency codes", () => {
  assert.match(formatCurrency(100, "xyz"), /XYZ/);
});

// ======================================================
// formatShowDateTime
// ======================================================

test("formats show time in the requested timezone", () => {
  const formatted = formatShowDateTime(
    "2026-09-21T20:00:00.000Z",
    "Asia/Riyadh"
  );

  // Riyadh is UTC+3 → 2026-09-21 23:00 local.
  assert.match(formatted, /September 21, 2026/);
  assert.match(formatted, /11:00 PM/);
});

test("returns empty string for an invalid date", () => {
  assert.equal(formatShowDateTime("garbage"), "");
});

// ======================================================
// getPosterUrl
// ======================================================

test("builds a poster URL from a TMDB path", () => {
  assert.equal(
    getPosterUrl("/abc123.jpg"),
    "https://image.tmdb.org/t/p/w500/abc123.jpg"
  );
});

test("passes absolute poster URLs through unchanged", () => {
  assert.equal(
    getPosterUrl("https://cdn.example.com/p.jpg"),
    "https://cdn.example.com/p.jpg"
  );
});

test("returns null when no poster path is available", () => {
  assert.equal(getPosterUrl(""), null);
  assert.equal(getPosterUrl(null), null);
});

// ======================================================
// buildBookingConfirmationEmail
// ======================================================

const CONFIRM_INPUT = {
  userName: "John <Doe>",
  movieTitle: "Dune: Part Two",
  posterPath: "/poster.jpg",
  showDateTime: new Date("2026-09-21T20:00:00.000Z"),
  bookedSeats: ["A1", "A2"],
  amount: 1495,
  currency: "usd",
  bookingId: "6aae1ff75aaebbe656bbeb65",
};

test("confirmation email subject is correct", () => {
  const { subject } =
    buildBookingConfirmationEmail(
      CONFIRM_INPUT
    );

  assert.equal(
    subject,
    "Booking Confirmed - Dune: Part Two"
  );
});

test("confirmation email mentions name, seats, amount and reference", () => {
  const { html } =
    buildBookingConfirmationEmail(
      CONFIRM_INPUT
    );

  assert.match(html, /John &lt;Doe&gt;/);
  assert.match(html, /Dune: Part Two/);
  assert.match(html, /A1, A2/);
  assert.match(html, /\$1,495/); // formatted from currency+amount
  assert.match(html, /6aae1ff75aaebbe656bbeb65/);
  assert.match(html, /Paid \/ Confirmed/);
});

test("confirmation email includes total ticket count", () => {
  const { html } =
    buildBookingConfirmationEmail(
      CONFIRM_INPUT
    );

  assert.match(html, /Total tickets/);
  assert.match(html, />\s*2\s*</);
});

test("confirmation email renders the movie poster when available", () => {
  const { html } =
    buildBookingConfirmationEmail(
      CONFIRM_INPUT
    );

  assert.match(
    html,
    /https:\/\/image\.tmdb\.org\/t\/p\/w500\/poster\.jpg/
  );
});

test("confirmation email omits poster when not available", () => {
  const { html } =
    buildBookingConfirmationEmail({
      ...CONFIRM_INPUT,
      posterPath: null,
    });

  assert.doesNotMatch(html, /<img/);
});

// ======================================================
// buildMovieReminderEmail
// ======================================================

const REMINDER_INPUT = {
  userName: "Jane Smith",
  movieTitle: "Dune: Part Two",
  posterPath: "/poster.jpg",
  showDateTime: new Date("2026-09-21T20:00:00.000Z"),
  bookedSeats: ["A1", "A2"],
  bookingId: "6aae1ff75aaebbe656bbeb65",
};

test("24h reminder subject is correct", () => {
  const { subject } = buildMovieReminderEmail(
    { type: "24h" },
    REMINDER_INPUT
  );

  assert.equal(
    subject,
    "Your movie starts tomorrow — QuickShow"
  );
});

test("2h reminder subject is correct", () => {
  const { subject } = buildMovieReminderEmail(
    { type: "2h" },
    REMINDER_INPUT
  );

  assert.equal(
    subject,
    "Your movie starts in 2 hours — QuickShow"
  );
});

test("24h reminder includes cinema details and seats", () => {
  const { html } = buildMovieReminderEmail(
    { type: "24h" },
    REMINDER_INPUT
  );

  assert.match(html, /Dune: Part Two/);
  assert.match(html, /A1, A2/);
  assert.match(html, /6aae1ff75aaebbe656bbeb65/);
  assert.match(html, /arrive 15/);
});

test("2h reminder includes cinema details and preparation note", () => {
  const { html } = buildMovieReminderEmail(
    { type: "2h" },
    REMINDER_INPUT
  );

  assert.match(html, /Dune: Part Two/);
  assert.match(html, /A1, A2/);
  assert.match(html, /get ready for the show/i);
});

test("reminder emails never inject raw HTML from dynamic fields", () => {
  const { html } = buildMovieReminderEmail(
    { type: "2h" },
    {
      ...REMINDER_INPUT,
      userName: "<img src=x onerror=alert(1)>",
    }
  );

  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});