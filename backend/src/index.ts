import { createApp } from "./app";
import { env } from "./configs/env";

createApp().listen(env.PORT, () => {
  console.log(`Server chạy tại http://localhost:${env.PORT}`);
});
