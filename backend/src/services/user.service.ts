import { notificationService } from "./notification.service";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { ChangePasswordBody, UpdateProfileBody } from "../rules/requests/user.request";
import { comparePassword, hashPassword } from "../utils/password";

export const userService = {
  updateProfile: (userId: number, body: UpdateProfileBody) => userRepository.updateProfile(userId, body),

  async changePassword(userId: number, { currentPassword, newPassword }: ChangePasswordBody) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw AppError.notFound("Không tìm thấy tài khoản");
    if (!(await comparePassword(currentPassword, user.password))) {
      throw new AppError("Mật khẩu hiện tại không đúng", 400, { currentPassword: "Mật khẩu hiện tại không đúng" });
    }
    await userRepository.updatePassword(userId, await hashPassword(newPassword));
    notificationService.passwordChanged({ userId, via: "profile" });
  },
};
