import type { Metadata } from 'next';
import { currentAdmin } from '@/lib/auth';
import { getSettings, getPosts, getSocials, getArchive } from '@/lib/queries';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

// Il pannello non deve finire su Google.
export const metadata: Metadata = {
  title: 'Pannello — Simone Tuccio',
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  const admin = await currentAdmin();
  if (!admin) return <AdminLogin />;

  const [settings, posts, socials, archive] = await Promise.all([
    getSettings(),
    getPosts(true),      // nel pannello si vedono anche le bozze
    getSocials(true),    // e i social nascosti
    getArchive(true)
  ]);

  return (
    <AdminDashboard
      admin={admin}
      settings={settings}
      posts={posts}
      socials={socials}
      archive={archive}
    />
  );
}
