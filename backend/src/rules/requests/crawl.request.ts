import { z } from "zod";
import { FUO_HOST } from "../../constants/crawler";
import { parseThreadId } from "../../utils/fuo-url";
import { idParam } from "./admin.request";

// Chỉ nhận link thread của FuOverflow; ID thread lấy được từ link thì mới chấp nhận
export const importExamBody = z.object({
  url: z
    .string("Vui lòng nhập link đề")
    .trim()
    .max(500)
    .refine((v) => {
      try {
        const { hostname } = new URL(v);
        return (hostname === FUO_HOST || hostname.endsWith(`.${FUO_HOST}`)) && parseThreadId(v) !== null;
      } catch {
        return false;
      }
    }, "Link không đúng dạng https://fuoverflow.com/threads/ten-de.1234/"),
});

export { idParam };
export type ImportExamBody = z.infer<typeof importExamBody>;
