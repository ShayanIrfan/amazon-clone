import { TriangleAlert } from "lucide-react";

export default function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center text-neutral-600">
      <TriangleAlert size={40} className="text-neutral-300" />
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm">Check your connection and try again.</p>
    </div>
  );
}
