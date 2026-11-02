import { Router } from "express";
import { userController } from "../controllers/user.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { changePasswordBody, updateProfileBody } from "../rules/requests/user.request";
import { paginationQuery } from "../utils/pagination";

const userRouter = Router();

// Toàn bộ /users/me/* yêu cầu đăng nhập
userRouter.use(authenticate);

userRouter.get("/me", userController.profile);
userRouter.patch("/me", validate(updateProfileBody), userController.updateProfile);
userRouter.patch("/me/password", validate(changePasswordBody), userController.changePassword);
userRouter.get("/me/transactions", validate(paginationQuery, "query"), userController.transactions);

export default userRouter;
