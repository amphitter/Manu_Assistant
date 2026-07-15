"use client";

import { useState } from "react";

import Header from "./Header";

import ChatWindow from "../chat/ChatWindow";
import ChatInput from "../chat/ChatInput";

import TerminalDock from "../terminal/TerminalDock";

export default function MainLayout() {
  const [terminalOpen] =
    useState(true);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
      {/* Header */}

      <Header />

      {/* Workspace */}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Chat */}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatWindow />

          <ChatInput />
        </div>

        {/* Terminal */}

        {terminalOpen && (
          <TerminalDock />
        )}
      </div>
    </div>
  );
}