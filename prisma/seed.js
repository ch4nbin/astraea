const { PrismaClient, ProblemType } = require("@prisma/client");

const prisma = new PrismaClient();

const templates = [
  {
    name: "Banking System",
    type: ProblemType.OOD,
    basePrompt:
      "Design a banking system that supports accounts, deposits, withdrawals, and transfers.",
    variants: [
      "Ensure all transfers are atomic",
      "Support transaction history queries",
      "Handle multi-currency accounts",
      "Detect fraudulent transactions over a threshold",
    ],
  },
  {
    name: "Rate Limiter",
    type: ProblemType.SYSTEM_DESIGN,
    basePrompt: "Design a rate limiter for a public API gateway.",
    variants: [
      "Support per-user and per-IP policies",
      "Provide sliding-window enforcement",
      "Handle distributed deployment across multiple regions",
      "Expose observability metrics for throttled requests",
    ],
  },
  {
    name: "Parking Lot",
    type: ProblemType.OOD,
    basePrompt:
      "Design a parking lot management system for different vehicle sizes and ticketing flows.",
    variants: [
      "Support dynamic pricing by time and demand",
      "Track occupancy per floor and zone",
      "Support reservations for EV charging spots",
      "Handle lost-ticket penalty logic",
    ],
  },
  {
    name: "Chat System",
    type: ProblemType.SYSTEM_DESIGN,
    basePrompt: "Design a real-time chat system for direct messages and group channels.",
    variants: [
      "Guarantee message ordering per conversation",
      "Support offline message delivery",
      "Add read receipts and typing indicators",
      "Handle media attachments with link previews",
    ],
  },
  {
    name: "Todo API",
    type: ProblemType.API,
    basePrompt:
      "Design a RESTful Todo API with CRUD operations, filtering, and pagination.",
    variants: [
      "Implement optimistic concurrency control",
      "Support soft-deletes and recovery",
      "Include role-based access controls",
      "Provide idempotent create endpoints",
    ],
  },
];

async function main() {
  for (const template of templates) {
    await prisma.problemTemplate.upsert({
      where: { name: template.name },
      update: {
        type: template.type,
        basePrompt: template.basePrompt,
        variants: template.variants,
      },
      create: template,
    });
  }

  console.log(`Seeded ${templates.length} problem templates.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
