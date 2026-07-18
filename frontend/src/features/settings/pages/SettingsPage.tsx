import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getSecuritySettings,
  getStrategySettings,
  updateSecuritySettings,
  updateStrategySettings
} from "@/api/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPage() {
  const strategyQuery = useQuery({ queryKey: ["settings-strategy"], queryFn: getStrategySettings, retry: 0 });
  const securityQuery = useQuery({ queryKey: ["settings-security"], queryFn: getSecuritySettings, retry: 0 });

  const [defaultChunkSize, setDefaultChunkSize] = useState(8192);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [compressionEnabled, setCompressionEnabled] = useState(true);

  const [checksumValidation, setChecksumValidation] = useState(true);
  const [aesOptional, setAesOptional] = useState(true);

  const strategyMutation = useMutation({
    mutationFn: () => updateStrategySettings({ defaultChunkSize, encryptionEnabled, compressionEnabled })
  });
  const securityMutation = useMutation({
    mutationFn: () => updateSecuritySettings({ checksumValidation, aesOptional })
  });

  const onStrategySubmit = (event: FormEvent) => {
    event.preventDefault();
    strategyMutation.mutate();
  };

  const onSecuritySubmit = (event: FormEvent) => {
    event.preventDefault();
    securityMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="strategies">
          <TabsList>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="strategies" className="mt-4">
            <form className="space-y-3" onSubmit={onStrategySubmit}>
              <Input type="number" value={defaultChunkSize} onChange={(event) => setDefaultChunkSize(Number(event.target.value))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={encryptionEnabled} onChange={(event) => setEncryptionEnabled(event.target.checked)} />
                Enable encryption by default
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={compressionEnabled} onChange={(event) => setCompressionEnabled(event.target.checked)} />
                Enable compression by default
              </label>
              <Button type="submit">Save Strategy Settings</Button>
            </form>
            <pre className="mt-3 overflow-auto rounded-md border bg-muted p-2 text-xs">{JSON.stringify(strategyQuery.data, null, 2)}</pre>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <form className="space-y-3" onSubmit={onSecuritySubmit}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={checksumValidation} onChange={(event) => setChecksumValidation(event.target.checked)} />
                Enforce checksum validation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={aesOptional} onChange={(event) => setAesOptional(event.target.checked)} />
                Allow optional AES encryption
              </label>
              <Button type="submit">Save Security Settings</Button>
            </form>
            <pre className="mt-3 overflow-auto rounded-md border bg-muted p-2 text-xs">{JSON.stringify(securityQuery.data, null, 2)}</pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}