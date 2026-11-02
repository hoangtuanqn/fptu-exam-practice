import { Route, Routes } from "react-router-dom";
import NotFoundPage from "./pages/NotFoundPage";
import PracticePage from "./pages/PracticePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PracticePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
