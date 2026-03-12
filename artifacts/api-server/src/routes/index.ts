import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import eventsRouter from "./events";
import sessionsRouter from "./sessions";
import analyticsRouter from "./analytics";
import experimentsRouter from "./experiments";
import logsRouter from "./logs";
import requestsRouter from "./requests";
import datastoreRouter from "./datastore";
import funnelsRouter from "./funnels";
import dashboardsRouter from "./dashboards";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/projects", projectsRouter);
router.use("/projects/:projectId/events", eventsRouter);
router.use("/projects/:projectId/sessions", sessionsRouter);
router.use("/projects/:projectId/analytics", analyticsRouter);
router.use("/projects/:projectId/experiments", experimentsRouter);
router.use("/projects/:projectId/logs", logsRouter);
router.use("/projects/:projectId/requests", requestsRouter);
router.use("/projects/:projectId/datastore", datastoreRouter);
router.use("/projects/:projectId/funnels", funnelsRouter);
router.use("/projects/:projectId/dashboards", dashboardsRouter);

export default router;
