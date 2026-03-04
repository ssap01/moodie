import React, { useState, useRef, useEffect } from 'react';
import { chatbotAPI } from '../services/api';
import { Movie } from '../types';

interface Message {
  text: string;
  isBot: boolean;
  movies?: Movie[];
  isMoodRecommendation?: boolean;
}

interface ChatBotProps {
  isLoggedIn?: boolean;
  onSelectMovie?: (movie: Movie) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ isLoggedIn = false, onSelectMovie }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: 'Welcome to Moodie. 영화 추천, 로그인, 별점 등 궁금한 걸 물어보세요.', isBot: true },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { text: userMsg, isBot: false }]);
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage(userMsg);
      setMessages((prev) => [
        ...prev,
        {
          text: response.reply,
          isBot: true,
          movies: response.movies,
          isMoodRecommendation: response.isMoodRecommendation,
        },
      ]);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      setMessages((prev) => [
        ...prev,
        { text: 'Sorry, an error occurred while generating a reply. Please try again.', isBot: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[90]">
      {isOpen ? (
        <div className="w-[calc(100vw-3rem)] sm:w-80 md:w-96 bg-[#D8D5CF] border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col animate-slideUp overflow-hidden max-h-[75vh]">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/marble.png')]" aria-hidden />

          <div className="relative p-5 border-b border-black/5 flex justify-between items-center bg-white/20 backdrop-blur-sm">
            <div>
              <h3 className="serif text-xs uppercase tracking-widest font-bold">Curator Assistant</h3>
              <p className="text-[8px] uppercase tracking-[0.2em] opacity-40">
                {isLoggedIn ? 'Personalized guidance' : 'Rule-based guidance'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="opacity-40 hover:opacity-100 transition-opacity p-1"
              aria-label="채팅 닫기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="relative flex-1 h-80 md:h-[450px] overflow-y-auto p-6 space-y-8 scroll-smooth"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.isBot ? 'items-start' : 'items-end'}`}>
                <div
                  className={`max-w-[90%] md:max-w-[85%] p-5 text-[11px] md:text-xs leading-relaxed shadow-sm ${
                    m.isBot
                      ? 'bg-white/40 italic serif border-l border-black/5'
                      : 'bg-black text-[#D8D5CF] tracking-wider font-light'
                  }`}
                >
                  {m.text}
                </div>
                {m.isMoodRecommendation && m.movies && m.movies.length > 0 && (
                  <div className="mt-3 max-w-[90%] md:max-w-[85%] space-y-2">
                    <p className="text-[9px] uppercase tracking-wider opacity-50 mb-2">추천 영화</p>
                    {m.movies.map((movie) => (
                      <div
                        key={movie.movie_id}
                        className="bg-white/40 p-3 text-[10px] border border-black/20 hover:bg-white/60 hover:border-black/30 transition-all cursor-pointer group"
                        onClick={() => {
                          if (onSelectMovie) {
                            onSelectMovie(movie);
                            setIsOpen(false);
                          }
                        }}
                      >
                        <div className="font-medium serif text-xs group-hover:opacity-80 transition-opacity">
                          {movie.title}
                        </div>
                        {movie.imdb_rating && (
                          <div className="opacity-60 mt-1.5 text-[9px]">⭐ IMDb {movie.imdb_rating.toFixed(1)}</div>
                        )}
                      </div>
                    ))}
                    <p className="text-[8px] italic opacity-40 mt-2">영화를 클릭하면 상세 정보를 볼 수 있어요</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="relative p-5 border-t border-black/5 flex gap-3 bg-white/10 backdrop-blur-sm">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder={isLoading ? '답변 생성 중...' : '영화 추천, 내 취향, 별점 등...'}
              disabled={isLoading}
              className="flex-1 bg-transparent border-b border-black/10 py-2 text-[11px] md:text-xs focus:outline-none focus:border-black/20 placeholder:opacity-30 placeholder:italic disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="p-2 opacity-40 hover:opacity-100 transition-all hover:translate-x-1 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex flex-col items-center justify-center"
          aria-label="채팅 열기"
        >
          <span className="absolute right-full mr-6 text-[9px] tracking-[0.4em] uppercase opacity-0 group-hover:opacity-40 transition-all duration-500 whitespace-nowrap pointer-events-none translate-x-4 group-hover:translate-x-0">
            Cinema Curator
          </span>
          <div className="relative w-14 h-14 md:w-16 md:h-16 bg-black text-[#D8D5CF] rounded-full grid place-items-center shadow-2xl hover:scale-105 transition-all duration-500 active:scale-95 border border-white/5">
            <span className="serif text-xl italic font-light leading-none block">M</span>
            <div className="absolute inset-0 rounded-full border border-black animate-ping opacity-10 pointer-events-none" aria-hidden />
          </div>
        </button>
      )}
    </div>
  );
};

export default ChatBot;
