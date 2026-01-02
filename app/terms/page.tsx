import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-gray-300 p-8 md:p-20 font-sans">
      <Link href="/" className="text-blue-500 hover:text-blue-400 mb-8 block">← Back to Home</Link>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
        <p>Last updated: January 2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-white mb-2">1. Acceptance</h2>
          <p>By accessing WorshipOps, you agree to be bound by these terms. If you disagree with any part of the terms, you may not access the service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">2. Communications</h2>
          <p>By opting into our SMS list, you agree to receive text messages regarding product updates and early access invitations. You can opt-out at any time by replying STOP.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">3. Intellectual Property</h2>
          <p>The Service and its original content, features, and functionality are and will remain the exclusive property of WorshipOps.</p>
        </section>
      </div>
    </main>
  );
}