'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LuClock,
  LuHeart,
  LuInfo,
  LuLayoutDashboard,
  LuShield,
  LuUser,
} from 'react-icons/lu';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import LogoutButton from '@/components/MainDashboard/LogoutButton';
import { useAuth } from '@/contexts/AuthProvider';
import { useProfile } from '@/contexts/ProfileProvider';
import { t } from '@/lib/i18n';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { appIsActive } from '@/lib/utils';
import { AdopterApplication } from '@/types/schema';
import { ButtonLink } from './Button';
import SidebarItem from './SidebarItem';

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const { profileData } = useProfile();
  const { userId, userEmail } = useAuth();

  const isAdmin = userEmail?.toLowerCase() === 'admin@adoptaninmate.org';

  // counts for Applications and History
  const [activeCount, setActiveCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);

  // fetch application counts
  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!userId) return;

      const [{ data: apps }, { data: externalData }] = await Promise.all([
        supabase
          .from('adopter_applications')
          .select('*')
          .eq('adopter_uuid', userId),
        supabase
          .from('adopter_num_external_active')
          .select('num_external_active')
          .eq('adopter_uuid', userId)
          .maybeSingle(),
      ]);

      const external = externalData?.num_external_active ?? 0;

      if (!apps) return;

      setActiveCount(
        apps.filter((app: AdopterApplication) => appIsActive(app)).length +
          external,
      );
      setHistoryCount(
        apps.filter((app: AdopterApplication) => !appIsActive(app)).length,
      );
    };

    fetchCounts();
  }, [userId, pathname, tab]);

  const NAV_LINKS = [
    ...(isAdmin
      ? [
          {
            href: '/admin',
            label: t('sidebar.admin'),
            icon: LuShield,
            external: false,
          },
        ]
      : []),
    {
      href: '/',
      label: t('sidebar.applications', { count: activeCount.toString() }),
      icon: LuLayoutDashboard,
      external: false,
    },
    {
      href: '/?tab=history',
      label: t('sidebar.history', { count: historyCount.toString() }),
      icon: LuClock,
      external: false,
    },
    {
      href: 'https://givebutter.com/zuB5RG',
      label: t('sidebar.donate'),
      icon: LuHeart,
      external: true,
    },
    {
      href: 'https://adoptaninmate.org/adopting/',
      label: t('sidebar.learn_more'),
      icon: LuInfo,
      external: true,
    },
  ] as const;

  const displayName = useMemo(
    () =>
      profileData?.first_name ||
      (isAdmin ? t('sidebar.admin') : t('sidebar.user')),
    [profileData?.first_name, isAdmin],
  );

  // isActive checks for startsWith on Applications/History hrefs
  const isActive = (href: string) => {
    if (href === '/')
      return (
        (pathname === '/' || pathname.startsWith('/app')) && tab !== 'history'
      );
    if (href === '/?tab=history') return pathname === '/' && tab === 'history';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sticky top-0 flex h-svh flex-col items-center gap-8 border-r border-gray-4 bg-gray-1 px-8 pt-13 pb-10">
      {/* Logo */}
      <Link href="/">
        <Logo variant="sidebar" />
      </Link>

      {/* Greeting */}
      <section className="flex w-56 flex-col gap-4">
        <p className="text-xl text-black/60">
          {t('sidebar.greeting', { name: displayName })}
        </p>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon, external }) => {
            const active = isActive(href);
            return (
              <SidebarItem
                key={label}
                active={active}
                label={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
              </SidebarItem>
            );
          })}
        </nav>
      </section>

      {/* User profile + logout */}
      <div className="mt-auto flex w-full flex-col gap-2">
        <ButtonLink
          variant="outline"
          href="/profile"
          className="h-auto min-w-0 flex-1 items-center justify-start px-4! py-2"
        >
          <LuUser className="size-5 shrink-0 text-red-9" />
          <div className="flex min-w-0 flex-col items-start gap-0">
            <p className="w-full overflow-hidden text-left text-sm font-medium overflow-ellipsis whitespace-nowrap">
              {displayName}
            </p>
            {userEmail && (
              <p className="w-full overflow-hidden text-left text-[10px] overflow-ellipsis whitespace-nowrap text-gray-11">
                {userEmail}
              </p>
            )}
          </div>
        </ButtonLink>
        <LogoutButton showLabel />
      </div>
    </aside>
  );
}
