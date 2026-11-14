import { Router } from "express";
import { COURSERA } from "../constants/coursera";
import { courseraController as controller } from "../controllers/coursera.controllers";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { courseraCourseBody, courseraCoursesQuery, courseraOrderBody, courseraOrdersQuery, courseraStatusBody } from "../rules/requests/coursera.request";
import { courseraNoStore } from "../middlewares/coursera.middlewares";

const orderLimiter = makeLimiter({ limit: COURSERA.orderRate, keyGenerator: (req) => `user:${req.user!.id}`, validate: { keyGeneratorIpFallback: false } });
const credentialLimiter = makeLimiter({ limit: COURSERA.credentialRate, keyGenerator: (req) => `user:${req.user!.id}`, validate: { keyGeneratorIpFallback: false } });
export const courseraRouter = Router();
courseraRouter.use(authenticate, courseraNoStore);
courseraRouter.get("/courses", validate(courseraCoursesQuery, "query"), controller.courses);
courseraRouter.get("/orders", validate(courseraOrdersQuery, "query"), controller.orders);
courseraRouter.post("/orders", orderLimiter, validate(courseraOrderBody), controller.createOrder);
courseraRouter.post("/orders/:id/cancel", validate(idParam, "params"), controller.cancel);

export const adminCourseraRouter = Router();
adminCourseraRouter.use(authenticate, requireAdmin, courseraNoStore);
adminCourseraRouter.get("/courses", validate(courseraCoursesQuery, "query"), controller.adminCourses);
adminCourseraRouter.post("/courses", validate(courseraCourseBody), controller.createCourse);
adminCourseraRouter.put("/courses/:id", validate(idParam, "params"), validate(courseraCourseBody), controller.updateCourse);
adminCourseraRouter.get("/orders", validate(courseraOrdersQuery, "query"), controller.adminOrders);
adminCourseraRouter.patch("/orders/:id", validate(idParam, "params"), validate(courseraStatusBody), controller.updateStatus);
adminCourseraRouter.post("/orders/:id/credentials", credentialLimiter, validate(idParam, "params"), controller.credentials);
