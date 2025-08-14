# Meta Pixel Implementation Guide for Of Tomorrow Website

## Overview

This implementation provides comprehensive Meta Pixel tracking for the Of Tomorrow business website with full GDPR compliance, iOS 14.5+ compatibility, and advanced conversion optimization features.

## Key Features Implemented

### ✅ GDPR Compliance
- Only loads Meta Pixel after marketing consent is granted
- Respects user privacy choices
- Integrates with existing consent management system
- Automatic consent checking before all tracking calls

### ✅ iOS 14.5+ Compliance
- Automatic advanced matching enabled
- Proper first-party data collection
- iOS and Safari detection for enhanced attribution
- Data processing options configured for California users (LDU)

### ✅ Conversion Events Configured
- **PageView**: Standard page view tracking with enhanced parameters
- **Lead**: Contact form submissions and business inquiries
- **ViewContent**: Service page views and content engagement
- **Contact**: Various contact methods tracking
- **InitiateCheckout**: High-value actions (consultations, quotes)
- **CompleteRegistration**: Lead form completions
- **Search**: Site search functionality

### ✅ Custom Business Events
- `OfTomorrow_ContactFormStart`: When users begin contact forms
- `OfTomorrow_ServiceInterest`: Service page interactions
- `OfTomorrow_CTAClick`: Call-to-action button clicks
- `OfTomorrow_FileDownload`: Document downloads
- `OfTomorrow_ExternalLink`: External link clicks
- `OfTomorrow_ScrollDepth`: Scroll milestone tracking
- `OfTomorrow_EngagementMilestone`: User engagement scoring

### ✅ Advanced Features
- Automatic form field detection for enhanced matching
- Viewport visibility tracking for content attribution
- Scroll depth milestone tracking
- File download detection
- External link tracking
- Button click automation

## File Structure

```
src/
├── components/
│   └── TrackingScripts.astro     # Main tracking implementation
├── utils/
│   ├── consent.ts                # GDPR consent management
│   ├── tracking.ts               # TypeScript definitions
│   └── meta-pixel-helpers.ts     # Helper functions and testing
└── META_PIXEL_IMPLEMENTATION.md  # This guide
```

## Configuration

### Environment Variables
Ensure your `.env` file contains:

```bash
PUBLIC_META_PIXEL_ID=YOUR_ACTUAL_PIXEL_ID
```

Replace `123456789012345` with your actual Meta Pixel ID from Facebook Business Manager.

### Consent Integration
The Meta Pixel only activates when:
1. User accepts marketing cookies in the consent banner
2. The `marketing` consent category is set to `true`
3. Meta Pixel ID is properly configured in environment variables

## Event Tracking Examples

### Automatic Tracking
These events are tracked automatically:
- Page views (after consent)
- Button clicks (all buttons on site)
- External link clicks
- File downloads
- Form interactions
- Scroll milestones

### Manual Tracking
Use these functions for custom tracking:

```javascript
// Track contact form submission
window.tracker.trackContactFormSubmit('email');

// Track service interest
window.tracker.trackServiceInterest('Web Development');

// Track custom business event
window.tracker.trackBusinessEvent('CustomAction', {
  value: 50,
  currency: 'USD'
});

// Using Meta Pixel helpers directly
const metaTracker = window.createMetaPixelTracker();
if (metaTracker) {
  metaTracker.trackLead('newsletter_signup', 25);
}
```

## Testing and Verification

### 1. Browser Testing

#### Install Meta Pixel Helper
1. Install the [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) Chrome extension
2. Visit your website
3. Check that the extension shows your pixel is loaded and firing

#### Test Consent Flow
1. Open your site in incognito mode
2. Verify Meta Pixel is NOT loading initially
3. Accept marketing cookies in consent banner
4. Verify Meta Pixel loads and fires PageView event
5. Test various interactions (button clicks, form focus, etc.)

### 2. Events Manager Verification

#### Access Events Manager
1. Go to [Facebook Business Manager](https://business.facebook.com)
2. Navigate to Events Manager
3. Select your pixel
4. Use the "Test Events" tab for real-time verification

#### Verify Event Quality
1. Check Event Match Quality scores
2. Ensure events have proper parameters
3. Monitor for any error messages
4. Verify event attribution

### 3. Development Testing

Use the built-in test helpers in browser console:

```javascript
// Check pixel status
metaPixelHelpers.testHelpers.checkPixelStatus();

// Send test events
metaPixelHelpers.testHelpers.sendTestEvents();

// Log current configuration
metaPixelHelpers.testHelpers.logConfiguration();

// Validate event parameters
metaPixelHelpers.testHelpers.validateEventParams('Lead', {
  value: 100,
  currency: 'USD'
});
```

## Value Optimization Setup

### Conversion Values Configured
- Contact Form Submission: $100
- High-Value CTA Click: $50
- Service Interest: $75
- File Download: $30
- Scroll Completion: $20

### Requirements for Value Optimization
- 30+ conversion events with values in 7 days
- Consistent value parameters across events
- Regular campaign optimization in Ads Manager

## Advanced Matching

### Automatic Data Collection
- Email addresses from form inputs (hashed)
- First and last names (when available)
- Phone numbers (formatted)

### Manual User Data Setting
```javascript
const metaTracker = window.createMetaPixelTracker();
if (metaTracker) {
  metaTracker.setUserData({
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890'
  });
}
```

## Aggregated Event Measurement (iOS 14.5+)

### Priority Events Configured (in order)
1. **Lead** - Highest priority for business
2. **InitiateCheckout** - High-value actions
3. **Contact** - Contact interactions
4. **ViewContent** - Content engagement
5. **CompleteRegistration** - Form completions
6. **PageView** - Basic engagement
7. **Search** - Site search
8. **Custom Events** - Business-specific actions

## Troubleshooting

### Common Issues

#### Pixel Not Loading
- Check if marketing consent is granted
- Verify `PUBLIC_META_PIXEL_ID` in environment variables
- Check browser console for JavaScript errors

#### Events Not Firing
- Ensure consent management is working
- Check Meta Pixel Helper for real-time diagnostics
- Verify event parameters are valid

#### Low Event Match Quality
- Implement more user data collection
- Enable automatic advanced matching
- Use server-side tracking (Conversions API)

### Debug Mode
In development (localhost), debug logging is automatically enabled:
- Meta Pixel events are logged to console
- Test helpers are available globally
- Enhanced error reporting is active

## Integration with Google Analytics

The implementation seamlessly integrates with existing Google Analytics tracking:
- Events are sent to both platforms when respective consent is given
- GA4 events are automatically mapped to Meta Pixel equivalents
- No duplicate tracking concerns
- Unified consent management

## Future Enhancements

### Conversions API (Server-Side Tracking)
For enhanced iOS 14.5+ attribution, consider implementing:
- Server-side event tracking
- Event deduplication
- Enhanced matching parameters
- Better conversion attribution

### Custom Audiences
Use tracked events to create:
- Website visitor audiences
- Service-interested prospects
- High-engagement users
- Lookalike audiences for campaigns

## Compliance Notes

### GDPR Compliance
- ✅ Only tracks after explicit consent
- ✅ Respects user preferences
- ✅ Provides clear opt-out mechanism
- ✅ Properly documented data collection

### CCPA Compliance
- ✅ Limited Data Use flag configured
- ✅ Automatic data processing options
- ✅ User consent respected

## Performance Impact

### Optimization Features
- Lazy loading of Meta Pixel script
- Conditional loading based on consent
- Efficient event batching
- Minimal DOM manipulation

### Resource Usage
- ~15KB additional JavaScript (when loaded)
- Minimal impact on Core Web Vitals
- Asynchronous loading to prevent blocking

---

## Meta Pixel Implementation Status: ✅ COMPLETE

The Meta Pixel implementation for Of Tomorrow is now fully configured with:
- GDPR compliance ✅
- iOS 14.5+ optimization ✅
- Comprehensive event tracking ✅
- Advanced matching ✅
- Value optimization ready ✅
- Testing tools included ✅

Ready for production use with proper conversion tracking for business growth!