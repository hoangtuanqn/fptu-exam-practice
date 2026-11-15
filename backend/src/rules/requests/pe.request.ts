import { z } from "zod";
import { isFuoThreadUrl } from "../../utils/fuo-url";
import { FUO_LINK_INVALID } from "../../constants/crawler";

export const peDownloadBody = z.object({
  url: z.string("Vui lòng dán link đề PE").trim().min(1, "Vui lòng dán link đề PE").max(500, FUO_LINK_INVALID).refine(isFuoThreadUrl, FUO_LINK_INVALID),
});
export type PeDownloadBody = z.infer<typeof peDownloadBody>;
