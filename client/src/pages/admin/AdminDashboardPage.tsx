import { useAuth } from "../../context/AuthContext";
import { useAdminActivity } from "../../hooks/useAdmin";
import ActivityList from "../../components/admin/ActivityList";
import Panel from "../../components/ui/Panel";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const activity = useAdminActivity({ limit: 20 });

  return (
    <div>
      <h1 className="page-title text-ink">Dashboard</h1>
      <p className="muted mt-1">Signed in as {user?.email}.</p>

      <Panel className="mt-6 overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-lg font-semibold text-ink">Recent activity</h2>
        <ActivityList
          entries={activity.data?.items}
          isLoading={activity.isLoading}
          isError={activity.isError}
          onRetry={() => activity.refetch()}
        />
      </Panel>
    </div>
  );
}
