import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { NotificationsWrapper } from "@/components/dashboard/NotificationsWrapper";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { SidebarAwareMain } from "@/components/dashboard/SidebarAwareMain";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NotificationsWrapper>
            <SidebarProvider>
                <div className="flex min-h-screen bg-slate-50">
                    {/* Sidebar - Desktop */}
                    <Sidebar />

                    {/* Main Content Area */}
                    <SidebarAwareMain>
                        {/* Header (Top Nav) */}
                        <Header />

                        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                            {children}
                        </main>
                    </SidebarAwareMain>
                </div>
            </SidebarProvider>
        </NotificationsWrapper>
    );
}
