import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"
import EnhancedChatbot from "@/components/EnhancedChatbot"

export default async function ChatPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-4xl mx-auto">
        <EnhancedChatbot />
      </div>
    </LayoutWithSidebar>
  )
}
