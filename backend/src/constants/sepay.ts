export interface SepayConfig {
  apiToken: string; // API key của SePay (Cài đặt → API Access)
  accountNumber: string; // số tài khoản nhận tiền
  accountName: string; // tên chủ tài khoản (chỉ để hiển thị)
  bankCode: string; // mã/tên ngân hàng theo SePay QR, ví dụ MBBank, Vietcombank
  codePrefix: string; // tiền tố mã nạp, ví dụ NAP
  minDeposit: number; // số tiền nạp tối thiểu (VND)
  orderExpireMinutes: number; // lệnh nạp chờ tối đa bao lâu
  cronEnabled: boolean;
  cronExpression: string; // cron 5 trường, ví dụ "* * * * *"
}

export const SEPAY_DEFAULTS: SepayConfig = {
  apiToken: "",
  accountNumber: "",
  accountName: "",
  bankCode: "",
  codePrefix: "NAP",
  minDeposit: 10000,
  orderExpireMinutes: 30,
  cronEnabled: false,
  cronExpression: "* * * * *",
};

export const SEPAY_KEY_PREFIX = "sepay.";
