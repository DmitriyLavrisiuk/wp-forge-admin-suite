import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import HelloPage from "../pages/HelloPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HelloPage />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}
