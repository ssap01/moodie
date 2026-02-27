import React from 'react';

interface PosterPlaceholderProps {
  className?: string;
  /** 작은 카드일 때는 false로 텍스트 생략 가능 */
  showLabel?: boolean;
}

/**
 * 포스터가 없을 때 쓰는 플레이스홀더.
 * 무디 톤(베이지/그레이) + 필름 아이콘 + 선택적 문구.
 */
const PosterPlaceholder: React.FC<PosterPlaceholderProps> = ({
  className = '',
  showLabel = true,
}) => (
  <div
    className={`w-full h-full flex flex-col items-center justify-center bg-[#D8D5CF]/80 text-[#2D2A26]/40 ${className}`}
    aria-hidden
  >
    <svg
      className="w-1/4 h-auto max-w-[64px] max-h-[64px] flex-shrink-0 opacity-50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
    </svg>
    {showLabel && (
      <span className="mt-2 text-xs font-medium tracking-wide uppercase">
        No Poster
      </span>
    )}
  </div>
);

export default PosterPlaceholder;
