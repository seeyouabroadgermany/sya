"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonAvatar } from "@/components/app/avatar";
import { StudentCardBody } from "@/components/app/pipeline/student-card";
import { assignMany } from "@/lib/actions/leads";
import { LEAD_SOURCES, LEVELS, STATUSES, labelOf, type LeadSource, type Level, type StudentStatus } from "@/lib/constants";
import { downloadRows } from "@/lib/export";
import { formatDate, intakeLabel, relativeDay, todayIST } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardStudent } from "@/lib/data";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
  rowSelectionFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
const h = createColumnHelper<typeof features, BoardStudent>();

const intakeKey = (s: BoardStudent) => (s.intake_year ? s.intake_year * 100 + (s.intake_month ?? 0) : null);

const allColumns = h.columns([
  h.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all students"
        className="size-4"
        checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
        onCheckedChange={(c) => table.toggleAllRowsSelected(c === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.full_name}`}
        className="size-4"
        checked={row.getIsSelected()}
        onCheckedChange={(c) => row.toggleSelected(c === true)}
      />
    ),
  }),
  h.accessor("full_name", {
    header: "Student",
    sortFn: "text",
    cell: ({ row }) => (
      <Link href={`/students/${row.original.id}`} className="block min-w-0 py-1 hover:underline">
        <span className="block truncate font-medium">{row.original.full_name}</span>
        <span className="num block truncate text-xs text-subtle">{row.original.phone}</span>
      </Link>
    ),
  }),
  h.accessor("stage_position", {
    header: "Stage",
    sortFn: "basic",
    cell: ({ row }) => {
      const s = row.original;
      return (
        <span className="block min-w-0">
          <span className="block truncate">
            <span className="num text-subtle">{s.stage_position}.</span> {s.stage_name}
          </span>
          <span className={cn("num block text-xs text-subtle", s.is_stuck && "text-warning")}>
            {s.steps_done}/{s.steps_total} steps, {s.days_in_stage}d{s.is_stuck ? " (stuck)" : ""}
          </span>
        </span>
      );
    },
  }),
  h.accessor("status", {
    header: "Status",
    sortFn: "text",
    cell: ({ getValue }) => <StatusLabel status={getValue() as StudentStatus} />,
  }),
  h.accessor("counsellor_name", {
    header: "Counsellor",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ getValue }) => (
      <span className="flex min-w-0 items-center gap-2">
        <PersonAvatar name={getValue()} />
        <span className="truncate">{getValue() ?? <span className="text-subtle">Unassigned</span>}</span>
      </span>
    ),
  }),
  h.accessor("final_university", {
    header: "University",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ getValue }) => <span className="block truncate">{getValue() ?? <span className="text-subtle">Not chosen</span>}</span>,
  }),
  h.accessor(intakeKey, {
    id: "intake",
    header: "Intake",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => (
      <span className="block whitespace-nowrap">
        <span className="num block">{intakeLabel(row.original.intake_month, row.original.intake_year)}</span>
        <span className="block text-xs text-subtle">{labelOf(LEVELS, row.original.level as Level)}</span>
      </span>
    ),
  }),
  h.accessor("docs_ready", {
    header: "Docs",
    sortFn: "basic",
    cell: ({ row }) => (
      <span className={cn("num", (row.original.docs_ready ?? 0) >= (row.original.docs_total ?? 0) && "text-success")}>
        {row.original.docs_ready}/{row.original.docs_total}
      </span>
    ),
  }),
  h.accessor("next_followup_on", {
    header: "Follow-up",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ row }) => {
      const d = row.original.next_followup_on;
      if (!d) return <span className="text-subtle">None</span>;
      return (
        <span className={cn("num whitespace-nowrap", d < todayIST() && "text-danger", d === todayIST() && "text-warning")}>
          {relativeDay(d)}
        </span>
      );
    },
  }),
  h.accessor("created_at", {
    header: "Added",
    sortFn: "text",
    cell: ({ getValue }) => <span className="num whitespace-nowrap text-subtle">{formatDate(getValue())}</span>,
  }),
]);

function StatusLabel({ status }: { status: StudentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-line px-2 py-0.5 text-xs whitespace-nowrap",
        status === "on_hold" && "border-warning/40 text-warning",
        status === "lost" && "border-danger/40 text-danger",
        status === "completed" && "border-success/40 text-success",
      )}
    >
      {labelOf(STATUSES, status)}
    </span>
  );
}

function exportRow(s: BoardStudent) {
  return {
    Name: s.full_name,
    Phone: s.phone,
    WhatsApp: s.whatsapp,
    Email: s.email,
    City: s.city,
    Level: labelOf(LEVELS, s.level as Level),
    Intake: intakeLabel(s.intake_month, s.intake_year),
    Stage: s.stage_name ? `${s.stage_position}. ${s.stage_name}` : "",
    "Steps done": `${s.steps_done}/${s.steps_total}`,
    "Days in stage": s.days_in_stage,
    Stuck: s.is_stuck ? "Yes" : "No",
    Status: labelOf(STATUSES, s.status as StudentStatus),
    Counsellor: s.counsellor_name ?? "Unassigned",
    University: s.final_university ?? "",
    Course: s.final_course ?? s.course_interest ?? "",
    "Lead source": labelOf(LEAD_SOURCES, s.lead_source as LeadSource),
    "Documents ready": `${s.docs_ready}/${s.docs_total}`,
    "Pending payments": s.payments_pending,
    "Next follow-up": formatDate(s.next_followup_on),
    "Drive folder": s.drive_folder_url ?? "",
    Added: formatDate(s.created_at),
  };
}

export function StudentsTable({
  students,
  isAdmin,
  team,
}: {
  students: BoardStudent[];
  isAdmin: boolean;
  team: { id: string; full_name: string }[];
}) {
  const columns = useMemo(() => (isAdmin ? allColumns : allColumns.filter((c) => c.id !== "select")), [isAdmin]);
  const table = useTable({
    features,
    columns,
    data: students,
    getRowId: (row) => row.id!,
    enableRowSelection: isAdmin,
    initialState: {
      sorting: [{ id: "stage_position", desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
    },
  });
  const [assignTo, setAssignTo] = useState("");
  const [pending, start] = useTransition();
  const [exporting, setExporting] = useState(false);
  const selectedIds = table.getSelectedRowIds();
  const rows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.state.pagination;
  const total = table.getPrePaginatedRowModel().rows.length;

  async function exportAs(format: "xlsx" | "csv") {
    setExporting(true);
    try {
      const data = table.getPrePaginatedRowModel().rows.map((r) => exportRow(r.original));
      if (!data.length) return toast.error("Nothing to export with these filters.");
      await downloadRows(data, "syb-students", format);
      toast.success(`Exported ${data.length} students`);
    } finally {
      setExporting(false);
    }
  }

  function bulkAssign() {
    const person = team.find((t) => t.id === assignTo);
    start(async () => {
      const res = await assignMany(selectedIds, assignTo === "none" ? null : assignTo);
      if (res.ok) {
        toast.success(
          assignTo === "none"
            ? `${res.data?.count ?? 0} students unassigned`
            : `${res.data?.count ?? 0} students assigned to ${person?.full_name}`,
        );
        table.resetRowSelection();
        setAssignTo("");
      } else toast.error(res.error);
    });
  }

  return (
    <div className="px-4 pb-24 md:px-6">
      <div className="mb-3 flex items-center gap-2">
        <p className="num flex-1 text-sm text-subtle">
          {total} {total === 1 ? "student" : "students"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={exporting}>
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => exportAs("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportAs("csv")}>CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-[12px] border border-line md:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-surface">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-line">
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort() && header.column.id !== "select";
                  return (
                    <th
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cn(
                        "h-10 px-3 text-left text-xs font-medium whitespace-nowrap text-subtle",
                        header.column.id === "select" && "w-10",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn("inline-flex items-center gap-1 hover:text-text", sorted && "text-text")}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" && <ArrowUp className="size-3" />}
                          {sorted === "desc" && <ArrowDown className="size-3" />}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-line last:border-0 hover:bg-surface",
                  row.getIsSelected() && "bg-brand-soft hover:bg-brand-soft",
                )}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="max-w-48 px-3 py-2 align-middle">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyRows />}
      </div>

      {/* Phone list */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="relative">
            <Link
              href={`/students/${row.original.id}`}
              className={cn(
                "block rounded-[12px] border border-line bg-bg p-3",
                row.original.is_stuck && "border-warning/70",
                isAdmin && "pl-11",
              )}
            >
              <StudentCardBody s={row.original} showStage />
              {row.original.status !== "active" && (
                <div className="mt-2">
                  <StatusLabel status={row.original.status as StudentStatus} />
                </div>
              )}
            </Link>
            {isAdmin && (
              <Checkbox
                aria-label={`Select ${row.original.full_name}`}
                className="absolute top-3.5 left-3.5 size-5"
                checked={row.getIsSelected()}
                onCheckedChange={(c) => row.toggleSelected(c === true)}
              />
            )}
          </li>
        ))}
        {rows.length === 0 && <EmptyRows />}
      </ul>

      {table.getPageCount() > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="num text-sm text-subtle">
            {pageIndex * pageSize + 1}–{Math.min(total, (pageIndex + 1) * pageSize)} of {total}
          </span>
          <Button variant="outline" size="icon" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            <ChevronRight />
          </Button>
        </div>
      )}

      {isAdmin && selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-[232px] md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-sm font-medium">{selectedIds.length} selected</span>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger aria-label="Assign selected students to" className="min-w-44 flex-1 sm:flex-none">
                <SelectValue placeholder="Assign to…" />
              </SelectTrigger>
              <SelectContent>
                {team.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
                <SelectItem value="none">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={!assignTo || pending} onClick={bulkAssign}>
              {pending && <Loader2 className="animate-spin" />}
              Assign
            </Button>
            <Button variant="ghost" className="text-subtle" onClick={() => table.resetRowSelection()}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyRows() {
  return <p className="px-4 py-12 text-center text-sm text-subtle">No students match these filters.</p>;
}
