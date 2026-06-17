import { PageHeader } from "@/components/page-header"
import { ChatView } from "@/components/chat/chat-view"

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Chat"
        description="Manage your tasks, notes, time, and documents in natural language."
      />
      <div className="min-h-0 flex-1">
        <ChatView />
      </div>
    </div>
  )
}
