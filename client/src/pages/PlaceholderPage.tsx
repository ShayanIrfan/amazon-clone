import { Link } from "react-router";

export default function PlaceholderPage({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
      <p className="text-neutral-600">This is coming in {milestone}.</p>
      <Link to="/" className="text-link hover:underline">
        Back to home
      </Link>
    </div>
  );
}
