import React, {useEffect, useState} from 'react';
import {getCompanyLogoUrl} from '../utils/companyLogos';

interface CompanyLogoProps {
  company: string;
  short: string;
  explicitLogoUrl?: string;
  websiteOrApplyUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', {box: string; text: string}> = {
  sm: {box: 'h-7 w-7 rounded-lg', text: 'text-[10px]'},
  md: {box: 'h-10 w-10 rounded-xl', text: 'text-xs'},
  lg: {box: 'h-11 w-11 rounded-xl', text: 'text-sm'},
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  short,
  explicitLogoUrl,
  websiteOrApplyUrl,
  size = 'md',
}) => {
  const resolvedLogoUrl = getCompanyLogoUrl(
    company,
    explicitLogoUrl,
    websiteOrApplyUrl
  );
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [resolvedLogoUrl]);

  const {box, text} = SIZE_CLASSES[size];

  if (resolvedLogoUrl && !logoFailed) {
    return (
      <div
        className={`${box} shrink-0 overflow-hidden border border-slate-700/70 bg-white p-1 flex items-center justify-center shadow-sm`}
      >
        <img
          src={resolvedLogoUrl}
          alt={`${company} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setLogoFailed(true)}
          onLoad={(e) => {
            // Google s2 returns a 16x16 generic globe when a domain has no icon
            if (!explicitLogoUrl && e.currentTarget.naturalWidth <= 16) {
              setLogoFailed(true);
            }
          }}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex ${box} shrink-0 items-center justify-center border border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-900 font-display ${text} font-bold tracking-tight text-cyan-300`}
    >
      {short}
    </div>
  );
};
