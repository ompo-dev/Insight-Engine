import { db } from "@workspace/db";
import {
  projectsTable,
  eventsTable,
  sessionsTable,
  experimentsTable,
  logsTable,
  requestsTable,
  funnelsTable,
  dashboardsTable,
  datastoreTable,
} from "@workspace/db";
import { randomUUID } from "crypto";

const now = new Date();
function daysAgo(n: number) {
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
}
function hoursAgo(n: number) {
  return new Date(now.getTime() - n * 60 * 60 * 1000);
}
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("Seeding demo data...");

  // Project 1
  const [project1] = await db.insert(projectsTable).values({
    name: "Demo SaaS App",
    slug: "demo-saas-app",
    apiKey: `lx_${randomUUID().replace(/-/g, "")}`,
    description: "A sample SaaS application for testing Lynx Analytics",
  }).returning().onConflictDoNothing();

  if (!project1) {
    console.log("Project already exists, skipping seed.");
    return;
  }

  // Project 2
  const [project2] = await db.insert(projectsTable).values({
    name: "E-commerce Store",
    slug: "ecommerce-store",
    apiKey: `lx_${randomUUID().replace(/-/g, "")}`,
    description: "Online retail store tracking",
  }).returning();

  const pages = ["/", "/dashboard", "/settings", "/billing", "/users", "/pricing", "/docs", "/login"];
  const eventNames = ["$pageview", "button_clicked", "form_submitted", "signup", "login", "purchase", "checkout_started", "video_watched"];
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  ];

  // Sessions and events
  const sessions: any[] = [];
  const events: any[] = [];
  const sessionIds: string[] = [];

  for (let i = 0; i < 120; i++) {
    const sessionId = `sess-${randomUUID().slice(0, 8)}`;
    sessionIds.push(sessionId);
    const userId = rnd(0, 1) ? `user-${rnd(1, 40)}` : null;
    const startedAt = daysAgo(rnd(0, 29));
    const duration = rnd(30, 1800);
    const entryPage = pages[rnd(0, pages.length - 1)];
    const exitPage = pages[rnd(0, pages.length - 1)];

    sessions.push({
      projectId: project1.id,
      sessionId,
      userId,
      anonymousId: userId ? null : `anon-${randomUUID().slice(0, 8)}`,
      startedAt,
      endedAt: new Date(startedAt.getTime() + duration * 1000),
      duration,
      eventCount: rnd(3, 20),
      entryPage,
      exitPage,
      referrer: rnd(0, 1) ? "https://google.com" : rnd(0, 1) ? "https://twitter.com" : null,
      userAgent: userAgents[rnd(0, userAgents.length - 1)],
      ip: `192.168.${rnd(1, 255)}.${rnd(1, 255)}`,
      country: ["US", "BR", "UK", "DE", "FR"][rnd(0, 4)],
      device: ["desktop", "mobile", "tablet"][rnd(0, 2)],
    });

    for (let j = 0; j < rnd(3, 15); j++) {
      const eName = eventNames[rnd(0, eventNames.length - 1)];
      events.push({
        projectId: project1.id,
        name: eName,
        sessionId,
        userId,
        anonymousId: userId ? null : `anon-${randomUUID().slice(0, 8)}`,
        properties: { page: entryPage, component: `button-${rnd(1, 5)}` },
        timestamp: new Date(startedAt.getTime() + j * rnd(10, 120) * 1000),
        url: `https://app.example.com${pages[rnd(0, pages.length - 1)]}`,
        referrer: null,
        userAgent: userAgents[rnd(0, userAgents.length - 1)],
        ip: `192.168.${rnd(1, 255)}.${rnd(1, 255)}`,
      });
    }
  }

  await db.insert(sessionsTable).values(sessions);
  console.log(`Inserted ${sessions.length} sessions`);

  for (let i = 0; i < events.length; i += 100) {
    await db.insert(eventsTable).values(events.slice(i, i + 100));
  }
  console.log(`Inserted ${events.length} events`);

  // Experiments
  await db.insert(experimentsTable).values([
    {
      projectId: project1.id,
      name: "Hero CTA Button Test",
      description: "Testing different CTA button colors on the landing page",
      status: "running",
      hypothesis: "A green CTA button will have higher conversion than blue",
      variants: [
        { id: "ctrl", name: "Control (Blue)", weight: 0.5, isControl: true },
        { id: "var1", name: "Variant A (Green)", weight: 0.5, isControl: false },
      ],
      metric: "signup",
      targetSampleSize: 1000,
      startedAt: daysAgo(7),
    },
    {
      projectId: project1.id,
      name: "Pricing Page Layout",
      description: "Monthly vs Annual pricing shown first",
      status: "completed",
      hypothesis: "Showing annual pricing first increases LTV",
      variants: [
        { id: "ctrl", name: "Monthly First", weight: 0.5, isControl: true },
        { id: "var1", name: "Annual First", weight: 0.5, isControl: false },
      ],
      metric: "purchase",
      targetSampleSize: 2000,
      startedAt: daysAgo(30),
      endedAt: daysAgo(2),
    },
    {
      projectId: project1.id,
      name: "Onboarding Flow Length",
      description: "5-step vs 3-step onboarding",
      status: "draft",
      hypothesis: "Shorter onboarding improves activation rate",
      variants: [
        { id: "ctrl", name: "5 Steps", weight: 0.5, isControl: true },
        { id: "var1", name: "3 Steps", weight: 0.5, isControl: false },
      ],
      metric: "form_submitted",
      targetSampleSize: 500,
    },
  ]);
  console.log("Inserted experiments");

  // Logs
  const services = ["api", "auth", "payments", "workers", "notifications"];
  const logMessages = {
    debug: ["Cache hit for key:", "DB query executed in 12ms", "Webhook received"],
    info: ["User signed up", "Payment processed", "Email sent", "API key generated", "Dashboard viewed"],
    warn: ["Rate limit approaching for user", "Slow query detected (>500ms)", "Retry attempt 2/3", "Memory usage above 80%"],
    error: ["Payment failed: card declined", "Database connection timeout", "Unhandled exception in worker", "Auth token expired"],
  };
  const levels = ["debug", "info", "info", "info", "warn", "error"] as const;
  const logEntries: any[] = [];
  for (let i = 0; i < 300; i++) {
    const level = levels[rnd(0, levels.length - 1)];
    const msgs = logMessages[level];
    logEntries.push({
      projectId: project1.id,
      level,
      message: msgs[rnd(0, msgs.length - 1)] + ` [req-${randomUUID().slice(0, 6)}]`,
      service: services[rnd(0, services.length - 1)],
      timestamp: hoursAgo(rnd(0, 168)),
      meta: { userId: `user-${rnd(1, 40)}`, statusCode: [200, 201, 400, 401, 500][rnd(0, 4)] },
      traceId: randomUUID(),
    });
  }
  for (let i = 0; i < logEntries.length; i += 100) {
    await db.insert(logsTable).values(logEntries.slice(i, i + 100));
  }
  console.log("Inserted logs");

  // Requests
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const paths = ["/api/users", "/api/events", "/api/auth/login", "/api/projects", "/api/billing", "/api/analytics"];
  const statusCodes = [200, 200, 200, 201, 400, 401, 404, 500];
  const requestEntries: any[] = [];
  for (let i = 0; i < 200; i++) {
    const statusCode = statusCodes[rnd(0, statusCodes.length - 1)];
    requestEntries.push({
      projectId: project1.id,
      method: methods[rnd(0, methods.length - 1)],
      url: `https://api.example.com${paths[rnd(0, paths.length - 1)]}`,
      statusCode,
      duration: rnd(5, 2000),
      requestSize: rnd(100, 10000),
      responseSize: rnd(200, 50000),
      timestamp: hoursAgo(rnd(0, 72)),
      ip: `10.0.${rnd(1, 255)}.${rnd(1, 255)}`,
      userAgent: userAgents[rnd(0, userAgents.length - 1)],
      traceId: randomUUID(),
      error: statusCode >= 500 ? "Internal server error" : null,
    });
  }
  for (let i = 0; i < requestEntries.length; i += 100) {
    await db.insert(requestsTable).values(requestEntries.slice(i, i + 100));
  }
  console.log("Inserted requests");

  // Datastore
  await db.insert(datastoreTable).values([
    { projectId: project1.id, collection: "users", data: { email: "alice@example.com", plan: "pro", mrr: 49 } },
    { projectId: project1.id, collection: "users", data: { email: "bob@example.com", plan: "starter", mrr: 9 } },
    { projectId: project1.id, collection: "users", data: { email: "carol@example.com", plan: "enterprise", mrr: 299 } },
    { projectId: project1.id, collection: "metrics", data: { mrr: 15420, arr: 185040, churnRate: 0.02 } },
    { projectId: project1.id, collection: "metrics", data: { nps: 42, csat: 4.6, supportTickets: 12 } },
  ]);
  console.log("Inserted datastore");

  // Funnels
  await db.insert(funnelsTable).values([
    {
      projectId: project1.id,
      name: "Signup Funnel",
      description: "From landing page visit to account creation",
      steps: [
        { order: 1, eventName: "$pageview", label: "Visit Landing Page" },
        { order: 2, eventName: "button_clicked", label: "Click Sign Up" },
        { order: 3, eventName: "form_submitted", label: "Submit Form" },
        { order: 4, eventName: "signup", label: "Account Created" },
      ],
    },
    {
      projectId: project1.id,
      name: "Checkout Funnel",
      description: "From product view to purchase completion",
      steps: [
        { order: 1, eventName: "$pageview", label: "View Product" },
        { order: 2, eventName: "checkout_started", label: "Start Checkout" },
        { order: 3, eventName: "purchase", label: "Complete Purchase" },
      ],
    },
  ]);
  console.log("Inserted funnels");

  // Dashboards
  await db.insert(dashboardsTable).values([
    {
      projectId: project1.id,
      name: "Marketing Dashboard",
      description: "Key marketing metrics and funnels",
      widgets: [
        { id: "w1", type: "metric", title: "Total Users", position: { x: 0, y: 0, w: 3, h: 2 } },
        { id: "w2", type: "line_chart", title: "Daily Events", position: { x: 3, y: 0, w: 9, h: 4 } },
        { id: "w3", type: "funnel", title: "Signup Funnel", position: { x: 0, y: 4, w: 6, h: 6 } },
      ],
    },
    {
      projectId: project1.id,
      name: "Developer Dashboard",
      description: "API performance and error rates",
      widgets: [
        { id: "w1", type: "metric", title: "Error Rate", position: { x: 0, y: 0, w: 3, h: 2 } },
        { id: "w2", type: "bar_chart", title: "Request Latency", position: { x: 3, y: 0, w: 9, h: 4 } },
      ],
    },
  ]);
  console.log("Inserted dashboards");

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
