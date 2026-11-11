import { subjectCodeOf } from "../prompts";

// Tiêu đề kiểu "MAD101_SP26_FE": dấu gạch dưới là ký tự chữ nên subjectCodeOf (dùng \b) không nhận ra mã
const withUnderscore = (title: string) => title.match(/(?<![A-Za-z0-9])[A-Za-z]{2,4}\d{3}[A-Za-z]?(?![A-Za-z0-9])/)?.[0].toUpperCase() ?? null;

// Mã môn trong tiêu đề đề thi ("PRO192 - SU26 - FE" hoặc "MAD101_SP26_FE"), null nếu không thấy
export const subjectCodeFromTitle = (title: string) => subjectCodeOf(title) ?? withUnderscore(title);
