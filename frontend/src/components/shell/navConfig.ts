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
  href: string;
  icon: LucideIcon;
  badge?: string;
  isBottomNav?: boolean;
}

export const navItemsByRole: Record<UserRole, NavItem[]> = {
  farmer: [
    { label: 'Dashboard', href: '/farmer', icon: LayoutDashboard, isBottomNav: true },
    { label: 'Plots', href: '/farmer/plots', icon: MapPin, isBottomNav: true },
    { label: 'AI Assistant', href: '/farmer/ai', icon: Sparkles, isBottomNav: true },
    { label: 'Weather', href: '/farmer/weather', icon: CloudSun, isBottomNav: true },
    { label: 'Sharing', href: '/farmer/sharing', icon: Share2, isBottomNav: true },
    { label: 'Photos', href: '/farmer/photos', icon: Camera, isBottomNav: false },
    { label: 'Audit Log', href: '/farmer/audit', icon: ShieldAlert, isBottomNav: false },
    { label: 'Settings', href: '/farmer/settings', icon: Settings, isBottomNav: false },
  ],
  officer: [
    { label: 'Dashboard', href: '/officer', icon: LayoutDashboard, isBottomNav: true },
    { label: 'Shared Plots', href: '/officer/shared-plots', icon: MapPin, isBottomNav: true },
    { label: 'Advisory Notes', href: '/officer/notes', icon: FileText, isBottomNav: true },
  ],
  admin: [
    { label: 'Users', href: '/admin/users', icon: Users, isBottomNav: true },
    { label: 'Officers', href: '/admin/officers', icon: UserCheck, isBottomNav: true },
    { label: 'Audit Journal', href: '/admin/audit', icon: Shield, isBottomNav: true },
  ],
};
