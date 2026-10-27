"use client";

import { startTransition, useOptimistic } from "react";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/app/segmented";
import { setDocumentStatus } from "@/lib/actions/money-docs";
import type { DocStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { StudentProfile } from "@/lib/data";

type Doc = StudentProfile["documents"][number];

export function DocumentsTab({
  studentId,
  documents,
  driveUrl,
  onAddDrive,
}: {
  studentId: string;
  documents: Doc[];
  driveUrl: string | null;
  onAddDrive: () => void;
}) {
  const [docs, setDoc] = useOptimistic(documents, (state, u: { id: string; status: DocStatus }) =>
    state.map((d) => (d.document_type.id === u.id ? { ...d, status: u.status } : d)),
  );
  const required = docs.filter((d) => d.document_type.required);
  const ready = required.filter((d) => d.status !== "pending").length;
  const verified = required.filter((d) => d.status === "verified").length;

  function change(id: string, name: string, status: DocStatus) {
    startTransition(async () => {
      setDoc({ id, status });
      const res = await setDocumentStatus(studentId, id, status);
      if (res.ok) toast.success(`${name}: ${status}`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-surface p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            <span className="num">{ready}</span> of <span className="num">{required.length}</span> required documents received
            {verified > 0 && (
              <span className="text-subtle">
                , <span className="num">{verified}</span> verified
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-subtle">Files stay in the student&apos;s Google Drive folder. Tick them here when they arrive.</p>
        </div>
        {driveUrl ? (
          <Button variant="outline" asChild>
            <a href={driveUrl} target="_blank" rel="noopener noreferrer">
              <FolderOpen /> Open Drive folder
            </a>
          </Button>
        ) : (
          <Button variant="outline" onClick={onAddDrive}>
            <FolderOpen /> Add Drive link
          </Button>
        )}
      </div>

      <ul className="divide-y divide-line rounded-[12px] border border-line">
        {docs.map((d) => (
          <li key={d.document_type.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{d.document_type.name}</p>
              <p className="text-xs text-subtle">
                {d.document_type.required ? "Required" : "Optional"}
                {d.status !== "pending" && d.checker?.full_name && `. Marked by ${d.checker.full_name}, ${formatDate(d.updated_at)}`}
              </p>
            </div>
            <Segmented
              name={d.document_type.name}
              value={d.status}
              onChange={(s) => change(d.document_type.id, d.document_type.name, s)}
              options={[
                { value: "pending", label: "Pending" },
                { value: "received", label: "Received" },
                { value: "verified", label: "Verified" },
              ]}
              tone={(v) => (v === "verified" ? "success" : undefined)}
              className="w-full sm:w-auto"
            />
          </li>
        ))}
        {docs.length === 0 && <li className="p-4 text-sm text-subtle">No document types set up yet.</li>}
      </ul>
    </div>
  );
}
