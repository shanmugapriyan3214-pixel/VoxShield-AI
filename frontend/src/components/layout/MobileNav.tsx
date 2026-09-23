import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PhoneCall,
  Mic,
  ShieldAlert,
  User,
} from 'lucide-react';

const mobileNavItems = [
  { name: 'Home', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Protect', path: '/app/calls', icon: PhoneCall },
  { name: 'Analyze', path: '/app/analyzer', icon: Mic },
  { name: 'Threats', path: '/app/threat-history', icon: ShieldAlert },
  { name: 'Profile', path: '/app/settings', icon: User },
];

export const MobileNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D131F]/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition ${
                isActive
                  ? 'text-cyan-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
