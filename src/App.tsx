
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Console from "./pages/Console";
import NotFound from "./pages/NotFound";
import TitleBar from "./components/desktop/TitleBar";

const queryClient = new QueryClient();

// Inside the desktop host the app is loaded from a file (index.html), so path-
// based routing would 404 on reload/navigation. Use hash routing there.
const isDesktop =
  typeof window !== "undefined" &&
  (Boolean((window as unknown as { __PVSDOST__?: { desktop?: boolean } }).__PVSDOST__?.desktop) ||
    window.location.protocol === "file:" ||
    window.location.pathname.endsWith("/index.html"));

const Router = isDesktop ? HashRouter : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <div className="flex h-screen flex-col overflow-hidden">
          <TitleBar />
          <div className="min-h-0 flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Console />} />
              <Route path="/index.html" element={<Console />} />
              <Route path="/console" element={<Console />} />
              <Route path="/login" element={<Login />} />
              <Route path="/help" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;