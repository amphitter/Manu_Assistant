import ModelSelector from "@/components/chat/ModelSelector";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 backdrop-blur-sm">
      <span className="text-sm font-medium italic tracking-wide text-zinc-500">
        MANU
      </span>
      <ModelSelector />
    </header>
  );
}