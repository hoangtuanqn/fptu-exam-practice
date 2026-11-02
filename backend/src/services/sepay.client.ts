import type { SepayConfig } from "../constants/sepay";
import { AppError } from "../rules/error";

const API_URL = "https://my.sepay.vn/userapi/transactions/list";

export interface SepayTransaction {
  id: string;
  bank_brand_name: string | null;
  account_number: string | null;
  transaction_date: string; // "YYYY-MM-DD HH:mm:ss" theo giờ Việt Nam
  amount_in: string; // "2000000.00"
  transaction_content: string | null;
  reference_number: string | null;
}

// Chỉ lo việc gọi HTTP tới SePay; logic đối soát nằm ở sepay.service
export const sepayClient = {
  async listTransactions(config: Pick<SepayConfig, "apiToken" | "accountNumber">, limit = 100) {
    const url = `${API_URL}?${new URLSearchParams({ account_number: config.accountNumber, limit: String(limit) })}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new AppError(`SePay trả về HTTP ${res.status}`, 502);

    const json = (await res.json()) as { status?: number; transactions?: SepayTransaction[] };
    if (json.status !== 200 || !Array.isArray(json.transactions)) throw new AppError("SePay trả về dữ liệu không hợp lệ", 502);
    return json.transactions;
  },
};
