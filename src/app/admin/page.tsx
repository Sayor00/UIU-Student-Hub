"use client";

import * as React from "react";
import { Loader2, Users, GraduationCap, MessageSquare, ClipboardList, TrendingUp, FileQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats?.stats) {
    return <p className="text-muted-foreground">Failed to load dashboard.</p>;
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.stats.totalUsers,
      icon: Users,
      sub: `${stats.stats.verifiedUsers} verified`,
    },
    {
      label: "Faculty Members",
      value: stats.stats.totalFaculty,
      icon: GraduationCap,
      sub: "approved",
    },
    {
      label: "Total Reviews",
      value: stats.stats.totalReviews,
      icon: MessageSquare,
      sub: "all time",
    },
    {
      label: "Pending Requests",
      value: stats.stats.pendingRequests,
      icon: ClipboardList,
      sub: "need review",
      highlight: stats.stats.pendingRequests > 0,
    },
    {
      label: "QB Submissions",
      value: stats.stats.pendingQBSubmissions || 0,
      icon: FileQuestion,
      sub: "pending review",
      highlight: (stats.stats.pendingQBSubmissions || 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of UIU Student Hub</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={stat.highlight ? "border-orange-500/50 bg-orange-500/5" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${stat.highlight ? "text-orange-500" : "text-muted-foreground"
                  }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers?.length === 0 && (
                <p className="text-sm text-muted-foreground">No users yet</p>
              )}
              {stats.recentUsers?.map((user: any) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role === "admin" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Admin
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pending Faculty Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentRequests?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No pending requests
                </p>
              )}
              {stats.recentRequests?.map((req: any) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {req.name} ({req.initials})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.department} &middot; by{" "}
                      {req.requestedBy?.name || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
