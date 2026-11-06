"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { api } from "@/lib/api";

type PaymentRow = {
  id: number;
  user_id: number;
  amount: string;
  currency: string;
  status: string;
  gateway_transaction_id: string | null;
  created_at: string;
};

const columns: ColumnDef<PaymentRow>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "user_id", header: "User" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `${row.original.currency} ${row.original.amount}`,
  },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
];

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PaymentRow[]>("/api/payments")
      .then(setRows)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="text-3xl font-semibold">Payments</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Subscription charges recorded by the API.</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading payments…</p> : null}
      <div className="mt-6">
        <DataTable columns={columns} data={rows} emptyLabel="No payments yet." />
      </div>
    </>
  );
}
