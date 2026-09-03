import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppUser, AuditLog, AuditLogAction, AuditLogCategory } from "@/types";
import type { Database } from "@/types/database";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export type AuditLogInput = {
  category: AuditLogCategory;
  action: AuditLogAction;
  actor: Pick<AppUser, "id" | "name">;
  targetType: string;
  targetId?: string;
  targetTitle: string;
  detail?: string;
};

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    category: row.category,
    action: row.action,
    actorId: row.actor_id,
    actorName: row.actor_name,
    targetType: row.target_type,
    targetId: row.target_id ?? undefined,
    targetTitle: row.target_title,
    detail: row.detail,
    createdAt: row.created_at
  };
}

export async function insertAuditLog(input: AuditLogInput) {
  const log = createAuditLog(input);

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Audit logs require Supabase.");
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      id: log.id,
      category: log.category,
      action: log.action,
      actor_id: log.actorId,
      actor_name: log.actorName,
      target_type: log.targetType,
      target_id: log.targetId ?? null,
      target_title: log.targetTitle,
      detail: log.detail,
      created_at: log.createdAt
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAuditLogRow(data);
}

export async function fetchAuditLogs() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Audit logs require Supabase.");
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapAuditLogRow);
}

function createAuditLog(input: AuditLogInput): AuditLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: input.category,
    action: input.action,
    actorId: input.actor.id,
    actorName: input.actor.name,
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    detail: input.detail ?? "",
    createdAt: new Date().toISOString()
  };
}
