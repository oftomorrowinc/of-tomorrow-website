import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Settings, Cookie } from 'lucide-react';
import { 
  shouldShowBanner, 
  acceptAllCookies, 
  rejectAllCookies, 
  dismissBanner,
  initializeTracking 
} from '../utils/consent';

interface CookieBannerProps {
  onOpenSettings: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenSettings }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner should be shown after component mounts
    setIsVisible(shouldShowBanner());
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    initializeTracking();
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    rejectAllCookies();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    dismissBanner();
    setIsVisible(false);
  };

  const handleOpenSettings = () => {
    dismissBanner();
    setIsVisible(false);
    onOpenSettings();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border-gray shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <Cookie className="h-5 w-5 text-tomorrow-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary font-medium mb-1">
                We use cookies to enhance your experience
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                We use necessary cookies to make our website work properly. We'd also like to use analytics 
                and marketing cookies to help us improve and show you relevant content. You can choose which 
                cookies to accept by clicking "Cookie Settings" or accept all by clicking "Accept All".
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="text-xs whitespace-nowrap gap-1"
            >
              <Settings className="h-3 w-3" />
              Cookie Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              className="text-xs whitespace-nowrap"
            >
              Reject All
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptAll}
              className="text-xs whitespace-nowrap bg-tomorrow-blue hover:bg-tomorrow-blue/90"
            >
              Accept All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="p-1 h-auto text-text-secondary hover:text-text-primary"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};