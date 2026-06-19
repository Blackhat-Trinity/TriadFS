import { PropsWithChildren } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[#070809]">
      <div className="grid-bg min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_20%),linear-gradient(180deg,#070809_0%,#0a0b0d_45%,#060708_100%)]">
        <div className="mx-auto flex min-h-screen max-w-[1600px]">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <Topbar />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-4"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
