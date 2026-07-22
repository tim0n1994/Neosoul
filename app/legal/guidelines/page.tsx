import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Guidelines — NEOSOUL',
  description: 'NEOSOUL Community Guidelines',
};

// PRD §13 [红线]：法律页——社区规范。
export default function GuidelinesPage() {
  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-16">
      <article className="prose-warm mx-auto max-w-2xl">
        <h1>Community Guidelines</h1>
        <p className="text-cream-300/60">Last updated: 2026-07-22</p>

        <p className="lead">
          NEOSOUL exists to be a lightweight, open, and healthy space for interest-driven social audio.
          These guidelines define what it means to be a good citizen of our community.
        </p>

        <h2>Our Values</h2>
        <ul>
          <li><strong>Soul, without the tricks.</strong> Be genuine. Don't manipulate or exploit.</li>
          <li><strong>Free to be social.</strong> Everyone deserves full social access without paywalls.</li>
          <li><strong>Transparent AI.</strong> AI is a tool, not a fake human. Always labeled.</li>
          <li><strong>Safe by default.</strong> Protection comes first, growth second.</li>
        </ul>

        <h2>Do</h2>
        <ul>
          <li>Be kind and respectful to others</li>
          <li>Join rooms that match your interests</li>
          <li>Use the report and block tools when needed</li>
          <li>Respect room hosts and their rules</li>
          <li>Label AI-assisted content honestly</li>
        </ul>

        <h2>Don't</h2>
        <ul>
          <li><strong>No harassment:</strong> hate speech, threats, targeted abuse</li>
          <li><strong>No fraud:</strong> soliciting money transfers, investment scams, external contact for fraud</li>
          <li><strong>No NSFW:</strong> sexual content, especially involving minors (zero tolerance)</li>
          <li><strong>No spam:</strong> mass advertising, bot flooding, off-platform redirects</li>
          <li><strong>No impersonation:</strong> don't pretend to be someone else, or that AI is human</li>
          <li><strong>No doxxing:</strong> sharing others' private information</li>
        </ul>

        <h2>What Happens When Rules Are Broken</h2>
        <ol>
          <li><strong>Warning:</strong> First minor violations receive a warning</li>
          <li><strong>Mute/Ban from room:</strong> Hosts and co-hosts can remove disruptive users</li>
          <li><strong>Account suspension:</strong> Repeated or severe violations</li>
          <li><strong>Permanent ban:</strong> Zero-tolerance violations (CSAM, fraud, doxxing)</li>
        </ol>

        <h2>Reporting</h2>
        <p>
          Use the in-app Report button to flag content or users. Our moderation team reviews reports
          and takes action. You can also block any user to prevent further interaction.
        </p>

        <h2>Our Commitment</h2>
        <p>
          We will never implement forced gifting, pay-to-message, age-priced matching, loot boxes,
          or fake-human AI companions. These are banned by our product DNA.
        </p>
      </article>
    </main>
  );
}
