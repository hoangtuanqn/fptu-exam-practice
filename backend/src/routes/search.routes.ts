import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { type SearchQuery, searchQuery } from "../rules/requests/search.request";
import { ResponseClient } from "../rules/response";
import { searchService } from "../services/search.service";

// Tìm nhanh môn học, đề và flashcard từ ô tìm kiếm trên header. Công khai (không cần đăng nhập), giới hạn số lần gọi.
const searchRouter = Router();
searchRouter.use(makeLimiter({ limit: 60 }));

searchRouter.get("/", validate(searchQuery, "query"), async (_req, res) => {
  const { q } = getValidated<SearchQuery>(res, "query");
  res.json(new ResponseClient({ data: await searchService.search(q) }));
});

export default searchRouter;
