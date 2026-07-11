import {
    MessageSquare,
    FolderOpen,
    Settings
} from "lucide-react";

const items = [
    {
        icon: MessageSquare,
        title: "New Chat",
    },
    {
        icon: FolderOpen,
        title: "Workspace",
    },
    {
        icon: Settings,
        title: "Settings",
    },
];

export default function SidebarContent() {
    return (
        <div className="flex flex-col gap-2 p-3">
            {items.map((item) => (
                <button
                    key={item.title}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-zinc-800"
                >
                    <item.icon size={18} />
                    {item.title}
                </button>
            ))}
        </div>
    );
}