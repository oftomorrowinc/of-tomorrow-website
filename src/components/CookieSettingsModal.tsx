import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { X, Shield, BarChart3, Target, Info } from 'lucide-react';
import { 
  getConsent, 
  saveConsent, 
  acceptAllCookies, 
  rejectAllCookies,
  initializeTracking,
  COOKIE_CATEGORIES,
  type CookieConsent,
  type CookieCategory,
  DEFAULT_CONSENT
} from '../utils/consent';

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({ isOpen, onClose }) => {
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT);

  useEffect(() => {
    if (isOpen) {
      const currentConsent = getConsent();
      setConsent(currentConsent || DEFAULT_CONSENT);
    }
  }, [isOpen]);

  const handleToggle = (category: CookieCategory) => {
    if (category === 'necessary') return; // Cannot toggle necessary cookies
    
    setConsent(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSavePreferences = () => {
    saveConsent(consent);
    initializeTracking();
    onClose();
  };

  const handleAcceptAll = () => {
    acceptAllCookies();
    initializeTracking();
    onClose();
  };

  const handleRejectAll = () => {
    rejectAllCookies();
    onClose();
  };

  const getCategoryIcon = (category: CookieCategory) => {
    switch (category) {
      case 'necessary':
        return <Shield className="h-5 w-5 text-tomorrow-blue" />;
      case 'analytics':
        return <BarChart3 className="h-5 w-5 text-progress-orange" />;
      case 'marketing':
        return <Target className="h-5 w-5 text-innovation-purple" />;
      default:
        return <Info className="h-5 w-5 text-text-secondary" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-gray">
          <div>
            <h2 className="text-xl font-brand font-semibold text-text-primary">
              Cookie Settings
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Manage your cookie preferences for the best experience
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 h-auto text-text-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            <div className="text-sm text-text-secondary">
              <p>
                We use cookies to provide you with the best possible experience on our website. 
                Some cookies are essential for the website to function, while others help us 
                understand how you use our site and show you relevant content.
              </p>
            </div>

            {Object.entries(COOKIE_CATEGORIES).map(([category, config]) => {
              const isEnabled = consent[category as CookieCategory];
              const isRequired = config.required;

              return (
                <Card key={category} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(category as CookieCategory)}
                        <div>
                          <CardTitle className="text-base font-medium">
                            {config.name}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {config.description}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {isRequired ? (
                          <span className="text-xs bg-tomorrow-blue/10 text-tomorrow-blue px-2 py-1 rounded-full font-medium">
                            Required
                          </span>
                        ) : (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggle(category as CookieCategory)}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-border-gray peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tomorrow-blue"></div>
                          </label>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="text-xs text-text-secondary">
                      <p className="font-medium mb-2">Cookies used:</p>
                      <ul className="space-y-1">
                        {config.cookies.map((cookie, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-text-secondary rounded-full flex-shrink-0" />
                            {cookie}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6 border-t border-border-gray bg-bg-secondary">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              className="text-xs"
            >
              Reject All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
              className="text-xs"
            >
              Accept All
            </Button>
          </div>
          
          <Button
            onClick={handleSavePreferences}
            size="sm"
            className="bg-tomorrow-blue hover:bg-tomorrow-blue/90 text-xs"
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};