import ChatUI from "../components/ChatUI";
import Navbar from "../components/site/Navbar";

export default function ChatPage() {
  return (
    <div className="font-sans min-h-screen grid grid-rows-[auto_1fr] bg-white dark:bg-black">
      <Navbar />
      <main className="px-4 pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <ChatUI />
        </div>
      </main>
    </div>
  );
}
