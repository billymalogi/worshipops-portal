import { useNavigate } from 'react-router-dom';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid #0f172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => navigate('/')}>
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

        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-1px', margin: '0 0 8px' }}>Terms & Conditions</h1>
        <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 48px' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: `By accessing or using WorshipOps ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service. These terms apply to all users, including church administrators, team leaders, and volunteers.`,
          },
          {
            title: '2. Description of Service',
            body: `WorshipOps is a church operations platform designed to help churches and worship teams plan services, manage teams, coordinate volunteers, and streamline weekly operations. The platform is currently in beta and features may change without notice.`,
          },
          {
            title: '3. Beta Access',
            body: `WorshipOps is currently in a closed beta phase. Access is by invitation only. Beta users acknowledge that the service may be unstable, features may change or be removed, and data may be lost in some circumstances. We will make reasonable efforts to preserve data but provide no guarantee during beta.`,
          },
          {
            title: '4. User Accounts and Responsibilities',
            body: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the Service only for lawful purposes and in a manner consistent with its intended use — supporting church and worship team operations. You must not share login credentials or attempt to gain unauthorized access to the platform.`,
          },
          {
            title: '5. Church Data and Content',
            body: `You retain ownership of all data and content you input into WorshipOps, including service plans, team member information, songs, and messages. By using the Service, you grant WorshipOps a limited license to store and process this data for the purpose of providing the Service to you.`,
          },
          {
            title: '6. Privacy and Data',
            body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We are committed to protecting your data and the personal information of your team members.`,
          },
          {
            title: '7. Acceptable Use',
            body: `You agree not to use the Service to: (a) violate any applicable laws or regulations; (b) transmit any harmful, offensive, or inappropriate content; (c) interfere with or disrupt the integrity or performance of the Service; (d) attempt to gain unauthorized access to any part of the Service or its infrastructure.`,
          },
          {
            title: '8. Intellectual Property',
            body: `The WorshipOps name, logo, software, and all associated intellectual property are owned by WorshipOps and protected by applicable intellectual property laws. You may not copy, modify, or distribute the platform without express written permission.`,
          },
          {
            title: '9. Limitation of Liability',
            body: `To the maximum extent permitted by law, WorshipOps shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the Service. During the beta period, the Service is provided "as is" without any warranty of any kind.`,
          },
          {
            title: '10. Termination',
            body: `We reserve the right to suspend or terminate your access to the Service at any time for any reason, including violation of these Terms. You may terminate your account at any time by contacting support@worshipops.com.`,
          },
          {
            title: '11. Changes to Terms',
            body: `We may update these Terms from time to time. We will notify users of material changes via email or by posting a notice on the Service. Continued use of the Service after changes constitutes acceptance of the updated Terms.`,
          },
          {
            title: '12. Governing Law',
            body: `These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms shall be resolved through good-faith negotiation, and if necessary, binding arbitration.`,
          },
          {
            title: '13. Contact',
            body: `For any questions regarding these Terms, please contact us at:\n\nWorshipOps\nEmail: support@worshipops.com`,
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
            <a href="/privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacy Policy</a>
            {' · '}
            <a href="/" style={{ color: '#64748b', textDecoration: 'underline' }}>Home</a>
          </p>
        </div>
      </div>
    </div>
  );
}
