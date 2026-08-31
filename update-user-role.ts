import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function main() {
  try {
    // Update the newly created user
    const user = await prisma.user.update({
      where: { email: "newtestadmin@example.com" },
      data: {
        role: "SUPER_ADMIN",
        emailVerified: true,
      },
    });

    console.log("✅ User updated to SUPER_ADMIN:", user.email, user.role);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
