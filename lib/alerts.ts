// Email-alert orchestration (SPEC §8.2). Pure and dependency-injected.

import type { Redis } from "@upstash/redis";
import type { Dispatch, Status } from "@/lib/types";
import { buildEmail } from "@/emails/render";

export interface AlertStore {
  isSeeded(): Promise<boolean>;
  markSeeded(): Promise<void>;
  getNotified(): Promise<Set<number>>;
  addNotified(ids: number[]): Promise<void>;
  acquireLock(id: number, ttlSec: number): Promise<boolean>;
  releaseLock(id: number): Promise<void>;
  getSentRecipients(id: number): Promise<Set<string>>;
  addSentRecipient(id: number, email: string): Promise<void>;
  getLastVerdict(): Promise<string | null>;
  setLastVerdict(v: string): Promise<void>;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export function redisStore(redis: Redis): AlertStore {
  return {
    async isSeeded() {
      return (await redis.get("tw:seeded")) !== null;
    },
    async markSeeded() {
      await redis.set("tw:seeded", "1");
    },
    async getNotified() {
      const members = await redis.smembers<string[]>("tw:notified");
      return new Set(members.map(Number).filter((n) => Number.isFinite(n)));
    },
    async addNotified(ids) {
      if (ids.length === 0) return;
      const [first, ...rest] = ids.map(String);
      await redis.sadd("tw:notified", first, ...rest);
    },
    async acquireLock(id, ttlSec) {
      const res = await redis.set(`tw:lock:${id}`, "1", { nx: true, ex: ttlSec });
      return res === "OK";
    },
    async releaseLock(id) {
      await redis.del(`tw:lock:${id}`);
    },
    async getSentRecipients(id) {
      return new Set(await redis.smembers<string[]>(`tw:sent:${id}`));
    },
    async addSentRecipient(id, email) {
      const key = `tw:sent:${id}`;
      await redis.sadd(key, email);
      await redis.expire(key, THIRTY_DAYS);
    },
    async getLastVerdict() {
      const v = await redis.get<string>("tw:last-verdict");
      return typeof v === "string" ? v : null;
    },
    async setLastVerdict(v) {
      await redis.set("tw:last-verdict", v);
    },
  };
}

export function memoryStore(): AlertStore & {
  _state: {
    seeded: boolean;
    notified: Set<number>;
    locks: Set<number>;
    sent: Map<number, Set<string>>;
    lastVerdict: string | null;
  };
} {
  const state = {
    seeded: false,
    notified: new Set<number>(),
    locks: new Set<number>(),
    sent: new Map<number, Set<string>>(),
    lastVerdict: null as string | null,
  };
  return {
    _state: state,
    async isSeeded() {
      return state.seeded;
    },
    async markSeeded() {
      state.seeded = true;
    },
    async getNotified() {
      return new Set(state.notified);
    },
    async addNotified(ids) {
      ids.forEach((i) => state.notified.add(i));
    },
    async acquireLock(id) {
      if (state.locks.has(id)) return false;
      state.locks.add(id);
      return true;
    },
    async releaseLock(id) {
      state.locks.delete(id);
    },
    async getSentRecipients(id) {
      return new Set(state.sent.get(id) ?? []);
    },
    async addSentRecipient(id, email) {
      const s = state.sent.get(id) ?? new Set<string>();
      s.add(email);
      state.sent.set(id, s);
    },
    async getLastVerdict() {
      return state.lastVerdict;
    },
    async setLastVerdict(v) {
      state.lastVerdict = v;
    },
  };
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const e = part.trim().toLowerCase();
    if (e && EMAIL_RE.test(e)) seen.add(e);
  }
  return [...seen];
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type CheckResult = {
  mode: "live" | "dryRun" | "test" | "seed";
  checked: number;
  new: number[];
  sent: number;
  skipped: number[];
  errors: string[];
};

export type CheckDeps = {
  dispatches: Dispatch[];
  store: AlertStore;
  send: (msg: OutgoingEmail) => Promise<void>;
  recipients: string[];
  adminEmail?: string;
  status: Status;
  siteUrl: string;
  log?: (...a: unknown[]) => void;
};

export type CheckOpts = { dryRun?: boolean; test?: boolean };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Strip anything that looks like an email address from an error message. */
function scrub(msg: string): string {
  return msg.replace(/[^\s@<>"',;]+@[^\s@<>"',;]+/g, "[email]").slice(0, 200);
}

export async function runCheck(deps: CheckDeps, opts: CheckOpts = {}): Promise<CheckResult> {
  const { store, send, recipients, status, siteUrl } = deps;
  const log = deps.log ?? (() => {});
  const valid = deps.dispatches
    .filter((d) => d.publishedAt instanceof Date && !Number.isNaN(d.publishedAt.getTime()))
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime() || a.id - b.id);

  const result: CheckResult = {
    mode: opts.test ? "test" : opts.dryRun ? "dryRun" : "live",
    checked: valid.length,
    new: [],
    sent: 0,
    skipped: [],
    errors: [],
  };

  try {
    if (opts.test) {
      const newest = valid[valid.length - 1];
      if (!deps.adminEmail) {
        result.errors.push("ADMIN_EMAIL is not set");
        return result;
      }
      if (!newest) {
        result.errors.push("No dispatches available to send");
        return result;
      }
      const { subject, html, text } = await buildEmail(newest, {
        siteUrl,
        verdictChanged: false,
        status,
      });
      try {
        await send({
          to: deps.adminEmail,
          subject,
          html,
          text,
          idempotencyKey: `test-${newest.id}-${Date.now()}`,
        });
        result.sent = 1;
      } catch (e) {
        result.errors.push(`test send failed: ${scrub(errMsg(e))}`);
      }
      return result;
    }

    if (!(await store.isSeeded())) {
      result.mode = "seed";
      // Seeding from an empty list would later email every existing post, so wait.
      if (valid.length === 0) {
        result.errors.push("No dispatches found; not seeding yet");
        return result;
      }
      result.skipped = valid.map((d) => d.id);
      if (!opts.dryRun) {
        await store.addNotified(valid.map((d) => d.id));
        await store.markSeeded();
        await store.setLastVerdict(status.verdict);
      }
      return result;
    }

    const notified = await store.getNotified();
    const fresh = valid.filter((d) => !notified.has(d.id));
    result.new = fresh.map((d) => d.id);
    if (opts.dryRun || fresh.length === 0) return result;

    if (recipients.length === 0) {
      result.errors.push("ALERT_RECIPIENTS is empty");
      return result;
    }

    const lastVerdict = await store.getLastVerdict();
    const verdictChanged = lastVerdict !== null && lastVerdict !== status.verdict;
    let anySucceeded = false;

    for (const d of fresh) {
      let locked = false;
      try {
        locked = await store.acquireLock(d.id, 300);
        if (!locked) {
          result.skipped.push(d.id);
          continue;
        }
        const email = await buildEmail(d, { siteUrl, verdictChanged, status });
        const already = await store.getSentRecipients(d.id);
        let failed = false;
        for (const to of recipients) {
          if (already.has(to)) continue;
          try {
            await send({ to, ...email, idempotencyKey: `dispatch-${d.id}-${to}` });
            await store.addSentRecipient(d.id, to);
          } catch (e) {
            failed = true;
            result.errors.push(`post ${d.id}: send to ${maskEmail(to)} failed: ${scrub(errMsg(e))}`);
          }
        }
        if (!failed) {
          await store.addNotified([d.id]);
          result.sent += 1;
          anySucceeded = true;
        }
      } catch (e) {
        result.errors.push(`post ${d.id}: ${scrub(errMsg(e))}`);
      } finally {
        if (locked) {
          try {
            await store.releaseLock(d.id);
          } catch (e) {
            log("releaseLock failed", d.id, scrub(errMsg(e)));
          }
        }
      }
    }

    if (anySucceeded && verdictChanged) await store.setLastVerdict(status.verdict);
    return result;
  } catch (e) {
    result.errors.push(scrub(errMsg(e)));
    return result;
  }
}
