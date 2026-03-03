import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid #0f172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/favicon.ico" alt="WorshipOps" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>WorshipOps</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1px solid #1e293b', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '13px', padding: '6px 14px', fontFamily: 'inherit' }}
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>

        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-1px', margin: '0 0 8px' }}>Privacy Policy</h1>
        <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 48px' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Information We Collect',
            body: `We collect information you provide directly to us, such as your name, email address, and church or organization name when you register for early access or create an account. We also collect usage data about how you interact with our platform to improve our services.`,
          },
          {
            title: '2. How We Use Your Information',
            body: `We use the information we collect to provide, maintain, and improve WorshipOps, communicate with you about your account and our services, send you updates and early access notifications (with your consent), and respond to your requests and inquiries.`,
          },
          {
            title: '3. Data Storage and Security',
            body: `Your data is stored securely using Supabase, which operates on industry-standard PostgreSQL infrastructure with row-level security. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.`,
          },
          {
            title: '4. Sharing of Information',
            body: `We do not sell, trade, or otherwise transfer your personal information to third parties. We may share data with service providers who assist us in operating our platform (such as hosting and analytics providers) under strict confidentiality agreements.`,
          },
          {
            title: '5. Cookies and Tracking',
            body: `WorshipOps uses minimal cookies necessary for authentication and session management. We do not use advertising cookies or third-party tracking technologies.`,
          },
          {
            title: '6. Your Rights',
            body: `You have the right to access, correct, or delete your personal data at any time. To make a request, contact us at support@worshipops.com. We will respond within 30 days.`,
          },
          {
            title: '7. Data Retention',
            body: `We retain your data for as long as your account is active or as needed to provide services. Early access signup data is retained indefinitely unless you request deletion. You may request deletion of your data by contacting support@worshipops.com.`,
          },
          {
            title: '8. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of WorshipOps after any changes constitutes your acceptance of the revised policy.`,
          },
          {
            title: '9. Contact Us',
            body: `If you have any questions about this Privacy Policy, please contact us at:\n\nWorshipOps\nEmail: support@worshipops.com\nBilling inquiries: billy@worshipops.com`,
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
              {section.title}
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-line' }}>
              {section.body}
            </p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #0f172a', paddingTop: '32px', marginTop: '16px', textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
            © 2026 WorshipOps ·{' '}
            <a href="/terms" style={{ color: '#64748b', textDecoration: 'underline' }}>Terms of Service</a>
            {' · '}
            <a href="/" style={{ color: '#64748b', textDecoration: 'underline' }}>Home</a>
          </p>
        </div>
      </div>
    </div>
  );
}
