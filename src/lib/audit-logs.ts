import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppUser, AuditLog, AuditLogAction, AuditLogCategory } from "@/types";
import type { Database } from "@/types/database";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

const LOCAL_AUDIT_LOGS_KEY = "makalearn-audit-logs";

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

  if (!isSupabaseConfigured()) {
    storeLocalAuditLog(log);
    return log;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    storeLocalAuditLog(log);
    return log;
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
    storeLocalAuditLog(log);
    return log;
  }

  return mapAuditLogRow(data);
}

export async function fetchAuditLogs() {
  if (!isSupabaseConfigured()) {
    return getLocalAuditLogs();
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return getLocalAuditLogs();
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    return getLocalAuditLogs();
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

function getLocalAuditLogs() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    return value ? (JSON.parse(value) as AuditLog[]) : [];
  } catch {
    return [];
  }
}

function storeLocalAuditLog(log: AuditLog) {
  if (typeof window === "undefined") return;

  const logs = [log, ...getLocalAuditLogs()].slice(0, 80);
  window.localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(logs));
}
