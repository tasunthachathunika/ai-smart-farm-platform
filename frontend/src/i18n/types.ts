export type SupportedLocale = 'en' | 'si' | 'ta';

export interface TranslationDictionary {
  common: {
    appName: string;
    tagline: string;
    save: string;
    cancel: string;
    continue: string;
    back: string;
    confirm: string;
    delete: string;
    refresh: string;
    close: string;
    loading: string;
    signOut: string;
    viewAll: string;
    active: string;
    pending: string;
    revoked: string;
    expired: string;
    verified: string;
    dismiss: string;
  };
  nav: {
    dashboard: string;
    plots: string;
    aiAssistant: string;
    weather: string;
    sharing: string;
    photos: string;
    auditLog: string;
    settings: string;
    sharedPlots: string;
    advisoryNotes: string;
    users: string;
    officers: string;
    auditJournal: string;
  };
  auth: {
    signIn: string;
    signInSubtitle: string;
    register: string;
    registerSubtitle: string;
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: string;
    farmerRole: string;
    officerRole: string;
    adminRole: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    sessionExpired: string;
    sessionExpiredDescription: string;
  };
  dashboard: {
    welcome: string;
    registeredPlots: string;
    quickStats: string;
    activeCrop: string;
    cultivatedArea: string;
    district: string;
    newPlotButton: string;
    recentActivities: string;
    weatherWidgetTitle: string;
    aiAssistantCta: string;
  };
  ai: {
    disclaimerTitle: string;
    disclaimerNotice: string;
    generateBriefing: string;
    generateSummary: string;
    suggestedQuestions: string;
    keyObservations: string;
    discussionPoints: string;
    fallbackNotice: string;
  };
  consent: {
    summaryTitle: string;
    summaryPrefix: string;
    summaryReadAccess: string;
    summaryUntil: string;
    summaryRevokeNotice: string;
    gpsPrivacyNotice: string;
    immutableAuditNotice: string;
  };
  hero: {
    slide1Location: string;
    slide2Location: string;
    slide3Location: string;
    showSlide: string;
  };
}
