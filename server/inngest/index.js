import User from "../models/User.js";
import { Inngest } from "inngest";

// Create Inngest client
export const inngest = new Inngest({
  id: "movie-ticket-booking",
});

// Create user
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

    await User.create(userData);

    return {
      success: true,
      userId: id,
    };
  }
);

// Delete user
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
    const { id } = event.data;

    await User.findByIdAndDelete(id);

    return {
      success: true,
      userId: id,
    };
  }
);

// Update user
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

    await User.findByIdAndUpdate(id, userData, {
      new: true,
    });

    return {
      success: true,
      userId: id,
    };
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
];