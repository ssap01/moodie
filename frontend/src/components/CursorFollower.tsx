import React, { useEffect, useState } from 'react';

const CursorFollower: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('.interactive')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
    };
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 w-8 h-8 rounded-full border border-black/40 pointer-events-none z-[10000] transition-all duration-300 ease-out -translate-x-1/2 -translate-y-1/2 ${
        isHovering ? 'scale-[2.5] bg-black/5 border-black/10' : 'scale-100'
      }`}
      style={{ left: position.x, top: position.y }}
      aria-hidden
    />
  );
};

export default CursorFollower;
