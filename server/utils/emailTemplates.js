// ======================================================
// EMAIL TEMPLATES
//
// Responsive, email-client-safe HTML templates built with
// inline styles and table layout (Outlook-friendly).
//
// Every dynamic value is HTML-escaped before interpolation.
//
// Currency is derived from the booking, never hardcoded as
// "$". Times are formatted in the configured show timezone.
// ======================================================

export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    }
  );

// ======================================================
// SHOW TIMEZONE
//
// The app operates in a single regional timezone. It is
// configurable through SHOW_TIMEZONE so emails always
// display showtimes in the movie's local time.
// ======================================================

export const getShowTimeZone = () =>
  process.env.SHOW_TIMEZONE ?? "Asia/Riyadh";

// ======================================================
// FORMAT HELPERS
// ======================================================

export const formatCurrency = (amount, currency) => {
  const normalized =
    String(currency || "usd").toUpperCase();

  const safeAmount = Number(amount) || 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
      minimumFractionDigits:
        Number.isInteger(safeAmount) ? 0 : 2,
      maximumFractionDigits:
        Number.isInteger(safeAmount) ? 2 : 2,
    }).format(safeAmount);
  } catch {
    // Unknown currency code — fall back to code + amount.
    return `${normalized} ${safeAmount}`;
  }
};

export const formatShowDateTime = (
  value,
  timeZone = getShowTimeZone()
) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone,
  });

  const datePart = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });

  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  return `${weekday}, ${datePart} at ${timePart}`;
};

export const getPosterUrl = (
  posterPath,
  baseUrl = process.env.POSTER_BASE_URL ||
    "https://image.tmdb.org/t/p/w500"
) => {
  if (!posterPath) {
    return null;
  }

  // Absolute URLs pass through unchanged.
  if (/^https?:\/\//i.test(posterPath)) {
    return posterPath;
  }

  return `${baseUrl.replace(/\/$/, "")}/${String(
    posterPath
  ).replace(/^\//, "")}`;
};

// ======================================================
// SHARED LAYOUT
// ======================================================

const BRAND_COLOR = "#e11d48";
const TEXT_COLOR = "#1f2937";
const MUTED_COLOR = "#6b7280";

const baseLayout = ({
  preheader,
  headline,
  bodyBody,
}) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>QuickShow</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      font-family: Arial, Helvetica, sans-serif;
      color: ${TEXT_COLOR};
    "
  >
    <span
      style="
        display: none;
        max-height: 0;
        overflow: hidden;
        mso-hide: all;
      "
    >
      ${escapeHtml(preheader)}
    </span>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        background-color: #f5f5f5;
        padding: 24px 12px;
      "
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              max-width: 600px;
              width: 100%;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid #e5e7eb;
            "
          >
            <!-- BRAND HEADER -->
            <tr>
              <td
                style="
                  background-color: ${BRAND_COLOR};
                  padding: 24px 32px;
                "
              >
                <h1
                  style="
                    margin: 0;
                    font-size: 26px;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: 1px;
                  "
                >
                  QuickShow
                </h1>
                <p
                  style="
                    margin: 4px 0 0;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.85);
                  "
                >
                  Your movie ticket companion
                </p>
              </td>
            </tr>

            <!-- HEADLINE -->
            <tr>
              <td style="padding: 32px 32px 8px;">
                <h2
                  style="
                    margin: 0;
                    font-size: 22px;
                    color: ${TEXT_COLOR};
                  "
                >
                  ${escapeHtml(headline)}
                </h2>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding: 8px 32px 16px;">
                ${bodyBody}
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td
                style="
                  padding: 20px 32px;
                  background-color: #fafafa;
                  border-top: 1px solid #e5e7eb;
                "
              >
                <p
                  style="
                    margin: 0;
                    font-size: 12px;
                    color: ${MUTED_COLOR};
                    line-height: 1.6;
                  "
                >
                  You are receiving this email because you
                  have a booking with QuickShow.
                  <br />
                  Please do not reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

// ======================================================
// SHARED MOVIE BLOCK
// ======================================================

const movieBlock = ({
  movieTitle,
  posterUrl,
  showDateTime,
  timeZone,
}) => `
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >
    <tr>
      <td
        style="
          vertical-align: top;
          padding-right: 0;
          padding-bottom: 16px;
        "
      >
        ${
          posterUrl
            ? `
            <img
              src="${escapeHtml(posterUrl)}"
              alt="${escapeHtml(movieTitle)} poster"
              width="160"
              style="
                display: block;
                width: 160px;
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              "
            />
          `
            : ""
        }
      </td>
    </tr>
  </table>

  <h3
    style="
      margin: 0 0 12px;
      font-size: 20px;
      color: ${TEXT_COLOR};
    "
  >
    ${escapeHtml(movieTitle)}
  </h3>

  <p style="margin: 0 0 6px; font-size: 15px;">
    <strong>Date &amp; time:</strong>
    ${escapeHtml(formatShowDateTime(showDateTime, timeZone))}
  </p>
`;

// ======================================================
// BOOKING SUMMARY TABLE
// ======================================================

const summaryRows = ({ rows }) => {
  const rowMarkup = rows
    .filter((row) => row && row.label)
    .map(
      (row) => `
        <tr>
          <td
            style="
              padding: 8px 12px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 14px;
              color: ${MUTED_COLOR};
            "
          >
            ${escapeHtml(row.label)}
          </td>
          <td
            align="right"
            style="
              padding: 8px 12px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 14px;
              font-weight: 600;
              color: ${TEXT_COLOR};
            "
          >
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin: 16px 0;
      "
    >
      ${rowMarkup}
    </table>
  `;
};

// ======================================================
// BOOKING CONFIRMATION EMAIL
// ======================================================

export const buildBookingConfirmationEmail = ({
  userName,
  movieTitle,
  posterPath,
  showDateTime,
  timeZone = getShowTimeZone(),
  bookedSeats = [],
  amount,
  currency,
  bookingId,
}) => {
  const ticketCount = Array.isArray(bookedSeats)
    ? bookedSeats.length
    : 0;

  const formattedAmount = formatCurrency(
    amount,
    currency
  );

  const bodyBody = `
    <p style="margin: 0 0 16px; font-size: 15px;">
      Hello <strong>${escapeHtml(userName)}</strong>,
    </p>

    <p style="margin: 0 0 20px; font-size: 15px;">
      Your payment was successful. Your movie tickets
      are <strong>confirmed</strong>.
    </p>

    ${movieBlock({
      movieTitle,
      posterUrl: getPosterUrl(posterPath),
      showDateTime,
      timeZone,
    })}

    ${summaryRows({
      rows: [
        {
          label: "Total tickets",
          value: `${ticketCount}`,
        },
        {
          label: "Seat numbers",
          value:
            ticketCount > 0
              ? bookedSeats.join(", ")
              : "N/A",
        },
        {
          label: "Amount paid",
          value: formattedAmount,
        },
        {
          label: "Payment status",
          value: "Paid / Confirmed",
        },
        {
          label: "Booking reference",
          value: bookingId,
        },
      ],
    })}

    <p
      style="
        margin: 20px 0 0;
        font-size: 15px;
        color: ${TEXT_COLOR};
      "
    >
      Thank you for booking with
      <strong>QuickShow</strong>!
    </p>
  `;

  return {
    subject: `Booking Confirmed - ${movieTitle}`,

    html: baseLayout({
      preheader:
        `Payment confirmed for ${movieTitle}. ` +
        `${ticketCount} ticket${ticketCount === 1 ? "" : "s"} - ` +
        `${formattedAmount}.`,

      headline: "Booking Confirmed!",

      bodyBody,
    }),
  };
};

// ======================================================
// MOVIE REMINDER EMAIL
//
// type: "24h" | "2h"
// ======================================================

export const buildMovieReminderEmail = (
  { type },
  {
    userName,
    movieTitle,
    posterPath,
    showDateTime,
    timeZone = getShowTimeZone(),
    bookedSeats = [],
    bookingId,
  }
) => {
  const seatNumbers =
    bookedSeats.length > 0
      ? bookedSeats.join(", ")
      : "N/A";

  const is24h = type === "24h";

  const headline = is24h
    ? "Your movie starts tomorrow!"
    : "Your movie starts in 2 hours!";

  const reminderNote = is24h
    ? "Plan your journey and try to arrive 15–30 minutes early to grab your snacks and settle in comfortably."
    : "Get ready for the show! Make sure you are on your way in good time — your reserved seats are waiting for you.";

  const preheader = is24h
    ? `Reminder: ${movieTitle} starts tomorrow.`
    : `Reminder: ${movieTitle} starts in 2 hours.`;

  const subject = is24h
    ? `Your movie starts tomorrow — QuickShow`
    : `Your movie starts in 2 hours — QuickShow`;

  const bodyBody = `
    <p style="margin: 0 0 16px; font-size: 15px;">
      Hi <strong>${escapeHtml(userName)}</strong>,
    </p>

    <p style="margin: 0 0 20px; font-size: 15px;">
      This is a friendly reminder about your upcoming
      QuickShow booking.
    </p>

    ${movieBlock({
      movieTitle,
      posterUrl: getPosterUrl(posterPath),
      showDateTime,
      timeZone,
    })}

    ${summaryRows({
      rows: [
        {
          label: "Showtime",
          value: formatShowDateTime(
            showDateTime,
            timeZone
          ),
        },
        {
          label: "Seat numbers",
          value: seatNumbers,
        },
        {
          label: "Booking reference",
          value: bookingId,
        },
      ],
    })}

    <p
      style="
        margin: 16px 0 0;
        font-size: 15px;
        padding: 16px;
        background-color: #fef2f2;
        border-left: 4px solid ${BRAND_COLOR};
        border-radius: 6px;
        color: ${TEXT_COLOR};
      "
    >
      ${escapeHtml(reminderNote)}
    </p>
  `;

  return {
    subject,
    html: baseLayout({
      preheader,
      headline,
      bodyBody,
    }),
  };
};