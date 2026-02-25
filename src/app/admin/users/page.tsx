"use client";

import * as React from "react";
import { Loader2, Search, Shield, ShieldOff, Trash2, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  emailVerified: boolean;
  studentId?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    variant?: "destructive" | "default";
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => { } });

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=20`
      );
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  React.useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete User",
      description: `Are you sure you want to delete user "${userName}"? This cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "Failed to delete user");
            return;
          }
          toast.success("User deleted");
          fetchUsers();
        } catch {
          toast.error("Something went wrong");
        }
      },
    });
  };

  const toggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setConfirmDialog({
      open: true,
      title: newRole === "admin" ? "Promote to Admin" : "Remove Admin Role",
      description: `Are you sure you want to ${newRole === "admin" ? "promote this user to admin" : "remove admin role from this user"
        }?`,
      confirmLabel: newRole === "admin" ? "Promote" : "Remove",
      variant: newRole === "admin" ? "default" : "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          });
          if (!res.ok) {
            toast.error("Failed to update role");
            return;
          }
          toast.success(`User role updated to ${newRole}`);
          fetchUsers();
        } catch {
          toast.error("Something went wrong");
        }
      },
    });
  };

  const toggleBotAccess = async (userId: string, currentPermissions: string[] = []) => {
    const hasBotAccess = currentPermissions.includes("bot_access");
    const newPermissions = hasBotAccess
      ? currentPermissions.filter(p => p !== "bot_access")
      : [...currentPermissions, "bot_access"];

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermissions }),
      });
      if (!res.ok) {
        toast.error("Failed to update bot access");
        return;
      }
      toast.success(hasBotAccess ? "Bot access removed" : "Bot access granted");
      fetchUsers();
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage users and admin roles
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user._id}>
              <CardContent className="py-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{user.name}</h3>
                      {user.role === "admin" && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                      {(user.permissions || []).includes("bot_access") && (
                        <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                          🤖 Bot
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${user.emailVerified
                          ? "bg-green-500/10 text-green-600"
                          : "bg-yellow-500/10 text-yellow-600"
                          }`}
                      >
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                      {user.studentId && ` · ID: ${user.studentId}`}
                      {` · Joined ${new Date(user.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant={user.role === "admin" ? "destructive" : "outline"}
                      onClick={() => toggleRole(user._id, user.role)}
                    >
                      {user.role === "admin" ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-1" /> Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-1" /> Make Admin
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={(user.permissions || []).includes("bot_access") ? "default" : "outline"}
                      onClick={() => toggleBotAccess(user._id, user.permissions || [])}
                      title={`${(user.permissions || []).includes("bot_access") ? "Revoke" : "Grant"} bot access`}
                      className={(user.permissions || []).includes("bot_access") ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      {(user.permissions || []).includes("bot_access") ? "Bot ✓" : "Bot"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteUser(user._id, user.name)}
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={confirmDialog.onConfirm}
            >
              {confirmDialog.confirmLabel || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
