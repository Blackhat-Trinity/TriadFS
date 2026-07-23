import { FileText, Folder, HardDrive, Info, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DesktopPathMetadata } from "@/types";

interface PropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: DesktopPathMetadata | null;
  loading: boolean;
  pathLabel: string | null;
  formatBytes: (bytes: number) => string;
  formatDate: (value: string) => string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-[#20242a] py-2 text-sm last:border-b-0">
      <span className="text-zinc-500">{label}</span>
      <span className="break-all text-zinc-200">{value}</span>
    </div>
  );
}

export function PropertiesDialog({
  open,
  onOpenChange,
  metadata,
  loading,
  pathLabel,
  formatBytes,
  formatDate
}: PropertiesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Properties</DialogTitle>
          <DialogDescription>Inspect the real metadata, storage footprint, and location details for this item.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-zinc-400">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            Loading metadata...
          </div>
        ) : metadata ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#24272d] bg-[#17191d] p-4">
              {metadata.kind === "FOLDER" ? (
                <Folder className="mt-0.5 h-9 w-9 shrink-0 text-amber-300" />
              ) : (
                <FileText className="mt-0.5 h-9 w-9 shrink-0 text-zinc-300" />
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-zinc-100">{metadata.name}</p>
                <p className="mt-1 break-all text-xs text-zinc-500">{pathLabel ?? metadata.path}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-[#24272d] bg-[#121417] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Info className="h-4 w-4 text-zinc-400" />
                  Identity
                </div>
                <DetailRow label="Type" value={metadata.kind === "FOLDER" ? "Folder" : "File"} />
                <DetailRow label="Extension" value={metadata.extension ? metadata.extension.toUpperCase() : "-"} />
                <DetailRow label="MIME" value={metadata.mimeType} />
                <DetailRow label="Hidden" value={metadata.hidden ? "Yes" : "No"} />
                <DetailRow label="Writable" value={metadata.writable ? "Yes" : "No"} />
                <DetailRow label="Symlink" value={metadata.symlink ? "Yes" : "No"} />
                <DetailRow label="Parent" value={metadata.parentPath} />
                <DetailRow label="Location" value={metadata.path} />
              </section>

              <section className="rounded-xl border border-[#24272d] bg-[#121417] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <HardDrive className="h-4 w-4 text-zinc-400" />
                  Footprint
                </div>
                <DetailRow label="Size" value={formatBytes(metadata.sizeBytes)} />
                <DetailRow label="Files" value={metadata.fileCount.toString()} />
                <DetailRow label="Folders" value={metadata.folderCount.toString()} />
                <DetailRow label="Items" value={metadata.itemCount.toString()} />
              </section>
            </div>

            <section className="rounded-xl border border-[#24272d] bg-[#121417] p-4">
              <div className="mb-3 text-sm font-semibold text-zinc-200">Timeline</div>
              <DetailRow label="Created" value={formatDate(metadata.createdAt)} />
              <DetailRow label="Modified" value={formatDate(metadata.updatedAt)} />
              <DetailRow label="Accessed" value={formatDate(metadata.accessedAt)} />
            </section>

            <section className="rounded-xl border border-[#24272d] bg-[#121417] p-4">
              <div className="mb-3 text-sm font-semibold text-zinc-200">Integrity</div>
              <DetailRow label="SHA-256" value={metadata.sha256 ?? (metadata.kind === "FILE" ? "Not computed for large files" : "Folder")} />
            </section>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#24272d] bg-[#121417] p-4 text-sm text-zinc-400">
            No metadata available for this item.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
