import { subjectCodeOf } from "../prompts";

// Tiêu đề kiểu "MAD101_SP26_FE": dấu gạch dưới là ký tự chữ nên subjectCodeOf (dùng \b) không nhận ra mã
const withUnderscore = (title: string) => title.match(/(?<![A-Za-z0-9])[A-Za-z]{2,4}\d{3}[A-Za-z]?(?![A-Za-z0-9])/)?.[0].toUpperCase() ?? null;

// Mã môn trong tiêu đề đề thi ("PRO192 - SU26 - FE" hoặc "MAD101_SP26_FE"), null nếu không thấy
/** Bỏ chữ biến thể ở cuối mã môn (PRO192C -> PRO192, SWE201c -> SWE201) */
export const baseSubjectCode = (code: string) => code.toUpperCase().replace(/[A-Z]$/, "");

/** Hai mã là cùng một môn (kể cả khi một bên là biến thể có chữ cuối): PRO192 = PRO192C */
export const sameSubject = (a: string, b: string) => baseSubjectCode(a) === baseSubjectCode(b);

export const subjectCodeFromTitle = (title: string) => subjectCodeOf(title) ?? withUnderscore(title);
