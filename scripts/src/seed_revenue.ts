import { db } from "@workspace/db";
import { customersTable, revenueEventsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedRevenue() {
  const [project] = await db.select().from(projectsTable).limit(1);
  if (!project) {
    console.log("No project found, skipping revenue seed");
    return;
  }

  const existing = await db.select().from(customersTable).where(eq(customersTable.projectId, project.id)).limit(1);
  if (existing.length > 0) {
    console.log("Revenue data already seeded, skipping");
    return;
  }

  console.log("Seeding revenue data for project:", project.name);

  const plans = [
    { name: "Starter", mrr: 49 },
    { name: "Pro", mrr: 149 },
    { name: "Business", mrr: 399 },
    { name: "Enterprise", mrr: 999 },
  ];

  const brazilianNames = [
    "Ana Lima", "Carlos Souza", "Beatriz Mendes", "Rafael Costa", "Fernanda Alves",
    "Lucas Martins", "Juliana Pereira", "Diego Rodrigues", "Camila Ferreira", "Bruno Santos",
    "Larissa Oliveira", "Thiago Carvalho", "Mariana Gomes", "Felipe Araújo", "Amanda Ribeiro",
    "Gustavo Nascimento", "Leticia Barbosa", "Rodrigo Azevedo", "Isabela Castro", "Victor Teixeira",
    "Gabriela Cardoso", "Eduardo Rocha", "Priscila Vieira", "Henrique Monteiro", "Renata Pinto",
    "Pedro Correia", "Vanessa Nunes", "Alexandre Medeiros", "Tatiana Freitas", "Mateus Lopes",
    "Natalia Braga", "Caio Cunha", "Sabrina Farias", "Leonardo Cavalcante", "Viviane Batista",
  ];

  const domains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "empresa.com.br", "startup.io"];

  const customerData = brazilianNames.map((name, i) => {
    const plan = plans[i % plans.length];
    const status = i < 28 ? "active" : "churned";
    const months = Math.floor(Math.random() * 18) + 1;
    const ltv = plan.mrr * months;
    const email = `${name.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@${domains[i % domains.length]}`;
    const createdAt = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
    const churnedAt = status === "churned" ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : null;

    return {
      projectId: project.id,
      email,
      name,
      status,
      plan: plan.name,
      mrr: status === "active" ? plan.mrr : 0,
      ltv,
      country: "BR",
      createdAt,
      churnedAt,
    };
  });

  await db.insert(customersTable).values(customerData);
  console.log(`Seeded ${customerData.length} customers`);

  const now = new Date();
  const revenueEvents: any[] = [];

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);

    const newSubs = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < newSubs; i++) {
      const plan = plans[Math.floor(Math.random() * plans.length)];
      revenueEvents.push({
        projectId: project.id,
        type: "new_subscription",
        amount: plan.mrr,
        currency: "BRL",
        customerEmail: `cliente${monthsAgo}${i}@exemplo.com`,
        plan: plan.name,
        source: "manual",
        timestamp: date,
      });
    }

    if (monthsAgo < 10) {
      revenueEvents.push({
        projectId: project.id,
        type: "cancellation",
        amount: plans[0].mrr,
        currency: "BRL",
        plan: "Starter",
        source: "manual",
        timestamp: new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000),
      });
    }

    if (monthsAgo < 8 && monthsAgo % 3 === 0) {
      revenueEvents.push({
        projectId: project.id,
        type: "upgrade",
        amount: 150,
        currency: "BRL",
        plan: "Pro",
        source: "manual",
        timestamp: new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000),
      });
    }
  }

  await db.insert(revenueEventsTable).values(revenueEvents);
  console.log(`Seeded ${revenueEvents.length} revenue events`);
}

seedRevenue().then(() => {
  console.log("Revenue seed complete!");
  process.exit(0);
}).catch((err) => {
  console.error("Revenue seed failed:", err);
  process.exit(1);
});
