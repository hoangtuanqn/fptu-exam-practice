import { flashcardRepository } from "../repositories/flashcard.repository";
import { subjectRepository } from "../repositories/subject.repository";
import { foldText } from "../utils/search-text";
import { catalogService } from "./catalog.service";

// Mỗi nhóm kết quả tối đa chừng này mục: ô tìm nhanh, không phải danh sách đầy đủ
const PER_GROUP = 5;

export const searchService = {
  async search(q: string) {
    const needle = foldText(q);
    const [subjects, exams, flashcards] = await Promise.all([
      subjectRepository.search(q, PER_GROUP),
      catalogService.searchExams(q, PER_GROUP),
      flashcardRepository.subjectsWithCards(),
    ]);
    return {
      subjects,
      exams,
      flashcards: flashcards.filter((f) => foldText(f.name ?? "").includes(needle) || foldText(f.code).includes(needle)).slice(0, PER_GROUP),
    };
  },
};
