import { createElement } from "react";
import { render } from "@react-email/render";
import type { Dispatch, Status } from "@/lib/types";
import { shortTitle } from "@/lib/purdue";
import { VERDICT_INFO } from "@/lib/status";
import { site } from "@/content/site";
import { DispatchEmail } from "./DispatchEmail";

export async function buildEmail(
  d: Dispatch,
  opts: { siteUrl: string; verdictChanged: boolean; status: Status },
): Promise<{ subject: string; html: string; text: string }> {
  const title = shortTitle(d.title);
  const el = createElement(DispatchEmail, {
    dispatch: d,
    title,
    siteUrl: opts.siteUrl,
    verdictChanged: opts.verdictChanged,
    status: opts.status,
  });
  const html = await render(el);
  const link = `${opts.siteUrl}/dispatch/${d.slug}`;

  // Hand-built plain text so the hidden preheader and layout chrome never leak in.
  const lines: string[] = [];
  if (opts.verdictChanged) {
    lines.push(`VERDICT UPDATE: ${VERDICT_INFO[opts.status.verdict].label}`);
    if (opts.status.note) lines.push(opts.status.note);
    if (opts.status.noteUrl) lines.push(opts.status.noteUrl);
    lines.push("");
  }
  lines.push(`NEW DISPATCH from Nikumaroro`, "", title);
  if (d.dateline) lines.push(d.dateline.toUpperCase());
  lines.push("", d.lead, "", `Read it on ${site.name}: ${link}`, "");
  lines.push(`Dispatch from Purdue University News. Read the original: ${d.url}`, "", "--");
  lines.push("You're getting this because Matt signed you up. Reply to this email to stop.", "");
  lines.push(site.disclaimer, "");

  return { subject: `New from Nikumaroro: ${title}`, html, text: lines.join("\n") };
}
