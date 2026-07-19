import { DragEvent, FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileUp, Upload } from "lucide-react";
import { listStrategies, runTransfer } from "@/api/transfer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { demoBenchmarks } from "@/lib/demo-data";
import type { StrategyType } from "@/types";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function utf8ToBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

function isTextLikeFile(file: File): boolean {
  return file.type.startsWith("text/") || /\.(txt|md|json|csv|log|xml|ya?ml|html|css|js|jsx|ts|tsx|java|sql|properties|env)$/i.test(file.name);
}

export function TransferPanelPage() {
  const [strategy, setStrategy] = useState<StrategyType>("PARALLEL_CHUNK");
  const [chunkSize, setChunkSize] = useState(8192);
  const [payloadText, setPayloadText] = useState("Synthetic payload for transfer experiments");
  const [payloadBase64, setPayloadBase64] = useState<string | null>(null);
  const [payloadLabel, setPayloadLabel] = useState<string>("Typed payload");
  const [dropActive, setDropActive] = useState(false);

  const { data: strategies } = useQuery({ queryKey: ["strategies"], queryFn: listStrategies, retry: 0 });
  const transferMutation = useMutation({
    mutationFn: (body: { strategyType: StrategyType; chunkSize: number; payloadBase64: string }) =>
      runTransfer({ fileNodeId: "00000000-0000-0000-0000-000000000001", ...body })
  });

  const payloadSummary = useMemo(() => {
    const bytes = payloadBase64 ? Math.floor((payloadBase64.length * 3) / 4) : new TextEncoder().encode(payloadText).length;
    return `${payloadLabel} | ${bytes.toLocaleString()} bytes`;
  }, [payloadBase64, payloadLabel, payloadText]);

  const applyDroppedFile = async (file: File) => {
    if (isTextLikeFile(file)) {
      const text = await file.text();
      setPayloadText(text);
      setPayloadBase64(null);
      setPayloadLabel(`${file.name} (text)`);
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    setPayloadBase64(bytesToBase64(bytes));
    setPayloadText(`[Binary payload loaded from ${file.name}]`);
    setPayloadLabel(`${file.name} (${bytes.length.toLocaleString()} bytes)`);
  };

  const handlePayloadDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await applyDroppedFile(file);
      return;
    }

    const droppedText = event.dataTransfer.getData("text/plain").trim();
    if (droppedText) {
      setPayloadText(droppedText);
      setPayloadBase64(null);
      setPayloadLabel("Dropped text");
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const encodedPayload = payloadBase64 ?? utf8ToBase64(payloadText);
    transferMutation.mutate({ strategyType: strategy, chunkSize, payloadBase64: encodedPayload });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload / Transfer Control Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Transfer Strategy</label>
              <select
                value={strategy}
                onChange={(event) => setStrategy(event.target.value as StrategyType)}
                className="h-10 w-full rounded-md border bg-card px-3"
              >
                {(strategies ?? ["WHOLE_FILE", "STREAMING", "SEQUENTIAL_CHUNK", "PARALLEL_CHUNK", "COMPRESSED", "ENCRYPTED"]).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Chunk Size (bytes)</label>
              <Input type="number" value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} />
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDropActive(true);
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={(event) => void handlePayloadDrop(event)}
              className={`rounded-xl border p-3 transition-colors ${dropActive ? "border-sky-400 bg-sky-500/10" : "border-border bg-card/30"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm text-muted-foreground">Payload</label>
                <span className="text-xs text-muted-foreground">{payloadSummary}</span>
              </div>
              <textarea
                value={payloadText}
                onChange={(event) => {
                  setPayloadText(event.target.value);
                  setPayloadBase64(null);
                  setPayloadLabel("Typed payload");
                }}
                className="min-h-36 w-full rounded-md border bg-card p-3 text-sm"
              />
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>Drop a text file, binary file, or plain text here to use it as the transfer payload.</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Executing..." : "Execute Transfer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Strategy Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-xl border border-dashed bg-card/30 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <FileUp className="h-4 w-4" />
              Drag-and-drop enabled
            </div>
            <p className="mt-2">The payload editor accepts dropped files or text. Text files stay editable, binary files are encoded automatically for transfer tests.</p>
          </div>

          {demoBenchmarks.map((item) => (
            <div key={item.runId} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.strategyType}</span>
                <span>{item.transferTimeMs} ms</span>
              </div>
              <p className="text-muted-foreground">{item.throughputMbps.toFixed(0)} Mbps | {item.peakMemoryMb} MB | ${item.costEstimateUsd.toFixed(4)}</p>
            </div>
          ))}

          {transferMutation.data && (
            <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(transferMutation.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
