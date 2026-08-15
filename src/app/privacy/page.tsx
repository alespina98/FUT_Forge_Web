import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { siteCopy } from "@/lib/copy";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "How FUT Forge handles data across the website, Desktop app, Browser Extension, and Bookmarklet.";
const EFFECTIVE_DATE = "August 15, 2026";
const INSTAGRAM_HANDLE = "@futforgeofficial";
const INSTAGRAM_URL = "https://www.instagram.com/futforgeofficial/";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: `${TITLE} — FUT Forge`,
    description: DESCRIPTION,
    siteName: siteCopy.applicationName,
    locale: "en_US",
  },
  twitter: { card: "summary", title: `${TITLE} — FUT Forge`, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/[.07] py-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-medium text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-white/55">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />

      <div className="section-shell pt-32 pb-24">
        <p className="section-label">Legal</p>
        <h1 className="section-title mt-5">Privacy Policy</h1>
        <p className="mt-4 text-sm text-white/40">
          Effective {EFFECTIVE_DATE} · Applies to the FUT Forge website ({siteCopy.url}), FUT Forge Desktop,
          the FUT Forge Browser Extension, and the FUT Forge Bookmarklet (&quot;Browser Mode&quot;) —
          together, &quot;FUT Forge&quot;.
        </p>

        <div className="mt-10 max-w-3xl">
          <p className="text-sm leading-6 text-white/60">
            This policy describes what FUT Forge actually does with data, based on how each product is
            built today. FUT Forge is a set of tools for the EA Sports FC Ultimate Team Web App — squad
            building, SBC solving, Evolutions, club insights, and market prices. It is not affiliated with,
            endorsed by, or associated with Electronic Arts or EA Sports.
          </p>

          <Section id="scope" title="1. Products this policy covers">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">The website</strong> ({siteCopy.url}) — marketing pages,
                account sign-in, the web-based tools under <code className="text-white/70">/app</code>, and
                Leaks articles.
              </li>
              <li>
                <strong className="text-white/80">FUT Forge Desktop</strong> — the Windows application that
                embeds the EA Web App and overlays FUT Forge&apos;s tools.
              </li>
              <li>
                <strong className="text-white/80">The FUT Forge Browser Extension</strong> — a Chrome
                extension that injects the same FUT Forge tools directly into the EA Web App running in your
                browser, so Desktop is not required.
              </li>
              <li>
                <strong className="text-white/80">The FUT Forge Bookmarklet</strong> (&quot;Browser Mode&quot;)
                — a bookmark-triggered version of the same tools for browsers, including mobile, where
                installing an extension isn&apos;t possible.
              </li>
            </ul>
            <p>
              All four share the same account system and the same core squad/SBC/EVO engine. Where their
              data handling differs, it is called out explicitly below.
            </p>
          </Section>

          <Section id="account" title="2. Your FUT Forge account">
            <p>
              Creating a FUT Forge account and signing in is handled by Supabase, our authentication and
              database provider. When you register or sign in, we process the email address and password
              (or username) you provide, and Supabase issues a session (an access token and a refresh
              token). We store, in your FUT Forge profile: your email, username, account plan (Free/Pro),
              plan expiry, account creation date, and the timestamp of your most recent login.
            </p>
            <p>
              On sign-in, the client also reports a short client-version label (for example, which build of
              the FUT Forge Core you&apos;re running) so we can tell which app versions are active. This is
              a diagnostic label only — it is not your device identity, IP address log, or usage history.
            </p>
            <p>
              Your session tokens are kept in <code className="text-white/70">localStorage</code> under the
              origin of the page you&apos;re using FUT Forge from — <code className="text-white/70">
                futforge.vercel.app
              </code>{" "}
              when you use the website, or <code className="text-white/70">www.ea.com</code> (the EA Web
              App&apos;s own origin) when you use the Browser Extension, Bookmarklet, or Desktop, since all
              three run FUT Forge&apos;s interface on top of the EA Web App page itself. This is standard
              browser storage, scoped by the browser to that origin; FUT Forge does not read or export it
              anywhere else.
            </p>
          </Section>

          <Section id="ea-data" title="3. Data read from the EA Web App">
            <p>
              To power Squad Builder, SBC tools, EVO Builder, and club-based features, FUT Forge reads
              Ultimate Team data that is already loaded into your signed-in EA Web App session — your club
              items (cards), their ratings, positions, rarity, chemistry styles, and your SBC/formation
              state. This is read the same way the EA Web App&apos;s own interface reads it, through EA&apos;s
              in-page APIs.
            </p>
            <p>
              <strong className="text-white/80">
                FUT Forge does not read, store, or transmit your EA account password, EA session cookies, or
                EA authentication tokens.
              </strong>{" "}
              Signing in to the EA Web App and signing in to FUT Forge are entirely separate systems.
            </p>
            <p>
              In the Browser Extension and Bookmarklet, this club/card data is used locally, in your
              browser, to calculate META ratings, chemistry, and SBC/EVO solutions. It is not uploaded to
              FUT Forge&apos;s servers by the extension or the bookmarklet in the current release.
            </p>
            <p>
              FUT Forge Desktop additionally offers an optional <strong className="text-white/80">Club
              Sync</strong> feature: if you use it, a sanitized snapshot of your club (card identifiers,
              ratings, rarity, and tradeable status — never EA credentials or session data) is sent to
              FUT Forge&apos;s backend and stored against your FUT Forge account, so club-based tools can
              work outside the EA Web App. The equivalent Club Sync upload path exists in the Browser
              Extension&apos;s source code but is not enabled or exposed in the current release — the
              extension does not upload club data anywhere.
            </p>
          </Section>

          <Section id="local-storage" title="4. What&apos;s stored locally in your browser">
            <p>
              Beyond your session tokens (Section 2), FUT Forge keeps a few functional values in{" "}
              <code className="text-white/70">localStorage</code> on whichever origin you&apos;re using it
              from:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Cached grade and chemistry-style configuration, so the app can score cards offline.</li>
              <li>
                A short-lived cache of public market prices (Section 5), so repeated SBC/EVO calculations
                don&apos;t need to re-fetch pricing.
              </li>
              <li>
                A local cache of your club snapshot, used to speed up SBC/EVO tools between visits without
                re-querying the EA Web App every time.
              </li>
            </ul>
            <p>
              None of these values leave your browser on their own — they exist purely so the local
              calculation engine has fast access to data it already fetched. Clearing your browser&apos;s
              site data for that origin removes them.
            </p>
          </Section>

          <Section id="pricing" title="5. Market price data">
            <p>
              Public market-price data is downloaded from FUT.GG (<code className="text-white/70">
                r2.fut.gg
              </code>
              ) — a public, read-only price index, not tied to your FUT Forge account or your EA identity.
              This request is made by the Browser Extension&apos;s service worker (or by Desktop/the
              Bookmarklet host) on your behalf; it carries no personal data beyond what any standard HTTPS
              request includes (such as your IP address, visible to FUT.GG like any web request). FUT Forge
              does not sell this data or use it for advertising.
            </p>
          </Section>

          <Section id="servers" title="6. What reaches FUT Forge&apos;s servers">
            <p>Depending on which product you use, FUT Forge&apos;s backend (built on Supabase) receives:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Authentication requests — your email/password at sign-in, and session refresh calls.</li>
              <li>Profile reads/writes — plan, username, and the login-timestamp/version label from Section 2.</li>
              <li>
                On FUT Forge Desktop, if you use Club Sync: your sanitized club snapshot (Section 3).
              </li>
            </ul>
            <p>
              The Browser Extension and Bookmarklet do not send club/card data, squad compositions, or SBC
              solutions to FUT Forge&apos;s servers in the current release — those calculations happen
              entirely in your browser.
            </p>
          </Section>

          <Section id="third-parties" title="7. Third-party services">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Supabase</strong> — authentication and database hosting
                for FUT Forge accounts and profiles.
              </li>
              <li>
                <strong className="text-white/80">FUT.GG</strong> — source of the public market-price data
                described in Section 5.
              </li>
              <li>
                <strong className="text-white/80">Vercel</strong> — hosts the FUT Forge website and provides
                privacy-focused, aggregated page-view analytics (Vercel Web Analytics) for the site. This
                analytics collection applies to the website only, not the Browser Extension or Bookmarklet
                running inside the EA Web App.
              </li>
            </ul>
            <p>We do not sell personal data to third parties, and we do not use your data for advertising.</p>
          </Section>

          <Section id="retention" title="8. Data retention">
            <p>
              Account data (email, username, plan, profile fields) is retained for as long as your FUT
              Forge account exists. Session tokens remain in browser storage until they expire, you sign
              out, or you clear site data. A Club Sync snapshot (Desktop only) is replaced each time you
              re-sync and is retained until you delete your account or request its removal.
            </p>
          </Section>

          <Section id="rights" title="9. Your rights and choices">
            <p>
              You can request access to, correction of, or deletion of your FUT Forge account and any
              associated data at any time by contacting us through our official Instagram account,{" "}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime hover:text-lime/80"
              >
                {INSTAGRAM_HANDLE}
              </a>
              . You can also sign out to clear locally stored session tokens, or use your browser&apos;s
              site-data controls to clear anything else FUT Forge has stored locally.
            </p>
          </Section>

          <Section id="children" title="10. Children&apos;s privacy">
            <p>
              FUT Forge is intended for users old enough to hold an EA Account and use the EA Sports FC
              Ultimate Team Web App under EA&apos;s own terms. FUT Forge does not knowingly collect data
              from children below that threshold.
            </p>
          </Section>

          <Section id="extension-disclosure" title="11. Chrome Web Store disclosure">
            <p>The FUT Forge Browser Extension:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Runs only on supported EA Sports FC Ultimate Team Web App pages.</li>
              <li>
                Uses the <code className="text-white/70">scripting</code> permission to inject FUT Forge&apos;s
                interface into that page, and <code className="text-white/70">storage</code> to keep
                short-lived, per-tab boot state so a page reload doesn&apos;t re-initialize FUT Forge
                twice.
              </li>
              <li>
                Requests host access only to the EA Web App routes it runs on, and to{" "}
                <code className="text-white/70">r2.fut.gg</code> for the public price data in Section 5.
              </li>
              <li>Does not read EA passwords, cookies, or authentication tokens.</li>
              <li>Does not download or execute remotely hosted code — all extension logic ships in the package; only data (price responses, authentication API responses) is fetched at runtime.</li>
              <li>Does not sell or transfer user data to third parties for purposes unrelated to providing FUT Forge&apos;s features, and does not use data for advertising or creditworthiness decisions.</li>
            </ul>
          </Section>

          <Section id="changes" title="12. Changes to this policy">
            <p>
              If FUT Forge&apos;s data practices change materially — for example, if Club Sync upload is
              enabled in the Browser Extension — this page will be updated and the effective date above
              will change accordingly.
            </p>
          </Section>

          <Section id="contact" title="13. Contact">
            <p>
              Questions about this Privacy Policy or your data can be sent to us through our official
              Instagram account:{" "}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime hover:text-lime/80"
              >
                {INSTAGRAM_HANDLE}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
