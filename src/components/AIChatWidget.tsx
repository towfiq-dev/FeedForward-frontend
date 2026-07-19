"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuSparkles,
  LuSend,
  LuSettings,
  LuX,
  LuBot,
  LuTrash2,
  LuCheck,
  LuLock,
  LuRefreshCw,
} from "react-icons/lu";
import { authClient } from "@/lib/auth-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const PRESETS = [
  { label: "🔍 Available Food", query: "What foods are currently available?" },
  { label: "🍲 How to Donate", query: "How do I list or share my surplus food on ShareBite?" },
  { label: "🛡️ Food Safety Rules", query: "What are the rules and safety guidelines for food sharing?" },
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [hasKeyConfigured, setHasKeyConfigured] = useState(true);
  const [isKeySavedLocally, setIsKeySavedLocally] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: session } = authClient.useSession();

  // Load configuration and initialize greetings
  useEffect(() => {
    // 1. Fetch user profile name
    if (session?.user) {
      setUserName(session.user.name);
    } else {
      setUserName(null);
    }

    // 2. Fetch custom API key from local storage if any
    const savedKey = localStorage.getItem("sharebite_gemini_key");
    if (savedKey) {
      setCustomApiKey(savedKey);
      setIsKeySavedLocally(true);
    }

    // 3. Initialize messages if empty
    if (messages.length === 0) {
      const name = session?.user?.name || "there";
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi **${name}**! Welcome to **ShareBite**. 🌟\n\nI am your AI assistant. I can help you search for available surplus food, guide you on how to list/request meals, and share important food safety guidelines.\n\nHow can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [session, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !showSettings) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, showSettings]);

  const handleSaveKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem("sharebite_gemini_key", customApiKey.trim());
      setIsKeySavedLocally(true);
      setHasKeyConfigured(true);
      setShowSettings(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("sharebite_gemini_key");
    setCustomApiKey("");
    setIsKeySavedLocally(false);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add the new user message to the history payload
      chatHistory.push({
        role: "user",
        content: textToSend,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add custom API key from local storage if saved
      if (customApiKey) {
        headers["x-gemini-key"] = customApiKey;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: chatHistory }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "API_KEY_MISSING") {
          setHasKeyConfigured(false);
          setShowSettings(true);
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(7),
              role: "assistant",
              content: "⚠️ **Gemini API Key missing!** Please click the settings icon above and enter your Gemini API Key to start chatting.",
              timestamp: new Date(),
            },
          ]);
        } else {
          throw new Error(data.message || "Something went wrong.");
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: data.reply,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("AI Assistant API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message || "Connection failed."} Please check if your backend server is running and try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage(inputValue);
    }
  };

  // Helper to parse simple markdown bold, inline code, and links to React elements
  const renderInline = (text: string) => {
    // Matches markdown links: [label](href) or bold: **text** or code: `code`
    const regex = /(\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [_, label, href] = match;
          const isExternal = href.startsWith("http");
          
          if (isExternal) {
            return (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 font-semibold hover:underline underline-offset-2 inline-flex items-center gap-0.5"
              >
                {label}
              </a>
            );
          } else {
            return (
              <Link
                key={index}
                href={href}
                className="text-green-600 dark:text-green-400 font-semibold hover:underline underline-offset-2 inline-flex items-center gap-0.5"
                onClick={() => setIsOpen(false)} // Close widget when redirecting
              >
                {label}
              </Link>
            );
          }
        }
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="bg-slate-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-600 dark:text-emerald-400">
            {part.slice(1, -1)}
          </code>
        );
      }

      return part;
    });
  };

  const MarkdownText = ({ text }: { text: string }) => {
    const lines = text.split("\n");

    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((line, i) => {
          // Check for headers (e.g. ### Header)
          const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const title = headerMatch[2];
            const sizeClass = level === 1 
              ? "text-lg font-bold" 
              : level === 2 
                ? "text-md font-bold" 
                : "text-sm font-semibold";
            return (
              <div key={i} className={`${sizeClass} text-green-700 dark:text-green-400 mt-2 mb-1`}>
                {renderInline(title)}
              </div>
            );
          }

          // Check for bullet lists (e.g. - list item)
          const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
          const lineContent = isBullet ? line.trim().substring(2) : line;

          if (isBullet) {
            return (
              <div key={i} className="flex gap-1.5 pl-2 my-0.5">
                <span className="text-green-500 font-bold select-none">•</span>
                <span className="text-slate-700 dark:text-neutral-300">
                  {renderInline(lineContent)}
                </span>
              </div>
            );
          }

          // Check for numbered lists (e.g. 1. list item)
          const isNumbered = /^\d+\.\s+/.test(line.trim());
          if (isNumbered) {
            const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              const [_, num, content] = numMatch;
              return (
                <div key={i} className="flex gap-1.5 pl-2 my-0.5">
                  <span className="text-green-500 font-bold select-none">{num}.</span>
                  <span className="text-slate-700 dark:text-neutral-300">
                    {renderInline(content)}
                  </span>
                </div>
              );
            }
          }

          if (line.trim() === "") {
            return <div key={i} className="h-1.5" />;
          }

          return (
            <p key={i} className="text-slate-700 dark:text-neutral-300">
              {renderInline(line)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-green-600 to-emerald-500 text-white rounded-full shadow-lg cursor-pointer focus:outline-none ring-4 ring-green-500/20"
        >
          {isOpen ? (
            <LuX className="text-2xl" />
          ) : (
            <LuSparkles className="text-2xl animate-pulse" />
          )}

          {/* Alert badge if key configuration issue */}
          {!hasKeyConfigured && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[10px] text-white font-bold font-mono">!</span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Chat Window Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)] z-50 flex flex-col rounded-3xl border border-slate-200/60 dark:border-neutral-800/60 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-green-700 to-emerald-600 text-white flex items-center justify-between shadow-md relative shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-full border border-white/10">
                    <LuBot className="text-xl" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-green-700 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-none flex items-center gap-1.5">
                    ShareBite AI Assistant
                  </h3>
                  <p className="text-[11px] text-green-200 mt-1 flex items-center gap-1">
                    Ready to help you share & find food
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors ${
                    showSettings ? "bg-white/20" : ""
                  }`}
                  title="Configure Gemini API Key"
                >
                  <LuSettings className="text-lg" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <LuX className="text-lg" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-slate-50/50 dark:bg-neutral-900/10">
              {/* Settings Screen */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 bg-white dark:bg-neutral-950 z-20 flex flex-col p-6 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-neutral-100 flex items-center gap-1.5">
                        <LuSettings className="text-green-600" />
                        Settings
                      </h4>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500"
                      >
                        <LuX className="text-lg" />
                      </button>
                    </div>

                    <div className="space-y-4 text-xs text-slate-600 dark:text-neutral-400">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5">
                        <LuLock className="text-emerald-600 dark:text-emerald-400 text-base shrink-0 mt-0.5" />
                        <p className="leading-normal">
                          This assistant runs on the Gemini API. It first checks for a `GEMINI_API_KEY` defined in the server's `.env` file.
                          If not set, you can paste a temporary API key below.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-slate-700 dark:text-neutral-300 flex justify-between">
                          <span>Gemini API Key</span>
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            Get key from AI Studio →
                          </a>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="AIzaSy..."
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-green-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={handleSaveKey}
                          disabled={!customApiKey.trim()}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LuCheck className="text-sm" /> Save Key
                        </button>
                        {isKeySavedLocally && (
                          <button
                            onClick={handleClearKey}
                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <LuTrash2 /> Clear
                          </button>
                        )}
                      </div>

                      {isKeySavedLocally && (
                        <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                          <LuCheck /> API key is saved locally in this browser.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-tr-sm"
                          : "bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 rounded-tl-sm"
                      }`}
                    >
                      <MarkdownText text={msg.content} />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex flex-col items-start max-w-[85%] mr-auto">
                    <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Preset Chips */}
              {messages.length === 1 && !isLoading && (
                <div className="px-4 py-2 flex flex-wrap gap-2 shrink-0 bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm border-t border-slate-100 dark:border-neutral-800/40">
                  {PRESETS.map((p, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(p.query)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-green-700 bg-white hover:bg-green-50 border border-slate-200 rounded-full transition-all duration-200 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-green-950/20 dark:hover:text-green-400 cursor-pointer shadow-sm"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="px-4 py-3 border-t border-slate-150 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type your message here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 bg-slate-100 dark:bg-neutral-900 border-0 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-slate-800 dark:text-neutral-100 disabled:opacity-50"
              />
              <motion.button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
              >
                <LuSend className="text-md" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
