"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "TEACHER";
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "SUPER_ADMIN" | "ADMIN" | "TEACHER">("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string | null) => {
    if (!newRole || updatingUserId) return;

    setUpdatingUserId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user role");
      }

      const updated = await res.json();
      setUsers(users.map((u) => (u.id === userId ? updated : u)));
      toast.success("User role updated successfully");
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const limit = 10;

  useEffect(() => {
    fetchUsers();
  }, [page, filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter !== "ALL") {
        params.append("role", filter);
      }

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      const filtered = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setUsers(filtered);
    } else {
      fetchUsers();
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("manageUsers")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("searchFilterUsers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder={t("searchByNameEmail")}
              className="flex-1 px-3 py-2 border rounded border-input bg-background"
              onChange={(e) => handleSearch(e.target.value)}
              minLength={2}
            />
            <Select
              value={filter}
              onValueChange={(value: "ALL" | "SUPER_ADMIN" | "ADMIN" | "TEACHER" | null) => {
                if (value) {
                  setFilter(value);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("filterByRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allUsers")}</SelectItem>
                <SelectItem value="SUPER_ADMIN">{t("superAdmin")}</SelectItem>
                <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                <SelectItem value="TEACHER">{t("teacher")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("users")} ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t("loadingUsers")}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noUsersFound")}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {users.map((user) => {
                  const isCurrentUser = user.id === updatingUserId;
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-4 border rounded hover:bg-muted/50 ${
                        isCurrentUser ? "bg-amber-50 dark:bg-amber-950" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {user.name}
                          {isCurrentUser && <span className="ml-2 text-xs text-amber-600">{t("you")}</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          user.role === "SUPER_ADMIN"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : user.role === "ADMIN"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}>
                          {user.role === "SUPER_ADMIN" ? t("superAdmin") : user.role === "ADMIN" ? t("admin") : t("teacher")}
                        </span>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updatingUserId !== null}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SUPER_ADMIN">{t("superAdmin")}</SelectItem>
                            <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                            <SelectItem value="TEACHER">{t("teacher")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {tc("previous")}
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    {tc("next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}