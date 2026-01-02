import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-gray-300 p-8 md:p-20 font-sans">
      <Link href="/" className="text-blue-500 hover:text-blue-400 mb-8 block">← Back to Home</Link>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        <p>Last updated: January 2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-white mb-2">1. Information Collection</h2>
          <p>We collect information that you provide directly to us, specifically your mobile phone number when you register for early access. We collect your phone number and consent status when you voluntarily opt-in to receive SMS notifications from Worship Ops via our web portal or application forms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">2. Use of Information</h2>
          <p>We use the information we collect to notify you about WorshipOps product launches, beta testing opportunities, and critical service updates. We use your phone number to send:</p>
          <p> - Team scheduling alerts</p>
          <p> - Service notifications</p>
          <p> - Account security updates (e.g., 2FA)</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">3. No Sharing of Mobile Data</h2>
          <p>We implement appropriate technical and organizational measures to protect the security of your personal information. We value your privacy. Mobile information will not be shared with other third parties or affiliates for marketing or promotional purposes. All other categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.</p>
        </section>
      </div>
    </main>
  );
}