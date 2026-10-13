import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Resend } from "resend";
import { fetchPurduePosts, postsToDispatches } from "@/lib/purdue";
import { getStatus } from "@/lib/status";
import { getRedis } from "@/lib/redis";
import { siteUrl } from "@/content/site";
import {
  memoryStore,
  parseRecipients,
  redisStore,
  runCheck,
  type OutgoingEmail,
} from "@/lib/alerts";

export const runtime = "nodejs";

function authorized(req: Request, secret: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (!authorized(req, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const flag = (k: string) => ["1", "true"].includes(params.get(k) ?? "");
  const dryRun = flag("dryRun");
  const test = flag("test");

  const redis = getRedis();
  if (!redis && !test) return NextResponse.json({ error: "Redis not configured" }, { status: 500 });

  let dispatches;
  try {
    const posts = await fetchPurduePosts({ cache: "no-store" });
    dispatches = postsToDispatches(posts);
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    console.error("check-dispatches: fetch failed:", message);
    return NextResponse.json({ error: `Could not fetch dispatches: ${message}` }, { status: 502 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM;
  const replyTo = process.env.ALERT_REPLY_TO || undefined;
  const resend = apiKey ? new Resend(apiKey) : null;

  // Resend's default rate limit is a few requests per second; space sends out.
  let lastSend = 0;
  const send = async (msg: OutgoingEmail): Promise<void> => {
    if (!resend || !from) throw new Error("RESEND_API_KEY or ALERT_FROM not configured");
    const wait = lastSend + 600 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSend = Date.now();
    const { error } = await resend.emails.send(
      { from, to: [msg.to], replyTo, subject: msg.subject, html: msg.html, text: msg.text },
      { idempotencyKey: msg.idempotencyKey },
    );
    if (error) throw new Error(`Resend error: ${error.name}: ${error.message}`);
  };

  const result = await runCheck(
    {
      dispatches,
      store: redis ? redisStore(redis) : memoryStore(),
      send,
      recipients: parseRecipients(process.env.ALERT_RECIPIENTS),
      adminEmail: process.env.ADMIN_EMAIL,
      status: getStatus(),
      siteUrl: siteUrl(),
      log: console.log,
    },
    { dryRun, test },
  );

  if (result.mode === "live" && result.new.length > 0) {
    revalidateTag("dispatches", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/dispatch/[slug]", "page");
  }

  console.log(
    `check-dispatches mode=${result.mode} checked=${result.checked} new=${result.new.length} sent=${result.sent} skipped=${result.skipped.length} errors=${result.errors.length}`,
  );

  const failed = result.errors.length > 0 && result.sent === 0 && result.mode !== "dryRun";
  return NextResponse.json(result, { status: failed ? 500 : 200 });
}

export async function POST(req: Request): Promise<Response> {
  return GET(req);
}
