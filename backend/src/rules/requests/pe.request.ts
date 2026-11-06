import { z } from "zod";
import { parseThreadId } from "../../utils/fuo-url";

export const peDownloadBody = z.object({
  url: z.string().trim().max(500).refine((v) => parseThreadId(v) !== null, "Link không đúng dạng https://fuoverflow.com/threads/ten-de.1234/"),
});
export type PeDownloadBody = z.infer<typeof peDownloadBody>;
