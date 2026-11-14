import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import type { SavedExamParams, SavedListQuery, SavedQuestionParams, SaveQuestionBody } from "../rules/requests/saved-question.request";
import { savedQuestionService } from "../services/saved-question.service";

export const savedQuestionController = {
  async save(req: Request, res: Response) {
    const { examId, questionNumber } = getValidated<SaveQuestionBody>(res);
    res.json(new ResponseClient({ data: await savedQuestionService.save(req.user!.id, examId, questionNumber) }));
  },

  async remove(req: Request, res: Response) {
    const { examId, number } = getValidated<SavedQuestionParams>(res, "params");
    res.json(new ResponseClient({ data: await savedQuestionService.remove(req.user!.id, examId, number) }));
  },

  // Số các câu đã lưu của một đề (để menu câu hỏi hiện "Bỏ lưu")
  async ofExam(req: Request, res: Response) {
    const { examId } = getValidated<SavedExamParams>(res, "params");
    res.json(new ResponseClient({ data: await savedQuestionService.numbersOfExam(req.user!.id, examId) }));
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await savedQuestionService.list(req.user!.id, getValidated<SavedListQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};
