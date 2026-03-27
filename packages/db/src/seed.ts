import { getPrismaClient } from "./index";

const prisma = getPrismaClient();

async function seed() {
  const projects = [
    {
      id: "proj_orbit",
      name: "Orbit Commerce",
      slug: "orbit-commerce",
      description: "Canvas operacional para produto, receita e automacoes.",
      website: "https://orbit.local",
      apiKey: "lynx_orbit_local"
    },
    {
      id: "proj_atlas",
      name: "Atlas CRM",
      slug: "atlas-crm",
      description: "CRM focado em receita e observabilidade de pipeline.",
      website: "https://atlas.local",
      apiKey: "lynx_atlas_local"
    }
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: project
    });
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
