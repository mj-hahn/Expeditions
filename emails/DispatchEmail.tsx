import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Dispatch, Status } from "@/lib/types";
import { VERDICT_INFO } from "@/lib/status";
import { site } from "@/content/site";

export type DispatchEmailProps = {
  dispatch: Dispatch;
  title: string;
  siteUrl: string;
  verdictChanged: boolean;
  status: Status;
};

const TONES = {
  gold: { bg: "#D9A441", fg: "#0B1F33" },
  slate: { bg: "#4A5B6C", fg: "#FFFFFF" },
  teal: { bg: "#1F7A7A", fg: "#FFFFFF" },
  sand: { bg: "#E9DBBB", fg: "#1B1B1B" },
} as const;

const SANS = "Helvetica, Arial, sans-serif";

export function preheaderText(lead: string): string {
  return lead.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function DispatchEmail({ dispatch: d, title, siteUrl, verdictChanged, status }: DispatchEmailProps) {
  const hero = d.hero ?? d.photos[0];
  const info = VERDICT_INFO[status.verdict];
  const tone = TONES[info.tone];
  const link = `${siteUrl}/dispatch/${d.slug}`;
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
      </Head>
      <Preview>{preheaderText(d.lead)}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: "#F3E9D2", fontFamily: SANS }}>
        <Container
          style={{
            maxWidth: 600,
            width: "100%",
            margin: "0 auto",
            backgroundColor: "#FBF7EE",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: "#0B1F33", padding: "20px 24px" }}>
            <Text
              style={{
                margin: 0,
                fontFamily: "'Courier New', monospace",
                fontSize: 16,
                lineHeight: "24px",
                fontWeight: "bold",
                letterSpacing: 3,
                color: "#EEF4F7",
              }}
            >
              {site.name.toUpperCase()}
            </Text>
            <Text style={{ margin: "4px 0 0", fontSize: 16, lineHeight: "24px", color: "#B3C6D6" }}>
              Nikumaroro · 4°40′S 174°31′W
            </Text>
          </Section>

          {verdictChanged ? (
            <Section style={{ backgroundColor: tone.bg, padding: "20px 24px" }}>
              <Text style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: "bold", color: tone.fg }}>
                {`Verdict update: ${info.label}`}
              </Text>
              {status.note ? (
                <Text style={{ margin: "8px 0 0", fontSize: 18, lineHeight: "26px", color: tone.fg }}>
                  {status.noteUrl ? (
                    <Link href={status.noteUrl} style={{ color: tone.fg, textDecoration: "underline" }}>
                      {status.note}
                    </Link>
                  ) : (
                    status.note
                  )}
                </Text>
              ) : null}
            </Section>
          ) : null}

          {hero ? (
            <Img
              src={hero.src}
              alt={hero.alt || title}
              width={600}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          ) : null}

          <Section style={{ padding: "28px 24px" }}>
            <Text
              style={{
                margin: "0 0 8px",
                fontSize: 16,
                lineHeight: "24px",
                fontWeight: "bold",
                letterSpacing: 2,
                color: "#B4461A",
              }}
            >
              NEW DISPATCH
            </Text>
            <Text
              style={{
                margin: "0 0 12px",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 30,
                lineHeight: 1.2,
                fontWeight: "bold",
                color: "#0B1F33",
              }}
            >
              {title}
            </Text>
            {d.dateline ? (
              <Text
                style={{
                  margin: "0 0 16px",
                  fontSize: 16,
                  lineHeight: "24px",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: "bold",
                  color: "#175E5E",
                }}
              >
                {d.dateline}
              </Text>
            ) : null}
            <Text style={{ margin: "0 0 28px", fontSize: 20, lineHeight: 1.6, color: "#1B1B1B", fontFamily: SANS }}>
              {d.lead}
            </Text>
            <Link
              href={link}
              style={{
                display: "block",
                backgroundColor: "#E8692C",
                color: "#0B1F33",
                fontSize: 20,
                lineHeight: "26px",
                fontWeight: "bold",
                padding: "18px 28px",
                borderRadius: 999,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              {`Read it on ${site.name}`}
            </Link>
            <Text style={{ margin: "24px 0 0", fontSize: 16, lineHeight: "24px", color: "#574F43" }}>
              Dispatch from Purdue University News.{" "}
              <Link href={d.url} style={{ color: "#175E5E", textDecoration: "underline" }}>
                Read the original
              </Link>
            </Text>
          </Section>

          <Section style={{ padding: "20px 24px 28px", borderTop: "1px solid #D8C8A4" }}>
            <Text style={{ margin: "0 0 12px", fontSize: 16, lineHeight: "24px", color: "#574F43" }}>
              You&apos;re getting this because Matt signed you up. Reply to this email to stop.
            </Text>
            <Text style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "#574F43" }}>
              {site.disclaimer}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DispatchEmail;
