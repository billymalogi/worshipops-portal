import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-gray-300 p-8 md:p-20 font-sans">
      <Link href="/" className="text-blue-500 hover:text-blue-400 mb-8 block">← Back to Home</Link>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        <p>Last updated: January 2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-white mb-2">1. Service Description</h2>
          <p>We collect information that you provide directly to us, specifically your mobile phone number when you register for early access. Worship Ops offers a mobile messaging program where users can receive SMS notifications regarding team schedules, worship service plans, and account alerts.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">2. Opt-In:</h2>
          <p>Users opt-in by providing their mobile number and agreeing to the terms via our online web forms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">3. Opt-Out:</h2>
          <p>You can cancel the SMS service at any time. Just text "STOP" to the short code. After you send the SMS message "STOP" to us, we will send you an SMS message to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us. If you want to join again, just sign up as you did the first time and we will start sending SMS messages to you again.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">4. Help:</h2>
          <p>If you are experiencing issues with the messaging program you can reply with the keyword "HELP" for more assistance, or you can get help directly at [info@worshipops.com].</p>
        </section>

        <section>
          <h2 className
          ="text-xl font-semibold text-white mb-2">5. Carriers:</h2>
          <p>Carriers are not liable for delayed or undelivered messages.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">6. Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect the security of your personal information.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">7. Rates:</h2>
          <p>As always, message and data rates may apply for any messages sent to you from us and to us from you. You will receive messages based on your team activity and schedule frequency. If you have any questions about your text plan or data plan, it is best to contact your wireless provider.</p>
        </section>
      </div>
    </main>
  );
}