import { Providers } from "@/components/providers";
import { OrgProvider } from "@/contexts/org-context";
import { AdminNotificationsDashboard } from "./AdminNotificationsDashboard";

interface AdminNotificationsWrapperProps {
    initialData?: any;
}

export function AdminNotificationsWrapper({ initialData }: AdminNotificationsWrapperProps) {
    return (
        <Providers>
            <OrgProvider initialData={initialData}>
                <AdminNotificationsDashboard />
            </OrgProvider>
        </Providers>
    );
}
