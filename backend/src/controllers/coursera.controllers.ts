import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { CourseraCourseBody, CourseraCoursesQuery, CourseraLookupBody, CourseraNoteBody, CourseraOrderBody, CourseraOrdersQuery, CourseraStatusBody } from "../rules/requests/coursera.request";
import { ResponseClient } from "../rules/response";
import { courseraService } from "../services/coursera.service";

const idOf = (res: Response) => getValidated<UuidParam>(res, "params").id;
export const courseraController = {
  async courses(_req: Request, res: Response) {
    const { items, meta } = await courseraService.courses(getValidated<CourseraCoursesQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
  async adminCourses(_req: Request, res: Response) {
    const { items, meta } = await courseraService.courses(getValidated<CourseraCoursesQuery>(res, "query"), true);
    res.json(new ResponseClient({ data: items, meta }));
  },
  async createCourse(_req: Request, res: Response) {
    res.status(201).json(new ResponseClient({ data: await courseraService.saveCourse(getValidated<CourseraCourseBody>(res)) }));
  },
  async updateCourse(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await courseraService.saveCourse(getValidated<CourseraCourseBody>(res), idOf(res)) }));
  },
  async lookup(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await courseraService.lookup(getValidated<CourseraLookupBody>(res).url) }));
  },
  async orders(req: Request, res: Response) {
    const { items, meta } = await courseraService.orders(getValidated<CourseraOrdersQuery>(res, "query"), req.user!.id);
    res.json(new ResponseClient({ data: items, meta }));
  },
  async adminOrders(_req: Request, res: Response) {
    const { items, meta } = await courseraService.orders(getValidated<CourseraOrdersQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
  async createOrder(req: Request, res: Response) {
    res.status(201).json(new ResponseClient({ data: await courseraService.createOrder(req.user!.id, getValidated<CourseraOrderBody>(res)) }));
  },
  async cancel(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await courseraService.cancel(idOf(res), req.user!.id) }));
  },
  async updateStatus(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await courseraService.updateStatus(idOf(res), getValidated<CourseraStatusBody>(res)) }));
  },
  async updateNote(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await courseraService.updateNote(idOf(res), getValidated<CourseraNoteBody>(res)) }));
  },
  async credentials(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await courseraService.credentials(idOf(res), req.user!.id) }));
  },
};
