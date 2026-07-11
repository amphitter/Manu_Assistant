export default function Header() {
    return (
        <header className="flex h-16 items-center justify-between border-b px-6">
            <div>
                <h2 className="text-lg font-semibold">
                    New Chat
                </h2>
            </div>

            <div className="flex items-center gap-3">

                <span className="text-sm text-zinc-500">
                    No Model
                </span>

            </div>

        </header>
    );
}