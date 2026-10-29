import {
  LayoutDashboard,
  MapPin,
  Camera,
  CloudSun,
  Sparkles,
  Share2,
  ShieldAlert,
  Settings,
  FileText,
  Users,
  UserCheck,
  Shield,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types/auth';

export interface NavItem {
  label: string;
  i18nKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  isBottomNav?: boolean;
}

export const navItemsByRole: Record<UserRole, NavItem[]> = {
  farmer: [
    { label: 'Dashboard', i18nKey: 'nav.dashboard', href: '/farmer', icon: LayoutDashboard, isBottomNav: true },
    { label: 'Plots', i18nKey: 'nav.plots', href: '/farmer/plots', icon: MapPin, isBottomNav: true },
    { label: 'AI Assistant', i18nKey: 'nav.aiAssistant', href: '/farmer/ai-assistant', icon: Sparkles, isBottomNav: true },
    { label: 'Weather', i18nKey: 'nav.weather', href: '/farmer/weather', icon: CloudSun, isBottomNav: true },
    { label: 'Sharing', i18nKey: 'nav.sharing', href: '/farmer/sharing', icon: Share2, isBottomNav: true },
    { label: 'Photos', i18nKey: 'nav.photos', href: '/farmer/photos', icon: Camera, isBottomNav: false },
    { label: 'Audit Log', i18nKey: 'nav.auditLog', href: '/farmer/audit', icon: ShieldAlert, isBottomNav: false },
    { label: 'Settings', i18nKey: 'nav.settings', href: '/farmer/settings', icon: Settings, isBottomNav: false },
  ],
  officer: [
    { label: 'Dashboard', i18nKey: 'nav.dashboard', href: '/officer', icon: LayoutDashboard, isBottomNav: true },
    { label: 'Shared Plots', i18nKey: 'nav.sharedPlots', href: '/officer/shared-plots', icon: MapPin, isBottomNav: true },
    { label: 'Advisory Notes', i18nKey: 'nav.advisoryNotes', href: '/officer/notes', icon: FileText, isBottomNav: true },
  ],
  admin: [
    { label: 'Users', i18nKey: 'nav.users', href: '/admin/users', icon: Users, isBottomNav: true },
    { label: 'Officers', i18nKey: 'nav.officers', href: '/admin/officers', icon: UserCheck, isBottomNav: true },
    { label: 'Audit Journal', i18nKey: 'nav.auditJournal', href: '/admin/audit', icon: Shield, isBottomNav: true },
  ],
};
