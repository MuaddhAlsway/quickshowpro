import User from "../models/User.js";
import connectDB from "../configs/db.js";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "movie-ticket-booking",
});


// ======================================================
// CREATE USER
// Clerk → Inngest → MongoDB
// ======================================================

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [
      {
        event: "clerk/user.created",
      },
    ],
  },

  async ({ event }) => {
    // Make sure MongoDB is connected
    await connectDB();

    const {
      id,
      first_name,
      last_name,
      email_addresses = [],
      image_url,
    } = event.data;

    const email = email_addresses[0]?.email_address;

    if (!email) {
      throw new Error(`Clerk user ${id} has no email address`);
    }

    const userData = {
      _id: id,
      email,
      name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
      image: image_url ?? "",
    };

    // Upsert makes retries safer.
    // If Inngest retries the event, we won't get duplicate _id errors.
    const user = await User.findByIdAndUpdate(
      id,
      userData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return {
      success: true,
      userId: user._id,
    };
  }
);


// ======================================================
// DELETE USER
// Clerk → Inngest → MongoDB
// ======================================================

const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: [
      {
        event: "clerk/user.deleted",
      },
    ],
  },

  async ({ event }) => {
    // Make sure MongoDB is connected
    await connectDB();

    const { id } = event.data;

    if (!id) {
      throw new Error("Clerk delete event has no user ID");
    }

    const deletedUser = await User.findByIdAndDelete(id);

    return {
      success: true,
      userId: id,
      deleted: Boolean(deletedUser),
    };
  }
);


// ======================================================
// UPDATE USER
// Clerk → Inngest → MongoDB
// ======================================================

const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [
      {
        event: "clerk/user.updated",
      },
    ],
  },

  async ({ event }) => {
    // Make sure MongoDB is connected
    await connectDB();

    const {
      id,
      first_name,
      last_name,
      email_addresses = [],
      image_url,
    } = event.data;

    const email = email_addresses[0]?.email_address;

    if (!email) {
      throw new Error(`Clerk user ${id} has no email address`);
    }

    const userData = {
      email,
      name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
      image: image_url ?? "",
    };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      userData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return {
      success: true,
      userId: updatedUser._id,
    };
  }
);


// ======================================================
// EXPORT FUNCTIONS
// ======================================================

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
];