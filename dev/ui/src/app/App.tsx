import { Toaster } from "sonner";
import AppShell from "../components/layout/AppShell";
import AppRouter from "./router";

export default function App() {
  return (
    <>
      <AppShell>
        <AppRouter />
      </AppShell>
      <Toaster position="top-right" richColors />
    </>
  );
}
