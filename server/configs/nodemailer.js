import nodemailer from "nodemailer";

// ======================================================
// BREVO SMTP TRANSPORTER
// ======================================================

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",

  port: 587,

  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ======================================================
// SEND EMAIL
// ======================================================

const sendEmail = async ({ to, subject, body }) => {
  if (!to) {
    throw new Error(
      "Recipient email address is required"
    );
  }

  if (!process.env.SENDER_EMAIL) {
    throw new Error(
      "SENDER_EMAIL is missing"
    );
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      "SMTP_USER and SMTP_PASS are required"
    );
  }

  let response;

  try {
    response = await transporter.sendMail({
      from: process.env.SENDER_EMAIL,

      to,

      subject,

      html: body,
    });

  } catch (error) {
    console.error(
      "EMAIL SEND FAILED:",
      error.message
    );

    throw error;
  }

  console.log(
    "EMAIL SENT:",
    response.messageId
  );

  return {
    messageId: response.messageId,
    accepted: response.accepted,
    rejected: response.rejected,
  };
};

export default sendEmail;