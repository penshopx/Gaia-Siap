import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import intakeRouter from "./intake";
import workflowRouter from "./workflow";
import resultsRouter from "./results";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(casesRouter);
router.use(intakeRouter);
router.use(workflowRouter);
router.use(resultsRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
