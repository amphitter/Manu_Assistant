import Header from "./Header";
import ChatWindow from "../chat/ChatWindow";
import ChatInput from "../chat/ChatInput";

export default function MainLayout() {
    return (
        <div className="flex flex-1 flex-col">

            <Header />

            <ChatWindow />

            <ChatInput />

        </div>
    );
}