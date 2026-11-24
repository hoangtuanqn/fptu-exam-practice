import { MASCOT_SVG, MASCOT_XMAS_SVG } from "@/shared/ui/mascot-art";
import { useSeason } from "./SeasonContext";

// Hình Cóc Pass theo mùa (mascot-art.ts phải giữ thuần chuỗi vì script backend cũng import nó, nên hook nằm ở đây)
export const useMascotSvg = () => (useSeason().xmas ? MASCOT_XMAS_SVG : MASCOT_SVG);
