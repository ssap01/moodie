import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TermsModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ type, onClose }) => {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  const title = type === 'terms' ? 'Terms of Service' : 'Privacy Policy';
  const content = type === 'terms' ? termsContent : privacyContent;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fadeIn">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        className="relative w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] bg-[#D8D5CF] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] p-2 bg-[#D8D5CF]/50 rounded-full md:bg-transparent hover:rotate-90 transition-transform duration-300"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10">
          <h2 className="serif text-2xl md:text-3xl text-[#2D2A26]">{title}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="prose prose-sm max-w-none text-[#2D2A26] space-y-4">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-black/10">
          <button
            onClick={onClose}
            className="w-full bg-black text-[#D8D5CF] py-3 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const termsContent = (
  <>
    <p className="text-[11px] leading-relaxed">
      <strong>Effective Date: February 14, 2026</strong>
    </p>
    <div className="space-y-5 text-[11px] leading-relaxed">
      <section>
        <h3 className="serif text-base mb-2">1. Purpose</h3>
        <p>
          These Terms of Service ("Terms") govern the use of the movie recommendation service ("Service") provided by Moodie Cinema ("Company"). By signing up or using our Service, you ("User") agree to these Terms.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">2. Membership & Accounts</h3>
        <p>
          (1) Membership is established when a user completes the sign-up process and the Company approves the registration.<br />
          (2) Users must provide accurate and current information during sign-up. Any false information may result in restriction or termination of access.<br />
          (3) Users are responsible for maintaining the confidentiality of their account credentials. The Company is not liable for damages caused by the user's failure to manage their account.<br />
          (4) Users must not share, transfer, or allow third parties to use their accounts.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">3. Service Description</h3>
        <p>
          (1) Moodie Cinema provides personalized movie recommendations based on user preferences, ratings, and mood-based input.<br />
          (2) Movie data is sourced from third-party APIs (OMDb/TMDB) and is subject to change without notice.<br />
          (3) The Company may modify, suspend, or discontinue any part of the Service at any time with prior notice when possible.<br />
          (4) The AI chatbot feature provides rule-based recommendations and does not constitute professional advice.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">4. User Obligations</h3>
        <p>
          Users must not engage in any of the following activities:<br />
          (1) Using the Service for illegal or unauthorized purposes.<br />
          (2) Attempting to interfere with or disrupt the Service, servers, or networks.<br />
          (3) Collecting personal information of other users without consent.<br />
          (4) Posting or transmitting harmful content, including but not limited to malware, spam, or offensive material.<br />
          (5) Reverse-engineering, decompiling, or attempting to extract the source code of the Service.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">5. Intellectual Property</h3>
        <p>
          (1) All content, design, and technology used in the Service are the intellectual property of the Company or its licensors.<br />
          (2) Movie information, posters, and images are the property of their respective rights holders and are displayed under applicable licensing terms.<br />
          (3) Users may not copy, reproduce, distribute, or create derivative works from Service content without prior written consent.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">6. Limitation of Liability</h3>
        <p>
          (1) The Company provides the Service "as is" and makes no warranties, express or implied, regarding the accuracy, reliability, or completeness of any content.<br />
          (2) The Company shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of the Service.<br />
          (3) The Company is not responsible for any losses resulting from service interruptions, data loss, or technical failures beyond its reasonable control.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">7. Termination</h3>
        <p>
          (1) Users may terminate their membership at any time by requesting account deletion.<br />
          (2) Upon termination, the account enters a 30-day grace period during which the user may restore their account by logging in. After 30 days, all personal data will be permanently deleted.<br />
          (3) The Company may restrict or terminate a user's account if the user violates these Terms or engages in activities harmful to the Service or other users.<br />
          (4) Upon termination, user data will be handled in accordance with the Privacy Policy.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">8. Dispute Resolution</h3>
        <p>
          (1) These Terms are governed by and construed in accordance with applicable laws.<br />
          (2) Any disputes arising from the use of the Service shall be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to the competent court.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">9. Changes to Terms</h3>
        <p>
          The Company reserves the right to modify these Terms at any time. Changes will be posted on the Service, and continued use after such posting constitutes acceptance of the modified Terms.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">10. Contact</h3>
        <p>
          For questions or concerns regarding these Terms, please contact us at:<br />
          Email: support@moodie-cinema.com
        </p>
      </section>
    </div>
  </>
);

const privacyContent = (
  <>
    <p className="text-[11px] leading-relaxed">
      <strong>Effective Date: February 14, 2026</strong>
    </p>
    <div className="space-y-5 text-[11px] leading-relaxed">
      <section>
        <h3 className="serif text-base mb-2">1. Purpose</h3>
        <p>
          Moodie Cinema ("Company") values the privacy of its users and complies with applicable data protection laws. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Service.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">2. Information We Collect</h3>
        <p>We collect the following personal information during sign-up and service use:</p>
        <table className="w-full mt-2 text-[10px] border border-black/10">
          <thead>
            <tr className="bg-black/5">
              <th className="text-left p-2 border-b border-black/10">Category</th>
              <th className="text-left p-2 border-b border-black/10">Items</th>
              <th className="text-left p-2 border-b border-black/10">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-b border-black/5">Required</td>
              <td className="p-2 border-b border-black/5">Email, Password (encrypted)</td>
              <td className="p-2 border-b border-black/5">Account creation, authentication</td>
            </tr>
            <tr>
              <td className="p-2 border-b border-black/5">Optional</td>
              <td className="p-2 border-b border-black/5">Nickname, Phone number</td>
              <td className="p-2 border-b border-black/5">Profile display, account recovery</td>
            </tr>
            <tr>
              <td className="p-2 border-b border-black/5">Service Data</td>
              <td className="p-2 border-b border-black/5">Movie ratings, chatbot interactions</td>
              <td className="p-2 border-b border-black/5">Personalized recommendations</td>
            </tr>
            <tr>
              <td className="p-2">Auto-collected</td>
              <td className="p-2">Access time, IP address</td>
              <td className="p-2">Service operation, security</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="serif text-base mb-2">3. How We Use Your Information</h3>
        <p>
          (1) Providing and maintaining the Service, including personalized movie recommendations.<br />
          (2) User authentication and account management.<br />
          (3) Improving the Service based on usage patterns and preferences.<br />
          (4) Communicating important notices, updates, and security alerts.<br />
          (5) Preventing fraud, abuse, and unauthorized access.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">4. Data Sharing & Third Parties</h3>
        <p>
          (1) The Company does not sell, rent, or trade your personal information to third parties.<br />
          (2) We may share data with third-party service providers solely for the purpose of operating the Service (e.g., hosting, analytics), under strict confidentiality agreements.<br />
          (3) We may disclose information when required by law, regulation, or legal process.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">5. Data Security</h3>
        <p>
          (1) Passwords are encrypted using bcrypt hashing algorithm and are never stored in plain text.<br />
          (2) All data transmissions are protected using industry-standard encryption (HTTPS/TLS).<br />
          (3) Access to personal data is restricted to authorized personnel only.<br />
          (4) Despite our best efforts, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">6. Data Retention & Deletion</h3>
        <p>
          (1) Personal information is retained for the duration of membership.<br />
          (2) Upon account deletion, the account is placed in a soft-deleted state for 30 days. During this period, users may restore their account by logging in with their existing credentials.<br />
          (3) After the 30-day grace period, all personal data — including email, password, nickname, phone number, ratings, wishlist, and activity logs — will be permanently and irreversibly deleted.<br />
          (4) Where retention is required by applicable law (e.g., transaction records), such data will be retained separately for the legally mandated period and then deleted.<br />
          (5) Service usage data may be anonymized and retained for statistical purposes.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">7. Your Rights</h3>
        <p>
          You have the following rights regarding your personal information:<br />
          (1) <strong>Right to Access:</strong> Request a copy of the personal data we hold about you.<br />
          (2) <strong>Right to Correction:</strong> Request correction of inaccurate or incomplete data.<br />
          (3) <strong>Right to Deletion:</strong> Request deletion of your account and associated data.<br />
          (4) <strong>Right to Withdraw Consent:</strong> Withdraw your consent to data processing at any time by deleting your account.<br />
          (5) To exercise these rights, please contact us at support@moodie-cinema.com.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">8. Cookies & Tracking</h3>
        <p>
          (1) The Service uses JSON Web Tokens (JWT) stored in local storage for authentication purposes.<br />
          (2) We do not use third-party tracking cookies or advertising technologies.<br />
          (3) Users may clear local storage through their browser settings at any time.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">9. Children's Privacy</h3>
        <p>
          The Service is not intended for users under the age of 14. We do not knowingly collect personal information from children under 14. If we become aware that we have collected data from a child under 14, we will take steps to delete such information promptly.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">10. Changes to This Policy</h3>
        <p>
          The Company may update this Privacy Policy from time to time. Any changes will be posted on the Service with an updated effective date. Continued use of the Service after changes constitutes acceptance of the updated Policy.
        </p>
      </section>
      <section>
        <h3 className="serif text-base mb-2">11. Contact</h3>
        <p>
          For questions, concerns, or requests regarding your personal information, please contact us at:<br />
          Email: support@moodie-cinema.com<br />
          Data Protection Officer: privacy@moodie-cinema.com
        </p>
      </section>
    </div>
  </>
);

export default TermsModal;
