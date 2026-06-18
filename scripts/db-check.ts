import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const categories = await prisma.category.count();
  const products = await prisma.product.count();
  const importStates = await prisma.importState.findMany();

  console.log("Database Stats:");
  console.log("- Users:", users);
  console.log("- Categories:", categories);
  console.log("- Products:", products);
  console.log("- Import States:", JSON.stringify(importStates, null, 2));

  if (users > 0) {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log("- Admin Email:", admin?.email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
