"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Power, ShieldCheck, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/common/toast-provider";
import { Avatar, EmptyRow, Panel, RoleBadge, SearchInput, StatusBadge } from "@/features/admin/admin-shared";
import type { AppUser, UserRole } from "@/types";

type PendingAction =
  | { kind: "role"; account: AppUser; role: UserRole }
  | { kind: "status"; account: AppUser }
  | { kind: "password"; account: AppUser };

type RoleFilter = "all" | UserRole;

const MIN_PASSWORD_LENGTH = 6;
export type StatusFilter = "all" | AppUser["status"];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The request could not be completed.");
  return payload;
}

export function AccountsSection({
  users,
  currentUserId,
  onUserChange,
  onUserAdd,
  onLogsChanged,
  initialStatusFilter = "all",
  addTeacherRequest = 0
}: {
  users: AppUser[];
  currentUserId: string;
  onUserChange: (user: AppUser) => void;
  onUserAdd: (user: AppUser) => void;
  onLogsChanged: () => void;
  initialStatusFilter?: StatusFilter;
  /** Increments when "Add teacher" is clicked on the Home dashboard, which opens the dialog here. */
  addTeacherRequest?: number;
}) {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [addOpen, setAddOpen] = useState(addTeacherRequest > 0);
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    if (addTeacherRequest > 0) setAddOpen(true);
  }, [addTeacherRequest]);

  const activeAdminCount = users.filter((account) => account.role === "admin" && account.status === "active").length;

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((account) => roleFilter === "all" || account.role === roleFilter)
      .filter((account) => statusFilter === "all" || account.status === statusFilter)
      .filter((account) => !term || account.name.toLowerCase().includes(term) || account.email.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roleFilter, search, statusFilter, users]);

  function menuFor(account: AppUser): MenuItem[] {
    const isLastAdmin = account.role === "admin" && account.status === "active" && activeAdminCount <= 1;
    const nextRole: UserRole = account.role === "admin" ? "teacher" : "admin";
    const items: MenuItem[] = [
      {
        label: nextRole === "admin" ? "Make admin" : "Make teacher",
        icon: nextRole === "admin" ? ShieldCheck : UserRound,
        disabled: isLastAdmin,
        onSelect: () => setPending({ kind: "role", account, role: nextRole })
      }
    ];
    if (account.role === "teacher") {
      items.push({ label: "Set temporary password", icon: KeyRound, onSelect: () => setPending({ kind: "password", account }) });
    }
    items.push({ type: "separator" });
    items.push({
      label: account.status === "deactivated" ? "Activate" : "Deactivate",
      icon: Power,
      tone: account.status === "deactivated" ? "default" : "danger",
      disabled: isLastAdmin && account.status !== "deactivated",
      onSelect: () => setPending({ kind: "status", account })
    });
    return items;
  }

  async function runPending() {
    if (!pending) return;
    setWorking(true);
    try {
      if (pending.kind === "role") {
        const { user } = await postJson<{ user: AppUser }>("/api/admin/change-role", { userId: pending.account.id, role: pending.role });
        onUserChange(user);
        notify({ title: "Role updated", description: `${user.name} is now ${user.role === "admin" ? "an admin" : "a teacher"}.`, tone: "success" });
      } else if (pending.kind === "status") {
        const status = pending.account.status === "deactivated" ? "active" : "deactivated";
        const { user } = await postJson<{ user: AppUser }>("/api/admin/account-status", { userId: pending.account.id, status });
        onUserChange(user);
        notify({ title: status === "active" ? "Account activated" : "Account deactivated", description: user.name, tone: "success" });
      } else {
        await postJson<{ message?: string }>("/api/admin/reset-password", { userId: pending.account.id, password: resetPassword });
        notify({ title: "Temporary password set", description: `Share it with ${pending.account.name} privately.`, tone: "success" });
      }
      onLogsChanged();
      setPending(null);
      setResetPassword("");
    } catch (error) {
      notify({ title: "Action failed", description: error instanceof Error ? error.message : "Try again.", tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  const confirmCopy = pending
    ? pending.kind === "role"
      ? {
          title: pending.role === "admin" ? `Make ${pending.account.name} an admin?` : `Make ${pending.account.name} a teacher?`,
          description:
            pending.role === "admin"
              ? "They will be able to manage accounts and see all activity."
              : "They will lose access to the Admin page.",
          confirmLabel: pending.role === "admin" ? "Make admin" : "Make teacher",
          tone: "default" as const
        }
      : pending.kind === "status"
        ? pending.account.status === "deactivated"
          ? {
              title: `Activate ${pending.account.name}?`,
              description: "They will be able to sign in again.",
              confirmLabel: "Activate",
              tone: "default" as const
            }
          : {
              title: `Deactivate ${pending.account.name}?`,
              description: "They will be signed out and cannot sign in until activated.",
              confirmLabel: "Deactivate",
              tone: "danger" as const
            }
        : null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email" label="Search accounts" />
        <div className="w-36">
          <Select aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
            <option value="all">All roles</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </Select>
        </div>
        <div className="w-40">
          <Select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="invited">Invited</option>
          </Select>
        </div>
        <Button type="button" className="ml-auto" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Add account
        </Button>
      </div>

      <Panel>
        <div className="overflow-x-auto clean-scrollbar">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-blue-100 bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-14 px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 ? (
                <EmptyRow colSpan={4}>No accounts match your search.</EmptyRow>
              ) : (
                visibleUsers.map((account) => {
                  const isSelf = account.id === currentUserId;
                  return (
                    <tr key={account.id} className="border-t border-slate-100 first:border-t-0 hover:bg-blue-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={account.name} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">
                              {account.name}
                              {isSelf ? <span className="ml-2 text-xs font-medium text-slate-400">(you)</span> : null}
                            </p>
                            <p className="truncate text-slate-500">{account.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={account.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu
                          label={isSelf ? "You cannot change your own account here" : `Actions for ${account.name}`}
                          items={menuFor(account)}
                          disabled={isSelf}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-xs text-slate-500">
        {visibleUsers.length} of {users.length} accounts
      </p>

      {confirmCopy ? (
        <ConfirmDialog
          open={Boolean(pending)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          tone={confirmCopy.tone}
          loading={working}
          onConfirm={runPending}
          onClose={() => setPending(null)}
        />
      ) : null}

      <Dialog
        open={pending?.kind === "password"}
        onClose={() => {
          if (working) return;
          setPending(null);
          setResetPassword("");
        }}
        title={pending?.kind === "password" ? `Set a temporary password for ${pending.account.name}` : "Set a temporary password"}
        description="Their current password will stop working. Share the new one privately."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (resetPassword.length >= MIN_PASSWORD_LENGTH) runPending();
          }}
        >
          <div>
            <Label htmlFor="reset-temporary-password">Temporary password</Label>
            <Input
              id="reset-temporary-password"
              type="password"
              autoComplete="new-password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              aria-describedby="reset-temporary-password-hint"
            />
            <p id="reset-temporary-password-hint" className="mt-1 text-xs text-slate-500">
              At least {MIN_PASSWORD_LENGTH} characters. They can change it in Profile.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPending(null);
                setResetPassword("");
              }}
              disabled={working}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={working || resetPassword.length < MIN_PASSWORD_LENGTH}>
              {working ? "Working..." : "Set password"}
            </Button>
          </div>
        </form>
      </Dialog>

      <AddAccountDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(user) => {
          onUserAdd(user);
          onLogsChanged();
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function AddAccountDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (user: AppUser) => void }) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("teacher");
    setPassword("");
    setErrors({});
  }

  function close() {
    if (saving) return;
    reset();
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      name: name.trim() ? undefined : "Enter a name.",
      email: email.includes("@") ? undefined : "Enter a valid email.",
      password: password.length >= MIN_PASSWORD_LENGTH ? undefined : `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.password) return;

    setSaving(true);
    try {
      const { user } = await postJson<{ user: AppUser }>("/api/admin/create-teacher", {
        name: name.trim(),
        email: email.trim(),
        role,
        password
      });
      notify({
        title: role === "admin" ? "Admin added" : "Teacher added",
        description: `Share the temporary password with ${user.name} privately.`,
        tone: "success"
      });
      reset();
      onCreated(user);
    } catch (error) {
      notify({ title: "Account not added", description: error instanceof Error ? error.message : "Try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Add account" description="They sign in with the temporary password, then change it in Profile.">
      <form id="add-account-form" className="space-y-4" onSubmit={submit}>
        <div>
          <Label>Role</Label>
          <div className="mt-1">
            <SegmentedControl
              label="Account role"
              value={role}
              onChange={setRole}
              options={[
                { value: "teacher", label: "Teacher" },
                { value: "admin", label: "Admin" }
              ]}
            />
          </div>
          {role === "admin" ? <p className="mt-1 text-xs text-slate-500">Admins can manage accounts and see all activity.</p> : null}
        </div>
        <div>
          <Label htmlFor="new-teacher-name">Name</Label>
          <Input
            id="new-teacher-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "new-teacher-name-error" : undefined}
          />
          <FieldError id="new-teacher-name-error" message={errors.name} />
        </div>
        <div>
          <Label htmlFor="new-teacher-email">School email</Label>
          <Input
            id="new-teacher-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "new-teacher-email-error" : undefined}
          />
          <FieldError id="new-teacher-email-error" message={errors.email} />
        </div>
        <div>
          <Label htmlFor="new-account-password">Temporary password</Label>
          <Input
            id="new-account-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "new-account-password-error" : "new-account-password-hint"}
          />
          {errors.password ? (
            <FieldError id="new-account-password-error" message={errors.password} />
          ) : (
            <p id="new-account-password-hint" className="mt-1 text-xs text-slate-500">
              Share it privately. They can change it in Profile.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding..." : role === "admin" ? "Add admin" : "Add teacher"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
