import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">Looking for something?</h1>
      <p className="text-neutral-600">We're sorry. The page you requested could not be found.</p>
      <Link to="/" className="text-link hover:underline">
        Go to amazon-clone's home page
      </Link>
    </div>
  );
}
