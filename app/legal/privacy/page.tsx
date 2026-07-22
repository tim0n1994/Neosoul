import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — NEOSOUL',
  description: 'NEOSOUL Privacy Policy',
};

// PRD §13 [红线]：法律页——隐私政策。
export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-16">
      <article className="prose-warm mx-auto max-w-2xl">
        <h1>Privacy Policy</h1>
        <p className="text-cream-300/60">Last updated: 2026-07-22</p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Account:</strong> email address, display name, avatar configuration, birth year (for age-gating)</li>
          <li><strong>Activity:</strong> rooms joined, messages sent, follows, interests</li>
          <li><strong>Audio:</strong> real-time voice (only recorded if the host enables recording, with full notification)</li>
          <li><strong>Technical:</strong> device type, browser, IP address (for security and abuse prevention)</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide the core social audio experience</li>
          <li>To recommend rooms and people based on your interests</li>
          <li>To enforce community guidelines and prevent abuse</li>
          <li>To process payments (via Stripe, which has its own privacy policy)</li>
        </ul>

        <h2>3. Data Minimization</h2>
        <p>
          We collect only what is necessary. We do not require real names, phone numbers (beyond email),
          or facial data. Your avatar is your virtual identity.
        </p>

        <h2>4. AI & Transparency</h2>
        <p>
          AI features (icebreakers, text assistance) process your input to generate suggestions.
          AI output is always labeled. AI is never used to impersonate humans or manipulate emotions.
        </p>

        <h2>5. Content Moderation</h2>
        <p>
          Messages and images are screened for policy violations before publication.
          We use automated systems and human review. Flagged content may be reviewed by moderators.
        </p>

        <h2>6. Data Sharing</h2>
        <p>
          We do not sell your data. We share data only with service providers (Supabase, LiveKit, Stripe)
          as necessary to operate the platform, and as required by law.
        </p>

        <h2>7. Your Rights</h2>
        <ul>
          <li><strong>Access:</strong> You can view your data in Settings</li>
          <li><strong>Export:</strong> You can request a data export</li>
          <li><strong>Delete:</strong> You can permanently delete your account and associated data</li>
        </ul>

        <h2>8. Children's Privacy</h2>
        <p>
          Users under 13 are not permitted. Users 13–17 receive minor protection mode with restricted features.
        </p>

        <h2>9. International Users</h2>
        <p>
          NEOSOUL is published globally as a web application. If you are in a jurisdiction with specific
          data protection laws (e.g., GDPR), your rights are respected.
        </p>

        <h2>10. Contact</h2>
        <p>For privacy inquiries: privacy@neosoul.app</p>
      </article>
    </main>
  );
}
