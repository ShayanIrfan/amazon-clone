import { useQuery } from "@tanstack/react-query";

async function fetchHealth() {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("API health check failed");
  return res.json() as Promise<{ ok: boolean; db: string }>;
}

export default function HomePage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">amazon-clone</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Milestone 0 scaffold. API status:{" "}
        {isLoading ? "checking…" : isError ? "unreachable" : `${data?.db}`}
      </p>
    </main>
  );
}
