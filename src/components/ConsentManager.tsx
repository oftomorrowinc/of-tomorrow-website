import React, { useState, useEffect } from 'react';
import { CookieBanner } from './CookieBanner';
import { CookieSettingsModal } from './CookieSettingsModal';
import { initializeTracking } from '../utils/consent';

export const ConsentManager: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Initialize tracking on component mount if consent already exists
    initializeTracking();

    // Listen for custom events to open settings modal
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };

    window.addEventListener('openCookieSettings', handleOpenSettings);

    return () => {
      window.removeEventListener('openCookieSettings', handleOpenSettings);
    };
  }, []);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <CookieBanner onOpenSettings={handleOpenSettings} />
      <CookieSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={handleCloseSettings} 
      />
    </>
  );
};