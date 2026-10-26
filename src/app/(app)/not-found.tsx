import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Student not found</h1>
      <p className="mt-2 text-sm text-subtle">
        It may have been removed, or it&apos;s assigned to another counsellor.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to pipeline</Link>
      </Button>
    </div>
  );
}
