/**
 * Mỗi "đợt" tin nhắn trong ngày: đã gửi `used` tin, tin kế tiếp có cần captcha không?
 * Đợt đầu miễn captcha; hết mỗi đợt đầy đủ (used = batch, 2*batch...) thì tin kế tiếp phải qua captcha.
 */
export const needsCaptcha = (used: number, batch: number) => used >= batch && used % batch === 0;
