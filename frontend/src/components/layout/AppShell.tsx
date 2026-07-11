import Sidebar from "../sidebar/Sidebar";
import MainLayout from "./MainLayout";

export default function AppShell() {
    return (
        <div className="flex h-screen">

            <Sidebar />

            <MainLayout />

        </div>
    );
}