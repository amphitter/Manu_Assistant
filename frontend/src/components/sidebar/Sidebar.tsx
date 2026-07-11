import SidebarHeader from "./SidebarHeader";
import SidebarContent from "./SidebarContent";
import SidebarFooter from "./SidebarFooter";

export default function Sidebar() {
    return (
        <aside className="flex h-screen w-72 flex-col border-r bg-zinc-950">
            <SidebarHeader />

            <div className="flex-1 overflow-auto">
                <SidebarContent />
            </div>

            <SidebarFooter />
        </aside>
    );
}