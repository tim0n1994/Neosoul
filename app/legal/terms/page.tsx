import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — NEOSOUL',
  description: 'NEOSOUL Terms of Service',
};

// PRD §13 [红线]：法律页——ToS。上线前必须有真实内容。
export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-16">
      <article className="prose-warm mx-auto max-w-2xl">
        <h1>Terms of Service</h1>
        <p className="text-cream-300/60">Last updated: 2026-07-22</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using NEOSOUL ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree, do not use the Service.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use NEOSOUL. Users under 18 are subject to
          additional minor protection measures, including restrictions on matching, messaging,
          and payments.
        </p>

        <h2>3. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Harass, threaten, or abuse other users</li>
          <li>Post sexual, violent, or illegal content</li>
          <li>Engage in fraud, scams, or solicit money transfers</li>
          <li>Impersonate another person or pretend AI-generated content is human</li>
          <li>Spam, advertise, or redirect users to external platforms for fraudulent purposes</li>
          <li>Circumvent content moderation systems</li>
        </ul>

        <h2>4. Content & Recording</h2>
        <p>
          Rooms may be recorded by the host. When recording is active, all participants are notified.
          You are responsible for your own words. Do not share personal information you do not want recorded.
        </p>

        <h2>5. Payments</h2>
        <p>
          NEOSOUL uses a fair monetization model. Social features are free. Paid features (Pro subscription,
          cosmetics, creator tips) are optional. All prices are clearly displayed. You may cancel at any time.
          Minors cannot make purchases. There are no loot boxes, no forced gifting, and no pay-to-message.
        </p>

        <h2>6. AI Transparency</h2>
        <p>
          All AI-generated content in NEOSOUL is clearly labeled. AI does not impersonate humans.
          AI features are optional and can be turned off.
        </p>

        <h2>7. Account Termination</h2>
        <p>
          You may delete your account at any time. We may suspend or terminate accounts that violate these Terms.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          NEOSOUL is provided "as is" without warranties. We are not liable for user-generated content
          or interactions between users.
        </p>

        <h2>9. Contact</h2>
        <p>For questions about these Terms, contact: legal@neosoul.app</p>
      </article>
    </main>
  );
}
