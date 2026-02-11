"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, RotateCcw, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDomainsPage() {
  const [domains, setDomains] = React.useState<string[]>([]);
  const [defaults, setDefaults] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [newDomain, setNewDomain] = React.useState("");

  React.useEffect(() => {
    fetch("/api/admin/domains")
      .then((r) => r.json())
      .then((d) => {
        setDomains(d.domains || []);
        setDefaults(d.defaults || []);
      })
      .catch(() => toast.error("Failed to load domains"))
      .finally(() => setLoading(false));
  }, []);

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(d)) {
      toast.error("Invalid domain format");
      return;
    }
    if (domains.includes(d)) {
      toast.error("Domain already exists");
      return;
    }
    setDomains([...domains, d]);
    setNewDomain("");
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  const resetToDefaults = () => {
    setDomains([...defaults]);
    toast.info("Reset to default domains");
  };

  const saveDomains = async () => {
    if (domains.length === 0) {
      toast.error("At least one domain is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Domains saved successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Domains</h1>
        <p className="text-muted-foreground">
          Manage which email domains are allowed for registration. Only UIU
          email addresses matching these domains can create accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Allowed Domains ({domains.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new domain */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g. newdept.uiu.ac.bd"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
            />
            <Button onClick={addDomain} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Domain list */}
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {domains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
              >
                <span className="text-sm font-mono">{domain}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeDomain(domain)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-between pt-2 border-t">
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset to Defaults
            </Button>
            <Button onClick={saveDomains} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Domains
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
