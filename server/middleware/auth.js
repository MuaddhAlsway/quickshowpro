import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
  try {
    // Get authenticated Clerk user
    const { userId } = req.auth();

    // User is not logged in
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Get full Clerk user
    const user = await clerkClient.users.getUser(userId);

    // Check private metadata role
    const role = user.privateMetadata?.role;

    // User is logged in but not an admin
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // User is admin
    next();

  } catch (error) {
    console.error(
      "Admin authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Admin authorization failed",
    });
  }
};