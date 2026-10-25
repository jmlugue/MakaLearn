import { createHash } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { PLAYGROUND_POLICY_VERSION, normalizePlaygroundText, parsePlaygroundDecision } from "@/utils/playground-grading";
import type { PlaygroundClaim, PlaygroundDecisionStore } from "./playground-checker";

export function playgroundInput(text: string) {
  const normalized = normalizePlaygroundText(text);
  return { normalized, hash: createHash("sha256").update(`${PLAYGROUND_POLICY_VERSION}\n${normalized}`).digest("hex") };
}

/** Only server-authenticated routes create this service-role store. RLS denies
 * direct client access to both decisions and the paid-request quota ledger. */
export function createPlaygroundStore(text: string, userId: string, model: string): PlaygroundDecisionStore {
  const db = createSupabaseServiceRoleClient();
  const { normalized, hash } = playgroundInput(text);
  const query = () => db.from("playground_check_decisions").select("is_valid,construction_type")
    .eq("policy_version", PLAYGROUND_POLICY_VERSION).eq("input_hash", hash);
  const read = async () => {
    const { data, error } = await query().maybeSingle();
    if (error) throw error;
    return data ? parsePlaygroundDecision({ valid: data.is_valid, type: data.construction_type }, text) : null;
  };
  return {
    async claim() {
      const { data, error } = await db.rpc("claim_playground_check", {
        p_policy: PLAYGROUND_POLICY_VERSION, p_hash: hash, p_text: normalized, p_user: userId
      });
      if (error) throw error;
      const claim = data as unknown as PlaygroundClaim;
      if (claim?.state === "ready") {
        const decision = parsePlaygroundDecision(claim.decision, text);
        if (!decision) throw new Error("Invalid saved decision");
        return { state: "ready", decision };
      }
      if (claim?.state === "busy" || claim?.state === "limited" ||
        (claim?.state === "claimed" && typeof claim.token === "string")) return claim;
      throw new Error("Invalid decision claim");
    },
    read,
    async finish(token, decision) {
      const { error } = await db.from("playground_check_decisions").update({
        is_valid: decision.valid, construction_type: decision.type, model,
        decided_at: new Date().toISOString(), lease_token: null, lease_until: null
      }).eq("policy_version", PLAYGROUND_POLICY_VERSION).eq("input_hash", hash)
        .eq("lease_token", token).is("is_valid", null);
      if (error) throw error;
      // An administrator or a replacement lease can win. Always read the winner.
      return read();
    },
    async release(token) {
      const { error } = await db.from("playground_check_decisions").update({
        lease_token: null, lease_until: new Date(Date.now() + 60_000).toISOString()
      }).eq("policy_version", PLAYGROUND_POLICY_VERSION).eq("input_hash", hash)
        .eq("lease_token", token).is("is_valid", null);
      if (error) throw error;
    }
  };
}
