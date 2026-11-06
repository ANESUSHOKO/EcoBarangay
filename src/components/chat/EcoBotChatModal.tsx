import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Barangay, User, AIChatMessage } from '../../types';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  Trash2,
  MapPin,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  Loader2,
  Navigation,
  CheckCircle2
} from 'lucide-react';

interface GroundedPlace {
  title: string;
  uri: string;
  placeId?: string;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  groundedPlaces?: GroundedPlace[];
  timestamp: string;
}

interface EcoBotChatModalProps {
  currentBarangay: Barangay | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROMPTS = [
  'Where is the nearest MRF or recycling center?',
  'Find local junk shops nearby to sell plastic bottles',
  'How to segregate hazardous & electronic waste?',
  'What are the penalties under RA 9003 for illegal dumping?',
  'What is our barangay garbage collection schedule?',
];

export const EcoBotChatModal: React.FC<EcoBotChatModalProps> = ({
  currentBarangay,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatTurn[]>(() => {
    const saved = localStorage.getItem('ecobarangay_ecobot_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'welcome',
        role: 'model',
        content: `Mabuhay! 👋 Ako si **EcoBot**, ang iyong AI Assistant para sa EcoBarangay.
        
Maaari mo akong tanungin tungkol sa:
• **Paghahanap ng mga MRF, junk shops, at recycling facilities** sa tulong ng **Google Maps**
• **Tamang Solid Waste Management at RA 9003**
• **Koleksyon ng basura at schedule sa iyong barangay**
• **Pagkuha ng Eco Points at pag-file ng environmental reports**

Ano ang maitutulong ko sa iyo ngayon?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save conversation
  useEffect(() => {
    try {
      localStorage.setItem('ecobarangay_ecobot_messages', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Format history for server (at most 15 recent turns)
      const formattedHistory: AIChatMessage[] = newMessages
        .slice(-15)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.chatWithAssistant(formattedHistory, {
        barangayName: currentBarangay?.name || currentUser?.barangayName,
        barangayId: currentBarangay?.id || currentUser?.barangayId,
        userLat: currentBarangay?.lat,
        userLng: currentBarangay?.lng,
        lang: 'en',
      });

      const modelMessage: ChatTurn = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: res.reply || 'Here is the information you requested.',
        groundedPlaces: res.groundedPlaces,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      const errorMessage: ChatTurn = {
        id: `err-${Date.now()}`,
        role: 'model',
        content:
          'Paumanhin, nagkaroon ng pansamantalang aberya sa koneksyon sa Gemini AI. Maaari mo bang ulitin ang iyong katanungan?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    const resetWelcome: ChatTurn[] = [
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content: `Chat history cleared. Kumusta! Paano ako makatutulong sa iyo ngayon?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(resetWelcome);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[90vh] sm:h-[650px] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">EcoBot AI Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>
                  {currentBarangay ? `Brgy. ${currentBarangay.name}, ${currentBarangay.cityName}` : 'Philippine Eco Network'}
                </span>
                <span className="text-emerald-300/60">· Google Maps Grounded</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-all text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70 dark:bg-slate-950/40">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {msg.role === 'user' ? (
                  currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="Me" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[78%] space-y-2`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line font-sans space-y-1">
                    {msg.content}
                  </div>
                </div>

                {/* Verified Grounded Places Cards (Google Maps Grounding) */}
                {msg.groundedPlaces && msg.groundedPlaces.length > 0 && (
                  <div className="mt-2 space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Google Maps Verified Locations:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.groundedPlaces.map((place, idx) => (
                        <a
                          key={idx}
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 rounded-xl transition-all shadow-xs flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                              {place.title}
                            </h4>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                              <span>Open in Google Maps</span>
                            </p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] text-slate-400 px-1 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>EcoBot is thinking & checking Google Maps data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Ideas:</span>
          {DEFAULT_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 font-medium transition-all shrink-0 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about waste, RA 9003, or nearby MRF locations..."
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-emerald-600/20 disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
