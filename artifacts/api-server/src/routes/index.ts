import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import casesRouter from "./cases";
import intakeRouter from "./intake";
import workflowRouter from "./workflow";
import resultsRouter from "./results";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

// /healthz is public — used by uptime monitors and the platform health check.
router.use(healthRouter);

// All business routes require a valid Clerk session.
// requireAuth returns 401 { error: "Unauthorized" } for unauthenticated requests.
router.use(requireAuth);
router.use(casesRouter);
router.use(intakeRouter);
router.use(workflowRouter);
router.use(resultsRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
