"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, X, Send, Bot, Sparkles } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import ReactMarkdown from "react-markdown"

type Message = {
  id: string
  sender: "user" | "ai" | "system"
  text: string
}

export function AiChat() {
  const { t, lang } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [isThinking, setIsThinking] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with welcome message on mount
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: t.aiChat.welcome,
      },
    ])
  }, [lang])

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isThinking) return

    const userText = input.trim()
    setInput("")

    // Add user message to thread
    const userMsgId = Math.random().toString()
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: userText }])
    
    setIsThinking(true)

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText, lang }),
      })

      if (!response.ok) {
        throw new Error("API call failed")
      }

      const data = await response.json()
      
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: data.error ? "system" : "ai",
          text: data.answer || data.error || t.aiChat.error,
        },
      ])
    } catch (err) {
      console.error("AI Assistant network error:", err)
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "system",
          text: t.aiChat.error,
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-3 font-semibold text-primary backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-[0_0_20px_oklch(0.78_0.18_165/0.25)] cursor-pointer"
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
        </span>
        <MessageSquare className="h-5 w-5" />
        <span className="hidden sm:inline text-xs tracking-wider uppercase">Eclyps AI</span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-card fixed bottom-24 right-6 z-50 flex h-[500px] w-[calc(100vw-2rem)] sm:w-[380px] flex-col overflow-hidden rounded-2xl shadow-[var(--glow)] border border-primary/25"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-primary/10 bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 animate-pulse-glow">
                  <Bot className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {t.aiChat.title}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] text-muted-foreground uppercase">{t.aiChat.online}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.05] hover:text-white transition cursor-pointer"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bracket-scroll bg-black/10">
              {messages.map((msg) => {
                const isAi = msg.sender === "ai"
                const isSystem = msg.sender === "system"

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAi || isSystem ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isSystem
                          ? "border border-red-500/20 bg-red-500/10 text-red-300"
                          : isAi
                          ? "border border-white/5 bg-white/[0.03] text-foreground"
                          : "border border-primary/20 bg-primary/10 text-foreground"
                      }`}
                    >
                      {isAi && (
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-primary uppercase">
                          <Sparkles className="h-3 w-3 animate-float" />
                          <span>AI</span>
                        </div>
                      )}
                      {isAi || isSystem ? (
  <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-strong:text-foreground prose-ol:my-1 prose-ul:my-1 prose-li:my-0">
    <ReactMarkdown>{msg.text}</ReactMarkdown>
  </div>
) : (
  <p className="whitespace-pre-line">{msg.text}</p>
)}
                    </div>
                  </div>
                )
              })}

              {/* Thinking / Loader state */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 max-w-[85%] border border-white/5 bg-white/[0.03] rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span>{t.aiChat.thinking}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-primary/10 bg-black/40 p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.aiChat.placeholder}
                disabled={isThinking}
                className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition focus:border-primary/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-background transition hover:bg-emerald-300 hover:shadow-[0_0_10px_oklch(0.78_0.18_165/0.4)] disabled:bg-white/[0.05] disabled:text-white/20 disabled:shadow-none cursor-pointer"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
