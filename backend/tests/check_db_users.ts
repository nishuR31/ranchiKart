import { prisma } from "../src/config/prisma.js";

async function checkRecentOrGmailUsers() {
  console.log("Searching database for recent users or Gmail users...");
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find users with gmail address or created in the last 1 hour
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: "gmail" } },
          { email: { contains: "google" } },
          { createdAt: { gte: oneHourAgo } },
          { lastLogin: { gte: oneHourAgo } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
    
    console.log(`Found ${users.length} matching users:`);
    for (const u of users) {
      console.log(`- ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Avatar: ${u.avatarUrl}`);
      console.log(`  Created: ${u.createdAt}`);
      console.log(`  Last Login: ${u.lastLogin}`);
      console.log("----------------------------------------");
    }
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentOrGmailUsers();
