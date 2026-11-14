import React from 'react';

interface PlanetAILogoProps {
  className?: string;
}

export const PlanetAILogo: React.FC<PlanetAILogoProps> = ({
  className = 'w-9 h-9',
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="planetai-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.38" />
          <stop offset="70%" stopColor="#0EA5E9" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#090D16" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="planetai-sphere"
          x1="18"
          y1="18"
          x2="46"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="48%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <linearGradient
          id="planetai-ring"
          x1="8"
          y1="24"
          x2="56"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="50%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {/* Atmospheric outer glow */}
      <circle cx="32" cy="32" r="30" fill="url(#planetai-glow)" />

      {/* Back arc of AI circuit ring */}
      <path
        d="M10.5 39.5C7.8 34.4 14.8 26.8 27.6 22.3C40.4 17.8 52.8 18.7 55.2 24.1"
        stroke="#0284C7"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />

      {/* Planet core */}
      <circle cx="32" cy="32" r="14.5" fill="url(#planetai-sphere)" />

      {/* Subtle internal AI circuit trace */}
      <path
        d="M25 28.5H29.5L32 32L35.5 27.5H39"
        stroke="#082F49"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.55"
      />
      <circle cx="32" cy="32" r="2.2" fill="#E0F2FE" />
      <circle cx="24.5" cy="28.5" r="1.4" fill="#BAE6FD" />
      <circle cx="39" cy="27.5" r="1.4" fill="#BAE6FD" />

      {/* Front glowing AI circuit ring */}
      <path
        d="M55.2 24.1C57.6 29.5 49.4 37.3 36.6 41.8C23.8 46.3 13.2 44.6 10.5 39.5"
        stroke="url(#planetai-ring)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Orbital circuit nodes */}
      <circle
        cx="11.5"
        cy="39.8"
        r="2.6"
        fill="#67E8F9"
        stroke="#090D16"
        strokeWidth="1.2"
      />
      <circle
        cx="53.6"
        cy="23.4"
        r="2.6"
        fill="#38BDF8"
        stroke="#090D16"
        strokeWidth="1.2"
      />
    </svg>
  );
};
