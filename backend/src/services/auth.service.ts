import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { LoginBody, RegisterBody } from "../rules/requests/auth.request";
import { signToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";

const INVALID_LOGIN = "Email hoặc mật khẩu không đúng";

export const authService = {
  async register({ email, fullName, password }: RegisterBody) {
    if (await userRepository.existsByEmail(email)) {
      throw AppError.conflict("Email đã được sử dụng", { email: "Email đã được sử dụng" });
    }
    const user = await userRepository.create({ email, fullName, password: await hashPassword(password) });
    return { token: signToken(user.id), user };
  },

  async login({ email, password }: LoginBody) {
    const found = await userRepository.findByEmailWithPassword(email);
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào tồn tại
    if (!found || !(await comparePassword(password, found.password))) throw new AppError(INVALID_LOGIN, 401);
    if (found.status === "BANNED") throw AppError.forbidden("Tài khoản đã bị khoá");

    const user = await userRepository.findById(found.id);
    return { token: signToken(found.id), user };
  },
};
