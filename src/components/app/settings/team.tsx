"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Loader2, MoreHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonAvatar } from "@/components/app/avatar";
import { Segmented } from "@/components/app/segmented";
import { inviteStaff, newPasswordLink, setStaffActive, updateStaff } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";
import { SettingsSection } from "./section";

export type TeamMember = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "staff";
  active: boolean;
  students: number;
};

function LinkResult({ link, emailed, onClose }: { link: string; emailed: boolean; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Send them this link</DialogTitle>
        <DialogDescription>
          {emailed
            ? "We emailed it too. You can also send it on WhatsApp."
            : "Email isn't set up yet, so send this link on WhatsApp or email yourself. It works once and expires in 24 hours."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-line bg-surface p-1 pl-3">
        <code className="block min-w-0 flex-1 truncate text-xs">{link}</code>
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}>
          <Copy /> Copy
        </Button>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

export function TeamSettings({ team, meId }: { team: TeamMember[]; meId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [edit, setEdit] = useState<TeamMember | null>(null);
  const [link, setLink] = useState<{ link: string; emailed: boolean } | null>(null);
  const [pending, start] = useTransition();
  const active = team.filter((t) => t.active);
  const inactive = team.filter((t) => !t.active);

  return (
    <SettingsSection
      title="Team"
      description="Admins see everything. Counsellors only see the students assigned to them."
      action={
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus /> Invite someone
        </Button>
      }
    >
      <ul className="divide-y divide-line rounded-[12px] border border-line">
        {[...active, ...inactive].map((t) => (
          <li key={t.id} className={cn("flex items-center gap-3 p-3", !t.active && "opacity-60")}>
            <PersonAvatar name={t.full_name} className="size-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t.full_name}
                {t.id === meId && <span className="font-normal text-subtle"> (you)</span>}
              </p>
              <p className="truncate text-xs text-subtle">{t.email}</p>
            </div>
            <div className="hidden text-right text-xs text-subtle sm:block">
              <p className={cn(t.role === "admin" && "text-text")}>{t.role === "admin" ? "Admin" : "Counsellor"}</p>
              <p className="num">{t.active ? `${t.students} students` : "Switched off"}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Options for ${t.full_name}`} className="text-subtle">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEdit(t)}>Edit name, phone and role</DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    start(async () => {
                      const res = await newPasswordLink(t.id);
                      if (res.ok) setLink(res.data!);
                      else toast.error(res.error);
                    })
                  }
                >
                  <KeyRound /> New password link
                </DropdownMenuItem>
                {t.id !== meId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant={t.active ? "destructive" : "default"}
                      onSelect={() =>
                        start(async () => {
                          const res = await setStaffActive(t.id, !t.active);
                          if (res.ok)
                            toast.success(
                              t.active
                                ? `${t.full_name} is switched off and signed out${t.students ? `. Reassign their ${t.students} students from the Students page.` : "."}`
                                : `${t.full_name} can sign in again`,
                            );
                          else toast.error(res.error);
                        })
                      }
                    >
                      {t.active ? "Switch off account" : "Switch account back on"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      {pending && <Loader2 className="size-4 animate-spin text-subtle" />}

      <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setLink(null); }}>
        <DialogContent>
          {link ? (
            <LinkResult link={link.link} emailed={link.emailed} onClose={() => { setInviteOpen(false); setLink(null); }} />
          ) : (
            <InviteForm onDone={(r) => setLink(r)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!link && !inviteOpen} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent>{link && <LinkResult link={link.link} emailed={link.emailed} onClose={() => setLink(null)} />}</DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>{edit && <EditForm member={edit} isMe={edit.id === meId} onDone={() => setEdit(null)} />}</DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

function InviteForm({ onDone }: { onDone: (r: { link: string; emailed: boolean }) => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await inviteStaff({ email, full_name: fullName, role });
          if (res.ok) {
            toast.success(`${fullName} added to the team`);
            onDone(res.data!);
          } else toast.error(res.error);
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>Invite someone</DialogTitle>
        <DialogDescription>They get a link to choose their own password.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="inv-name">Name</Label>
          <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label>Role</Label>
          <Segmented
            name="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: "staff", label: "Counsellor" },
              { value: "admin", label: "Admin" },
            ]}
            className="w-full"
          />
          <p className="text-xs text-subtle">
            {role === "admin" ? "Admins see every student and can change settings." : "Counsellors only see students assigned to them."}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Create invite
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ member, isMe, onDone }: { member: TeamMember; isMe: boolean; onDone: () => void }) {
  const [fullName, setFullName] = useState(member.full_name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [role, setRole] = useState(member.role);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateStaff(member.id, { full_name: fullName, phone, role });
          if (res.ok) {
            toast.success("Saved");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>Edit {member.full_name}</DialogTitle>
        <DialogDescription>{member.email}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="ed-name">Name</Label>
          <Input id="ed-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ed-phone">Phone</Label>
          <Input id="ed-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Role</Label>
          <Segmented
            name="Role"
            value={role}
            onChange={setRole}
            disabled={isMe}
            options={[
              { value: "staff", label: "Counsellor" },
              { value: "admin", label: "Admin" },
            ]}
            className="w-full"
          />
          {isMe && <p className="text-xs text-subtle">You can&apos;t change your own role.</p>}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
