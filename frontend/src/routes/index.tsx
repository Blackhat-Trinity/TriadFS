import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { FileExplorerPage } from "@/features/file-explorer/pages/FileExplorerPage";
import { TransferPanelPage } from "@/features/transfer/pages/TransferPanelPage";
import { BenchmarkRunnerPage } from "@/features/benchmark/pages/BenchmarkRunnerPage";
import { BenchmarkComparisonPage } from "@/features/benchmark/pages/BenchmarkComparisonPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/files" replace />} />
      <Route path="/files" element={<FileExplorerPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/transfer" element={<TransferPanelPage />} />
      <Route path="/benchmarks/run" element={<BenchmarkRunnerPage />} />
      <Route path="/benchmarks/compare" element={<BenchmarkComparisonPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/files" replace />} />
    </Routes>
  );
}
