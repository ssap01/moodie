import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ContactModalProps {
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  const email = 'support@moodie-cinema.com';
  const dpoEmail = 'privacy@moodie-cinema.com';

  const copyToClipboard = async (text: string) => {
    const onSuccess = () => {
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    };
    const fallbackCopy = (): boolean => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        onSuccess();
        return;
      }
    } catch {
      /* clipboard API failed, try fallback */
    }
    if (fallbackCopy()) onSuccess();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fadeIn">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        className="relative w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] bg-[#D8D5CF] shadow-2xl overflow-hidden flex flex-col"
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
          <h2 className="serif text-2xl md:text-3xl text-[#2D2A26]">Contact Us</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="space-y-8 text-[#2D2A26]">
            <div>
              <h3 className="serif text-lg mb-4">General Inquiries</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm">{email}</p>
                <button
                  onClick={() => copyToClipboard(email)}
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-4 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  {copiedEmail === email ? 'Copied!' : 'Copy'}
                </button>
                <a
                  href={`mailto:${email}`}
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-4 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  Send Email
                </a>
              </div>
            </div>

            <div className="border-t border-black/10 pt-6">
              <h3 className="serif text-lg mb-4">Privacy & Data Protection</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm">{dpoEmail}</p>
                <button
                  onClick={() => copyToClipboard(dpoEmail)}
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-4 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  {copiedEmail === dpoEmail ? 'Copied!' : 'Copy'}
                </button>
                <a
                  href={`mailto:${dpoEmail}`}
                  className="text-[10px] uppercase tracking-wider border border-black/20 px-4 py-2 hover:bg-black hover:text-[#D8D5CF] transition-all"
                >
                  Send Email
                </a>
              </div>
            </div>

            <div className="border-t border-black/10 pt-6">
              <p className="text-[11px] leading-relaxed opacity-60">
                We typically respond within 24-48 hours. For urgent matters, please include "URGENT" in your subject line.
              </p>
            </div>
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

export default ContactModal;
