import { Inngest } from "inngest";

// ======================================================
// INNGEST CLIENT
//
// Central instance shared by:
//
// - server/inngest/index.js  (function definitions)
// - Controller/stripeWebhook.js
// - utils/paymentSync.js
// - Controller/bookingController.js
//
// Keeping the client in its own module avoids
// circular imports between the webhook / utilities
// and the Inngest function definitions.
// ======================================================

export const inngest = new Inngest({
  id: "movie-ticket-booking",
});