import { env } from "../configs/env";
import { prisma } from "../configs/prisma";
import { userRepository } from "../repositories/user.repository";
import { hashPassword } from "../utils/password";

// Tạo tài khoản admin đầu tiên từ ADMIN_EMAIL / ADMIN_PASSWORD (chạy lại không tạo trùng)
const run = async () => {
  const email = env.ADMIN_EMAIL.toLowerCase();
  if (await userRepository.existsByEmail(email)) {
    console.log(`Admin ${email} đã tồn tại, bỏ qua`);
    return;
  }
  await userRepository.create({
    email,
    fullName: "Administrator",
    password: await hashPassword(env.ADMIN_PASSWORD),
    role: "ADMIN",
  });
  console.log(`Đã tạo admin ${email}`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
