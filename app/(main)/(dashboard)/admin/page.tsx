import { AdminResetSection } from '@/components/admin/AdminResetSection';
import { PendingApplicationsList } from '@/components/admin/PendingApplicationsList';

export default function AdminPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-1 px-8 py-12">
      <h1 className="mb-10 text-3xl font-normal text-gray-12">
        Admin Dashboard
      </h1>

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
