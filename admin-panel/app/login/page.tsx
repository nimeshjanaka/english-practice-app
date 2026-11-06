"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await axios.post<{ access_token: string }>(`${API_URL}/api/v1/auth/login`, {
        email,
        password,
      });
      const token = response.data.access_token;
      const me = await axios.get<{ role: string }>(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (me.data.role !== "admin") {
        setError("Login failed. Use an admin account.");
        return;
      }
      localStorage.setItem("admin_token", token);
      router.push("/dashboard");
    } catch {
      setError("Login failed. Use an admin account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl rise">
        <p className="text-xs tracking-[0.2em] text-brand">YAYTALK</p>
        <h1 className="mt-2 text-2xl font-semibold">Content studio</h1>
        <p className="mt-1 text-sm text-slate-500">Admin sign-in. Student accounts stay out of the studio.</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input id="email" className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          className="mt-1"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button className="mt-6 w-full" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
