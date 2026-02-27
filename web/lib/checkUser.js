import { currentUser, auth } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  try {
    // First try to get the authenticated user id via auth(), which is
    // more reliable in some server contexts (middleware / server actions).
    let user = null;
    try {
      const { userId } = await auth();
      if (userId) {
        user = await currentUser();
      } else {
        user = await currentUser();
      }
    } catch (e) {
      // Fallback to currentUser() if auth() fails
      user = await currentUser();
    }

    if (!user) {
      console.log("No user found from Clerk (auth/currentUser returned null)");
      return null;
    }

    console.log("Clerk user found:", {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
    });

    // Test database connection first
    try {
      await db.$queryRaw`SELECT 1`;
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      throw new Error("Database connection failed");
    }

    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      console.log("Existing user found in database");
      return loggedInUser;
    }

    console.log("User not found in database, creating new user...");
    const name =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    const email = user.emailAddresses[0]?.emailAddress || "";

    try {
      const newUser = await db.user.create({
        data: {
          clerkUserId: user.id,
          name,
          imageUrl: user.imageUrl,
          email: email,
        },
      });

      console.log("New user created successfully:", newUser.id);
      return newUser;
    } catch (createError) {
      // If user creation fails due to unique constraint, try to find existing user by email
      if (
        createError.code === "P2002" &&
        createError.meta?.target?.includes("email")
      ) {
        console.log(
          "User with this email already exists, finding existing user..."
        );
        const existingUser = await db.user.findUnique({
          where: { email: email },
        });

        if (existingUser) {
          // Update the existing user with the new clerkUserId if it's different
          if (existingUser.clerkUserId !== user.id) {
            const updatedUser = await db.user.update({
              where: { id: existingUser.id },
              data: { clerkUserId: user.id },
            });
            console.log(
              "Updated existing user with new clerkUserId:",
              updatedUser.id
            );
            return updatedUser;
          }
          console.log("Found existing user:", existingUser.id);
          return existingUser;
        }
      }

      console.error("Error creating user:", createError);
      throw createError;
    }
  } catch (error) {
    console.error("Error in checkUser:", error);
    return null;
  }
};
