import { DragEvent, FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, Layers3 } from "lucide-react";
import { runBenchmark } from "@/api/benchmarks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const strategyDefaults = ["WHOLE_FILE", "STREAMING", "SEQUENTIAL_CHUNK", "PARALLEL_CHUNK", "COMPRESSED", "ENCRYPTED"];

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function BenchmarkRunnerPage() {
  const [scenarioName, setScenarioName] = useState("WAN profile - 1GB mixed corpus");
  const [chunkSize, setChunkSize] = useState(8192);
  const [payloadSizeBytes, setPayloadSizeBytes] = useState(1024 * 1024);
  const [iterations, setIterations] = useState(1);
  const [selected, setSelected] = useState<string[]>([...strategyDefaults]);
  const [draggingStrategy, setDraggingStrategy] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const availableStrategies = useMemo(
    () => strategyDefaults.filter((item) => !selected.includes(item)),
    [selected]
  );

  const runMutation = useMutation({
    mutationFn: () =>
      runBenchmark({
        fileNodeId: "00000000-0000-0000-0000-000000000001",
        scenarioName,
        chunkSize,
        payloadSizeBytes,
        iterations,
        strategies: selected
      })
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    runMutation.mutate();
  };

  const handleDatasetDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) {
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    setPayloadSizeBytes(totalBytes);
    setScenarioName(files.length === 1 ? `Dropped dataset - ${files[0].name}` : `Dropped dataset - ${files.length} files`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmark Runner</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-muted-foreground">Scenario</label>
            <Input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Chunk Size</label>
            <Input type="number" value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Payload Size (bytes)</label>
            <Input type="number" value={payloadSizeBytes} onChange={(event) => setPayloadSizeBytes(Number(event.target.value))} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Iterations</label>
            <Input type="number" value={iterations} onChange={(event) => setIterations(Number(event.target.value))} />
          </div>

          <div
            className={`rounded-xl border border-dashed p-4 transition-colors md:col-span-2 ${dropActive ? "border-sky-400 bg-sky-500/10" : "border-border bg-card/30"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDatasetDrop}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Layers3 className="h-4 w-4" />
              Drop dataset files here
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Dropping files updates the benchmark payload size automatically. This is useful when you want to simulate a real corpus instead of typing byte counts manually.
            </p>
          </div>

          <div className="md:col-span-2 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Execution Order</p>
              <div className="grid gap-2">
                {selected.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    draggable
                    onDragStart={() => setDraggingStrategy(item)}
                    onDragEnd={() => setDraggingStrategy(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggingStrategy || draggingStrategy === item) {
                        return;
                      }
                      const fromIndex = selected.indexOf(draggingStrategy);
                      setSelected((current) => moveArrayItem(current, fromIndex, index));
                    }}
                    className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm transition hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {item}
                    </span>
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-muted-foreground">Available Strategies</p>
              <div className="grid gap-2">
                {availableStrategies.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelected((current) => [...current, item])}
                    className="rounded-lg border border-dashed px-3 py-2 text-left text-sm transition hover:bg-muted"
                  >
                    Add {item}
                  </button>
                ))}
                {availableStrategies.length === 0 ? (
                  <div className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">All strategies selected</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={runMutation.isPending || selected.length === 0}>
              {runMutation.isPending ? "Running benchmarks..." : "Run Benchmark Suite"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelected([...strategyDefaults])}>
              Reset Order
            </Button>
          </div>
        </form>

        {runMutation.data && (
          <pre className="mt-4 overflow-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(runMutation.data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
