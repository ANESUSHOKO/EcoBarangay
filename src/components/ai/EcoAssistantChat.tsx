import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Trash2,
  HelpCircle,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCw,
  Leaf,
  ShieldAlert,
  Calendar,
  Award,
} from 'lucide-react';
import { User, Barangay, Language, AIChatMessage } from '../../types';
import { api } from '../../lib/api';

interface EcoAssistantChatProps {
  currentUser: User | null;
  currentBarangay: Barangay | null;
  lang?: Language;
  onNavigateToTab?: (tab: string) => void;
}

const DEFAULT_WELCOME_EN = `Mabuhay! 👋 I am **EcoBot**, your 24/7 AI Environmental and Barangay Assistant. 

I can assist you with:
• **Reporting environmental hazards** and verifying waste issues
• **4-Stream Waste Segregation** under Republic Act 9003
• **Earning & redeeming Eco Points** for community rewards
• **Garbage collection schedules** and MRF locations
• **Navigating the EcoBarangay website** and account settings

How can I help you keep our community clean and green today?`;

const DEFAULT_WELCOME_TL = `Mabuhay! 👋 Ako si **EcoBot**, ang iyong 24/7 AI Environmental and Barangay Assistant.

Matutulungan kita sa:
• **Paggawa ng report** para sa tambak ng basura o baradong kanal
• **Tamang paghihiwalay ng basura (Segregation)** alinsunod sa RA 9003
• **Pag-ipon at pag-redeem ng Eco Points** para sa mga premyo
• **Iskedyul ng hakot ng basura** sa iyong barangay
• **Paggamit ng mga tampok sa EcoBarangay website**

Ano ang maitutulong ko sa iyo ngayon?`;

const QUICK_PROMPTS_EN = [
  { label: '🗑️ Waste Segregation Rules', prompt: 'What are the 4 waste segregation categories under RA 9003 and what goes into each?' },
  { label: '📢 How to Report Waste', prompt: 'How do I submit an environmental report for illegal dumping or clogged drainage?' },
  { label: '⭐ Earn Eco Points', prompt: 'How do I earn and redeem Eco Points on EcoBarangay?' },
  { label: '🚛 Collection Schedule', prompt: 'When is the garbage collection schedule in our barangay?' },
  { label: '❓ Website Help', prompt: 'Can you give me an overview of all the features available on this website?' },
];

const QUICK_PROMPTS_TL = [
  { label: '🗑️ Alituntunin sa Segregation', prompt: 'Ano ang 4 na kategorya ng tamang paghihiwalay ng basura ayon sa RA 9003?' },
  { label: '📢 Paano Mag-report', prompt: 'Paano ako magpapadala ng report para sa ilegal na tambak ng basura o baradong kanal?' },
  { label: '⭐ Pag-ipon ng Eco Points', prompt: 'Paano ako makakaipon at makakapalit ng Eco Points sa website na ito?' },
  { label: '🚛 Iskedyul ng Basura', prompt: 'Kailan ang iskedyul ng hakot ng basura sa aming barangay?' },
  { label: '❓ Gabay sa Website', prompt: 'Maaari mo bang ipaliwanag kung paano gamitin ang mga tampok ng EcoBarangay?' },
];

export const EcoAssistantChat: React.FC<EcoAssistantChatProps> = ({
  currentUser,
  currentBarangay,
  lang = 'en',
  onNavigateToTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize greeting on first load or language change
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          role: 'model',
          content: lang === 'tl' ? DEFAULT_WELCOME_TL : DEFAULT_WELCOME_EN,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [lang]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setLoading(true);

    try {
      // Build API messages payload
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const context = {
        userName: currentUser?.fullName,
        userRole: currentUser?.role,
        barangayName: currentBarangay?.name || currentUser?.barangayName,
        ecoPoints: currentUser?.ecoPoints,
        lang,
      };

      const response = await api.chatWithAssistant(apiMessages, context);

      const botReply: AIChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorReply: AIChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content:
          lang === 'tl'
            ? 'Paumanhin, nagkaroon ng pansamantalang aberya sa koneksyon. Maaari mo bang subukan muli?'
            : 'Sorry, I encountered a temporary connection issue. Please feel free to try asking again!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content: lang === 'tl' ? DEFAULT_WELCOME_TL : DEFAULT_WELCOME_EN,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = lang === 'tl' ? QUICK_PROMPTS_TL : QUICK_PROMPTS_EN;

  // Simple Markdown text formatter for responses (handles bold, bullet points, headers)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs sm:text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points
          if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
            const content = line.replace(/^[•\-\*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{renderInlineBold(content)}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+[\.\)])\s*(.*)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{numMatch[1]}</span>
                <span>{renderInlineBold(numMatch[2])}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineBold(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineBold = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Action Button (Launcher) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-full shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-emerald-500/20"
            aria-label="Open AI Assistant"
            id="ecobot-launcher-btn"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></span>
            </div>
            <div className="text-left pr-1">
              <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
                <span>EcoBot AI</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950/40 rounded-full text-emerald-200 border border-emerald-400/30">
                  Assistant
                </span>
              </div>
              <div className="text-[10px] text-emerald-100 font-medium hidden sm:block">
                {lang === 'tl' ? 'Magtanong tungkol sa basura at website' : 'Ask anything about waste & website'}
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Interactive Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${
            isExpanded
              ? 'inset-4 sm:inset-10 rounded-3xl'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl'
          }`}
          id="ecobot-chat-window"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-800 via-slate-900 to-teal-900 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-inner">
                  <Bot className="w-6 h-6 text-slate-950" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm tracking-tight text-white">EcoBot AI Assistant</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
                    Gemini 3.7
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 font-medium">
                  {currentBarangay ? `Brgy. ${currentBarangay.name} • 24/7 Online` : 'Community Eco Guide • 24/7'}
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearHistory}
                title={lang === 'tl' ? 'Linisin ang usapan' : 'Clear chat history'}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Minimize size' : 'Expand window'}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-red-500/80 rounded-xl transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          {onNavigateToTab && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-slate-600 dark:text-slate-300 scrollbar-none shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold px-1">
                Go to:
              </span>
              <button
                onClick={() => onNavigateToTab('reports')}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 transition-colors flex items-center gap-1"
              >
                <ShieldAlert className="w-3 h-3 text-red-500" />
                Report Hazard
              </button>
              <button
                onClick={() => onNavigateToTab('schedule')}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 transition-colors flex items-center gap-1"
              >
                <Calendar className="w-3 h-3 text-blue-500" />
                Truck Schedule
              </button>
              <button
                onClick={() => onNavigateToTab('rankings')}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 transition-colors flex items-center gap-1"
              >
                <Award className="w-3 h-3 text-amber-500" />
                Eco Leaderboard
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUser
                        ? 'bg-slate-800 text-white'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[82%] sm:max-w-[78%] space-y-1`}>
                    <div
                      className={`p-3.5 rounded-2xl ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-xs shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        renderFormattedText(msg.content)
                      )}
                    </div>
                    {msg.timestamp && (
                      <div
                        className={`text-[10px] text-slate-400 dark:text-slate-500 px-1 ${
                          isUser ? 'text-right' : 'text-left'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium pl-1">
                    {lang === 'tl' ? 'Nag-iisip si EcoBot...' : 'EcoBot is thinking...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="px-3 py-2 bg-white dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>{lang === 'tl' ? 'Mga Mungkahing Tanong:' : 'Suggested Questions:'}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={loading}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 rounded-full shrink-0 border border-slate-200/80 dark:border-slate-600 transition-colors disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                lang === 'tl'
                  ? 'Magtanong kay EcoBot tungkol sa basura, RA 9003, o website...'
                  : 'Ask EcoBot about waste rules, RA 9003, points, or website...'
              }
              className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
