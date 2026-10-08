"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Copy, Eye, EyeOff, KeyRound, Mail, Power, ShieldCheck, UserPlus, UserRound, UserX, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { Avatar, EmptyRow, FilterSelect, Panel, RoleBadge, SearchInput, StatusBadge } from "@/features/admin/admin-shared";
import { cn } from "@/lib/utils";
import type { AccountRequest, AppUser, UserRole } from "@/types";

type PendingAction =
  | { kind: "role"; account: AppUser; role: UserRole }
  | { kind: "status"; account: AppUser }
  | { kind: "password"; account: AppUser };

type RoleFilter = "all" | UserRole;
type RequestAction = { kind: "approve" | "reject"; request: AccountRequest };

const MIN_PASSWORD_LENGTH = 8;
/**
 * Account requests are hidden for now (owner, Oct 3) while the request flow is reworked. The approve and reject code,
 * its dialogs, and the API routes are untouched; set this to true to show the section again.
 */
const SHOW_ACCOUNT_REQUESTS = false;

const REQUEST_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  requests,
  currentUserId,
  onUserChange,
  onUserAdd,
  onRequestReviewed,
  onLogsChanged,
  initialStatusFilter = "all"
}: {
  users: AppUser[];
  requests: AccountRequest[];
  currentUserId: string;
  onUserChange: (user: AppUser) => void;
  onUserAdd: (user: AppUser) => void;
  onRequestReviewed: (request: AccountRequest) => void;
  onLogsChanged: () => void;
  initialStatusFilter?: StatusFilter;
}) {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [requestAction, setRequestAction] = useState<RequestAction | null>(null);
  const [requestPassword, setRequestPassword] = useState("");
  const [requestWorking, setRequestWorking] = useState(false);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);
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

  async function runRequestAction() {
    if (!requestAction) return;
    setRequestWorking(true);
    try {
      if (requestAction.kind === "approve") {
        const result = await postJson<{ user: AppUser; request: AccountRequest }>(
          "/api/admin/account-requests/approve",
          { requestId: requestAction.request.id, password: requestPassword }
        );
        onUserAdd(result.user);
        onRequestReviewed(result.request);
        notify({
          title: "Account approved",
          description: `Share the temporary password with ${result.user.name} privately.`,
          tone: "success"
        });
      } else {
        const result = await postJson<{ request: AccountRequest }>(
          "/api/admin/account-requests/reject",
          { requestId: requestAction.request.id }
        );
        onRequestReviewed(result.request);
        notify({ title: "Request rejected", description: result.request.name, tone: "success" });
      }
      onLogsChanged();
      setRequestAction(null);
      setRequestPassword("");
    } catch (error) {
      notify({
        title: "Request not updated",
        description: error instanceof Error ? error.message : "Try again.",
        tone: "error"
      });
    } finally {
      setRequestWorking(false);
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
      {SHOW_ACCOUNT_REQUESTS ? (
        <section className="rounded-2xl border border-blue-100 bg-[#fff] p-4 shadow-sm sm:p-5" aria-labelledby="account-requests-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="account-requests-title" className="text-xl font-bold text-ink">Account requests</h2>
                  <p className="text-sm text-slate-600">Approve or reject people waiting for teacher access.</p>
                </div>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {requests.length} pending
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-4 py-5 text-center text-sm text-slate-600">
              No account requests are waiting.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {requests.map((accountRequest) => (
                <article key={accountRequest.id} className="rounded-2xl border border-blue-100 bg-[#fff] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={accountRequest.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{accountRequest.name}</p>
                      <p className="truncate text-sm text-slate-500">{accountRequest.email}</p>
                      <p className="mt-1 text-xs text-slate-500">Requested {REQUEST_DATE_FORMATTER.format(new Date(accountRequest.createdAt))}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => setRequestAction({ kind: "reject", request: accountRequest })}>
                      <UserX className="h-4 w-4" aria-hidden="true" /> Reject
                    </Button>
                    <Button type="button" onClick={() => setRequestAction({ kind: "approve", request: accountRequest })}>
                      <Check className="h-4 w-4" aria-hidden="true" /> Approve
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email" label="Search accounts" />
        <FilterSelect
          label="Role"
          className="w-40"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: "all", label: "All" },
            { value: "teacher", label: "Teachers" },
            { value: "admin", label: "Admins" }
          ]}
        />
        <FilterSelect
          label="Status"
          className="w-48"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "deactivated", label: "Deactivated" },
            { value: "invited", label: "Invited" }
          ]}
        />
        <Button type="button" className="ml-auto" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Add account
        </Button>
      </div>

      <Panel>
        <div className="relative overflow-x-auto clean-scrollbar">
          {/* Phones: Name and the menu only; role and status show under the email. */}
          <table className="w-full text-left text-sm">
            <thead className="border-b border-blue-100 bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Role</th>
                <th className="hidden px-4 py-3 sm:table-cell">Status</th>
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
                      <td className="w-full max-w-0 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={account.name} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">
                              {account.name}
                              {isSelf ? <span className="ml-2 text-xs font-medium text-slate-400">(you)</span> : null}
                            </p>
                            <p className="truncate text-slate-500">{account.email}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
                              <RoleBadge role={account.role} />
                              <StatusBadge status={account.status} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <RoleBadge role={account.role} />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
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
        title="Temporary password"
        description="Their old password stops working."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (resetPassword.length >= MIN_PASSWORD_LENGTH) runPending();
          }}
        >
          {pending?.kind === "password" ? <AccountRow account={pending.account} /> : null}
          <PasswordField
            id="reset-temporary-password"
            value={resetPassword}
            onChange={setResetPassword}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it privately.`}
          />
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

      <Dialog
        open={requestAction?.kind === "approve"}
        onClose={() => {
          if (requestWorking) return;
          setRequestAction(null);
          setRequestPassword("");
        }}
        title="Approve teacher account"
        description="This creates an active account. Share the temporary password privately."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (requestPassword.length >= MIN_PASSWORD_LENGTH) runRequestAction();
          }}
        >
          {requestAction?.kind === "approve" ? (
            <AccountRow account={{ ...requestAction.request, role: "teacher", status: "invited" }} />
          ) : null}
          <PasswordField
            id="request-temporary-password"
            value={requestPassword}
            onChange={setRequestPassword}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it privately.`}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setRequestAction(null); setRequestPassword(""); }} disabled={requestWorking}>
              Cancel
            </Button>
            <Button type="submit" disabled={requestWorking || requestPassword.length < MIN_PASSWORD_LENGTH}>
              {requestWorking ? "Approving..." : "Approve account"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={requestAction?.kind === "reject"}
        title={requestAction?.kind === "reject" ? `Reject ${requestAction.request.name}'s request?` : "Reject account request?"}
        description="No sign-in account will be created. They can submit a new request later."
        confirmLabel="Reject request"
        tone="danger"
        loading={requestWorking}
        onConfirm={runRequestAction}
        onClose={() => setRequestAction(null)}
      />
    </div>
  );
}

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** 10 characters without look-alikes (no 0/O, 1/l/I), so it can be read out or copied from paper. */
function generatePassword(length = 10) {
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join("");
}

function AccountRow({ account }: { account: AppUser }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#fff] px-3 py-2.5">
      <Avatar name={account.name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
        <p className="truncate text-xs text-slate-500">{account.email}</p>
      </div>
    </div>
  );
}

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-blue-400" aria-hidden="true" />;
}

/** Password input with show or hide, plus Generate and Copy. Used by both account pop-ups. */
function PasswordField({
  id,
  value,
  onChange,
  hint,
  error
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  error?: string;
}) {
  const { notify } = useToast();
  const [visible, setVisible] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      notify({ title: "Password copied", tone: "success" });
    } catch {
      notify({ title: "Could not copy", description: "Select the password and copy it.", tone: "error" });
    }
  }

  const iconButtonClass =
    "grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={id}>Temporary password</Label>
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
          className="inline-flex items-center gap-1 rounded text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" /> Generate
        </button>
      </div>
      <div className="relative mt-1">
        <FieldIcon icon={KeyRound} />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pl-10 pr-20"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
        <span className="absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 gap-0.5">
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className={iconButtonClass}
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button type="button" onClick={copy} disabled={!value} aria-label="Copy password" className={iconButtonClass}>
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
      </div>
      {error ? <FieldError id={`${id}-error`} message={error} /> : <FieldHint><span id={`${id}-hint`}>{hint}</span></FieldHint>}
    </div>
  );
}

const roleChoices: { value: UserRole; label: string; line: string; icon: LucideIcon }[] = [
  { value: "teacher", label: "Teacher", line: "Content, activities", icon: UserRound },
  { value: "admin", label: "Admin", line: "Plus accounts, logs", icon: ShieldCheck }
];

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
    <Dialog open={open} onClose={close} title="Add account" description="They change the password in Profile.">
      <form id="add-account-form" className="space-y-4" onSubmit={submit}>
        <div>
          <p id="new-account-role" className="text-sm font-semibold text-slate-700">
            Role
          </p>
          <div role="radiogroup" aria-labelledby="new-account-role" className="mt-1 grid grid-cols-2 gap-2">
            {roleChoices.map((choice) => {
              const selected = role === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(choice.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    selected ? "border-blue-500 bg-skywash" : "border-blue-100 bg-[#fff] hover:border-blue-300"
                  )}
                >
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600")}>
                    <choice.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{choice.label}</span>
                    <span className="block text-xs text-slate-500">{choice.line}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label htmlFor="new-teacher-name">Name</Label>
          <div className="relative mt-1">
            <FieldIcon icon={UserRound} />
            <Input
              id="new-teacher-name"
              value={name}
              autoComplete="off"
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              className="pl-10"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "new-teacher-name-error" : undefined}
            />
          </div>
          <FieldError id="new-teacher-name-error" message={errors.name} />
        </div>
        <div>
          <Label htmlFor="new-teacher-email">School email</Label>
          <div className="relative mt-1">
            <FieldIcon icon={Mail} />
            <Input
              id="new-teacher-email"
              type="email"
              value={email}
              autoComplete="off"
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              className="pl-10"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "new-teacher-email-error" : undefined}
            />
          </div>
          <FieldError id="new-teacher-email-error" message={errors.email} />
        </div>
        <PasswordField
          id="new-account-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it privately.`}
          error={errors.password}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {saving ? "Adding..." : role === "admin" ? "Add admin" : "Add teacher"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
