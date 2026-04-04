/**
 * SafeText.tsx
 * A component for rendering text securely, preventing XSS while allowing URL linkification.
 */

import React, { useMemo } from 'react';

interface SafeTextProps {
  text?: string;
  className?: string;
  truncate?: boolean;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const SafeText: React.FC<SafeTextProps> = ({ text = '', className = '', truncate = false }) => {
  const parts = useMemo(() => {
    if (!text) return [];
    
    // Split text by URL regex to handle linkification safely
    return text.split(URL_REGEX).map((part, index) => {
      if (part.match(URL_REGEX)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [text]);

  return (
    <div className={`whitespace-pre-wrap ${truncate ? 'truncate' : ''} ${className}`}>
      {parts}
    </div>
  );
};
