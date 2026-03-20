"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lock, Save, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { useAcademicContext } from "@/context/academic-context";

export default function CredentialsPage() {
  const { status } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  
  const [ucamPassword, setUcamPassword] = React.useState("");
  const [autoSync, setAutoSync] = React.useState(false);
  
  const [hasCredentials, setHasCredentials] = React.useState(false);
  const { syncAcademicData, isSyncing } = useAcademicContext();

  React.useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/credentials")
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setHasCredentials(data.data.hasCredentials);
            setAutoSync(data.data.autoSync);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ucamPassword && !hasCredentials) {
      toast.error("Please enter your UCAM Password.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ucamPassword, 
          autoSync 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(ucamPassword ? "UCAM credentials saved and encrypted securely." : "Settings updated.");
        setHasCredentials(true);
        setUcamPassword(""); // Clear for security
      } else {
        toast.error(data.error || "Failed to save credentials");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    if (!hasCredentials) {
       toast.error("Please save your credentials first.");
       return;
    }
    await syncAcademicData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          Linked Accounts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Securely connect your university accounts to enable automated syncing.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card className="border-white/10 bg-background/25 backdrop-blur-xl relative overflow-hidden">
          {/* subtle glow bg */}
          <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              UIU UCAM Credentials
              {hasCredentials && (
                <ShieldCheck className="h-5 w-5 text-green-500 ml-auto" />
              )}
            </CardTitle>
            <CardDescription>
              Your credentials are AES-256 encrypted using a server-side hardware key.
              Site administrators cannot view your password or grades.
              <br/><br/>
              <b>Note:</b> We will automatically use your verified Student ID to log in. Please update your Student ID in your Personal Info section if it is incorrect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ucamPassword">Portal Password</Label>
              <Input
                id="ucamPassword"
                type="password"
                placeholder={hasCredentials ? "(unchanged)" : "Enter UCAM Password"}
                value={ucamPassword}
                onChange={(e) => setUcamPassword(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 mt-6">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Automatic Syning</Label>
                <CardDescription>
                  Periodically fetch the latest grades directly from UCAM.
                </CardDescription>
              </div>
              <Switch
                checked={autoSync}
                onCheckedChange={setAutoSync}
                disabled={saving}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center gap-4 bg-muted/20 border-t mt-4 py-4">
            {hasCredentials ? (
               <Button type="button" variant="outline" className="gap-2" onClick={handleManualSync} disabled={saving || isSyncing}>
                 <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                 {isSyncing ? "Syncing..." : "Sync Now"}
               </Button>
            ) : <span/>}
            
            <Button type="submit" className="gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {hasCredentials ? "Update Credentials" : "Save Credentials"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </motion.div>
  );
}
