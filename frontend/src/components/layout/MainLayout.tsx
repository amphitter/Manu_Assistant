import Header from "./Header";
import ChatWindow from "../chat/ChatWindow";
import ChatInput from "../chat/ChatInput";

export default function MainLayout() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
      <Header />
      <ChatWindow />
      <ChatInput />
    </div>
  );
}