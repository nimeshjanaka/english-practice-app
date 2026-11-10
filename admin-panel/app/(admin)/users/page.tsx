"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Shell } from "@/components/Shell";
import { DataTable } from "@/components/ui/data-table";
import { api } from "@/lib/api";

type UserRow = {
  id: number;
  email: string;
  role: string;
  created_at: string;
};

const columns: ColumnDef<UserRow>[] = [
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<UserRow[]>("/api/users")
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">Users</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Student accounts use the role user. Admins use the role admin.</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading users…</p> : null}
      <div className="mt-6">
        <DataTable columns={columns} data={users} emptyLabel="No users yet." />
      </div>
    </Shell>
  );
}
