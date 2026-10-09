const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.schoolEvent.findFirst();
  if (!event) return;
  
  try {
    const updated = await prisma.schoolEvent.update({
      where: { id: event.id },
      data: {
        name: event.name + " Test",
        letterIntro: "Test Intro"
      }
    });
    console.log("Success:", updated);
  } catch (error) {
    console.log("Error:", error);
  }
}
main();