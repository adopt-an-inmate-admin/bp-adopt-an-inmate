import { AdminResetSection } from '@/components/admin/AdminResetSection';
import { PendingApplicationsList } from '@/components/admin/PendingApplicationsList';

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-8">
        <section>
          <PendingApplicationsList />
        </section>

        <section>
          <AdminResetSection />
        </section>
      </div>
    </div>
  );
}
