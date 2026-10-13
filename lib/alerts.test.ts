import { describe, expect, it, vi } from "vitest";
import { memoryStore, parseRecipients, runCheck, type OutgoingEmail } from "@/lib/alerts";
import type { Dispatch, Status } from "@/lib/types";

// All dispatches below are synthetic test data.
function mk(id: number, day: number): Dispatch {
  return {
    id,
    slug: `synthetic-${id}`,
    url: `https://example.test/post-${id}`,
    publishedAt: new Date(Date.UTC(2026, 9, day)),
    updatedAt: new Date(Date.UTC(2026, 9, day)),
    kind: "dispatch",
    title: `Earhart expedition update: Synthetic ${id}`,
    lead: `Synthetic lead ${id}.`,
    blocks: [],
    photos: [],
  };
}
const status = (verdict: Status["verdict"] = "investigating"): Status => ({
  phase: "arrived",
  verdict,
  headline: null,
  note: null,
  updatedAt: "",
});

function setup(recipients = ["a@example.com", "b@example.com"]) {
  const store = memoryStore();
  const sent: OutgoingEmail[] = [];
  const send = vi.fn(async (m: OutgoingEmail) => {
    sent.push(m);
  });
  const base = { store, send, recipients, adminEmail: "admin@example.com", status: status(), siteUrl: "https://site.test" };
  return { store, sent, send, base };
}

describe("runCheck", () => {
  it("seed mode sends nothing and marks all notified", async () => {
    const { store, sent, base } = setup();
    const r = await runCheck({ ...base, dispatches: [mk(1, 1), mk(2, 2)] }, {});
    expect(r.mode).toBe("seed");
    expect(r.skipped.sort()).toEqual([1, 2]);
    expect(sent).toHaveLength(0);
    expect([...(await store.getNotified())].sort()).toEqual([1, 2]);
    expect(await store.isSeeded()).toBe(true);
    expect(await store.getLastVerdict()).toBe("investigating");
  });

  it("does not seed from an empty list", async () => {
    const { store, sent, base } = setup();
    const r = await runCheck({ ...base, dispatches: [] }, {});
    expect(r.mode).toBe("seed");
    expect(r.errors).toHaveLength(1);
    expect(sent).toHaveLength(0);
    expect(await store.isSeeded()).toBe(false);
  });

  it("sends one separate email per recipient for a new post", async () => {
    const { sent, base } = setup();
    await runCheck({ ...base, dispatches: [mk(1, 1)] }, {});
    const r = await runCheck({ ...base, dispatches: [mk(1, 1), mk(2, 2)] }, {});
    expect(r.mode).toBe("live");
    expect(r.new).toEqual([2]);
    expect(r.sent).toBe(1);
    expect(sent.map((m) => m.to)).toEqual(["a@example.com", "b@example.com"]);
    expect(sent[0].idempotencyKey).toBe("dispatch-2-a@example.com");
    expect(sent[0].subject).toBe("New from Nikumaroro: Synthetic 2");
  });

  it("processes oldest first", async () => {
    const { store, sent, base } = setup(["a@example.com"]);
    await store.markSeeded();
    const r = await runCheck({ ...base, dispatches: [mk(3, 5), mk(2, 2)] }, {});
    expect(r.new).toEqual([2, 3]);
    expect(sent.map((m) => m.idempotencyKey)).toEqual([
      "dispatch-2-a@example.com",
      "dispatch-3-a@example.com",
    ]);
  });

  it("skips a post whose lock is held", async () => {
    const { store, sent, base } = setup();
    await store.markSeeded();
    await store.acquireLock(7, 300);
    const r = await runCheck({ ...base, dispatches: [mk(7, 3)] }, {});
    expect(r.skipped).toEqual([7]);
    expect(sent).toHaveLength(0);
    expect((await store.getNotified()).has(7)).toBe(false);
  });

  it("partial failure leaves post un-notified, releases lock, retries only the failed recipient", async () => {
    const { store, sent, base } = setup();
    await store.markSeeded();
    let failB = true;
    const send = vi.fn(async (m: OutgoingEmail) => {
      if (m.to === "b@example.com" && failB) throw new Error("boom for b@example.com");
      sent.push(m);
    });
    const deps = { ...base, send, dispatches: [mk(9, 4)] };
    const r1 = await runCheck(deps, {});
    expect(r1.sent).toBe(0);
    expect(r1.errors).toHaveLength(1);
    expect(r1.errors[0]).not.toContain("b@example.com");
    expect(r1.errors[0]).toContain("b***@example.com");
    expect((await store.getNotified()).has(9)).toBe(false);
    expect(store._state.locks.has(9)).toBe(false);

    failB = false;
    sent.length = 0;
    const r2 = await runCheck(deps, {});
    expect(r2.sent).toBe(1);
    expect(sent.map((m) => m.to)).toEqual(["b@example.com"]);
    expect((await store.getNotified()).has(9)).toBe(true);
  });

  it("dryRun writes and sends nothing", async () => {
    const { store, sent, base } = setup();
    const seedDry = await runCheck({ ...base, dispatches: [mk(1, 1)] }, { dryRun: true });
    expect(seedDry.mode).toBe("seed");
    expect(await store.isSeeded()).toBe(false);
    expect((await store.getNotified()).size).toBe(0);

    await store.markSeeded();
    const r = await runCheck({ ...base, dispatches: [mk(1, 1)] }, { dryRun: true });
    expect(r.mode).toBe("dryRun");
    expect(r.new).toEqual([1]);
    expect(sent).toHaveLength(0);
    expect((await store.getNotified()).size).toBe(0);
  });

  it("test mode sends the newest to admin only and never touches the store", async () => {
    const { store, sent, base } = setup();
    const spy = vi.spyOn(store, "isSeeded");
    const r = await runCheck({ ...base, dispatches: [mk(1, 1), mk(2, 5)] }, { test: true });
    expect(r.mode).toBe("test");
    expect(r.sent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("admin@example.com");
    expect(sent[0].idempotencyKey).toMatch(/^test-2-\d+$/);
    expect(spy).not.toHaveBeenCalled();
    expect(store._state.seeded).toBe(false);
  });

  it("test mode errors without admin email or dispatches", async () => {
    const { base } = setup();
    expect((await runCheck({ ...base, adminEmail: undefined, dispatches: [mk(1, 1)] }, { test: true })).errors).toHaveLength(1);
    expect((await runCheck({ ...base, dispatches: [] }, { test: true })).errors).toHaveLength(1);
  });

  it("errors with zero recipients and marks nothing", async () => {
    const { store, base } = setup([]);
    await store.markSeeded();
    const r = await runCheck({ ...base, dispatches: [mk(1, 1)] }, {});
    expect(r.errors).toEqual(["ALERT_RECIPIENTS is empty"]);
    expect((await store.getNotified()).size).toBe(0);
  });

  it("includes a verdict banner only when the verdict changed, then records it", async () => {
    const { store, sent, base } = setup(["a@example.com"]);
    await store.markSeeded();
    await store.setLastVerdict("investigating");
    await runCheck({ ...base, dispatches: [mk(1, 1)] }, {});
    expect(sent[0].html).not.toContain("Verdict update");

    const changed = { ...base, status: status("promising") };
    await runCheck({ ...changed, dispatches: [mk(1, 1), mk(2, 2)] }, {});
    expect(sent[1].html).toContain("Verdict update: Promising signs");
    expect(await store.getLastVerdict()).toBe("promising");

    await runCheck({ ...changed, dispatches: [mk(1, 1), mk(2, 2), mk(3, 3)] }, {});
    expect(sent[2].html).not.toContain("Verdict update");
  });
});

describe("parseRecipients", () => {
  it("splits, lowercases, dedupes and filters", () => {
    expect(parseRecipients("A@x.com, b@y.org; a@x.com\n not-an-email  c@z.io,")).toEqual([
      "a@x.com",
      "b@y.org",
      "c@z.io",
    ]);
    expect(parseRecipients(undefined)).toEqual([]);
    expect(parseRecipients("")).toEqual([]);
  });
});
