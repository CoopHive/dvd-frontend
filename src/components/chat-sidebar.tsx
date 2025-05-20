"use client";

import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "~/lib/utils";

type ChatItem = {
  id: string;
  title: string;
  date: string;
};

const recentChats: ChatItem[] = [
  { id: "1", title: "Project Discussion", date: "Today" },
  { id: "2", title: "Travel Planning", date: "Yesterday" },
  { id: "3", title: "Technical Support", date: "3 days ago" },
  { id: "4", title: "Recipe Ideas", date: "1 week ago" },
];

interface ChatSidebarProps {
  className?: string;
  isMobile?: boolean;
}

export function ChatSidebar({ className, isMobile }: ChatSidebarProps) {
  const sidebarContent = (
    <div className="h-full py-6 px-2 flex flex-col">
      <h2 className="px-4 mb-6 text-lg font-semibold tracking-tight">Chats</h2>
      <Button 
        variant="outline" 
        className="justify-start mb-6"
      >
        <span className="mr-2">+</span> New Chat
      </Button>
      <div className="space-y-1">
        {recentChats.map((chat) => (
          <Button 
            key={chat.id}
            variant="ghost" 
            className="w-full justify-start font-normal"
          >
            <div className="flex-1 truncate text-left">
              {chat.title}
              <div className="text-xs text-muted-foreground">{chat.date}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );

  // For mobile, render in a sheet
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[250px] sm:w-[300px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // For desktop, render directly
  return (
    <aside className={cn("hidden md:flex md:w-[250px] lg:w-[300px] border-r flex-col", className)}>
      {sidebarContent}
    </aside>
  );
} 