"use client";

import * as React from "react";
import { Loader2, Check, X, Edit, Eye, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FacultyAddRequestsTab from "./FacultyAddRequestsTab";
import FacultyEditRequestsTab from "./FacultyEditRequestsTab";

/* ─────── Uniqueness Check Hook ─────── */
function useUniquenessCheck(url: string, paramKey: string, minLen = 2) {
  const [value, setValue] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const check = React.useCallback(
    (val: string) => {
      setValue(val);
      setAvailable(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (val.trim().length < minLen) {
        setChecking(false);
        return;
      }
      setChecking(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `${url}?${paramKey}=${encodeURIComponent(val.trim())}`
          );
          const data = await res.json();
          setAvailable(data.available);
        } catch {
          setAvailable(null);
        } finally {
          setChecking(false);
        }
      }, 400);
    },
    [url, paramKey, minLen]
  );

  const reset = React.useCallback(() => {
    setValue("");
    setAvailable(null);
    setChecking(false);
  }, []);

  return { value, check, checking, available, reset, setValue };
}

/* ─────── Availability Indicator ─────── */
function AvailabilityIndicator({
  checking,
  available,
  label,
}: {
  checking: boolean;
  available: boolean | null;
  label: string;
}) {
  if (checking) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
      </span>
    );
  }
  if (available === true) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-500">
        <Check className="h-3 w-3" /> {label} is available
      </span>
    );
  }
  if (available === false) {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <X className="h-3 w-3" /> {label} is already taken
      </span>
    );
  }
  return null;
}

const UIU_DEPARTMENTS = [
  "CSE", "EEE", "CE", "BBA", "Economics", "English",
  "Mathematics", "Physics", "Pharmacy", "Law", "BSDS", "General Education",
];

const DESIGNATIONS = [
  "Lecturer", "Senior Lecturer", "Assistant Professor",
  "Associate Professor", "Professor", "Adjunct Faculty",
];

interface FacultyRequest {
  _id: string;
  name: string;
  initials: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  github: string;
  linkedin: string;
  scholar: string;
  bio: string;
  status: string;
  adminNote: string;
  approvedEdits: Record<string, string> | null;
  requestedBy: { name: string; email: string } | null;
  reviewedBy: { name: string; email: string } | null;
  reviewedAt: string;
  createdAt: string;
}

/* Helper to render a field with optional change indicator */
function ChangedField({ label, original, changed }: { label: string; original: string; changed?: string }) {
  const hasChange = changed !== undefined && changed !== original;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {hasChange ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm line-through text-muted-foreground/70">{original || "—"}</span>
          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
          <span className="text-sm font-medium text-primary">{changed || "—"}</span>
        </div>
      ) : (
        <p className="text-sm">{original || "—"}</p>
      )}
    </div>
  );
}

import { useSearchParams } from "next/navigation";

export default function FacultyRequestsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "edit" ? "edit" : "add";
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {activeTab === "add" ? "New Faculty Additions" : "Faculty Edit Requests"}
        </h1>
        <p className="text-muted-foreground">
          {activeTab === "add"
            ? "Review and manage requests to add new faculty members"
            : "Review and manage faculty edit suggestions from users"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="add">New Faculty Additions</TabsTrigger>
          <TabsTrigger value="edit">Faculty Edits</TabsTrigger>
        </TabsList>
        <TabsContent value="add" className="mt-0">
          <FacultyAddRequestsTab />
        </TabsContent>
        <TabsContent value="edit" className="mt-0">
          <FacultyEditRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
