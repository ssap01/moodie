import React, { useState, useEffect, useRef } from 'react';
import MovieCard from './MovieCard';
import { Movie } from '../types';
import { moodRecommendationsAPI } from '../services/api';

interface MoodRecommendWidgetProps {
  isLoggedIn: boolean;
  onSelectMovie: (movie: Movie) => void;
}

const QUICK_MOODS = [
  { label: '지금 우울해요', mood: '우울해' },
  { label: '기분 좋아요', mood: '기쁨' },
  { label: '친구들이랑 볼 영화', mood: '친구' },
  { label: '혼자 볼 영화', mood: '혼자' },
  { label: '밤에 볼 영화', mood: '밤' },
  { label: '스트레스 풀고 싶어요', mood: '스트레스' },
];

const MoodRecommendWidget: React.FC<MoodRecommendWidgetProps> = ({ isLoggedIn, onSelectMovie }) => {
  const [moodInput, setMoodInput] = useState('');
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 챗봇에서 스크롤 이벤트 감지
    const handleScrollToMoodRecommend = () => {
      widgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('scrollToMoodRecommend', handleScrollToMoodRecommend);
    return () => window.removeEventListener('scrollToMoodRecommend', handleScrollToMoodRecommend);
  }, []);

  const handleSearch = async (mood: string) => {
    if (!mood.trim() || isLoading) return;

    setIsLoading(true);
    setHasSearched(true);
    setMoodInput(mood);

    try {
      const response = await moodRecommendationsAPI.get(mood, 5);
      setRecommendedMovies(response.movies);
      setReason(response.reason);
    } catch (error: any) {
      console.error('Mood recommendation error:', error);
      setRecommendedMovies([]);
      setReason('An error occurred while loading recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section ref={widgetRef} className="py-16 md:py-24 px-6 sm:px-8 md:px-20 bg-black/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 md:mb-12 gap-4">
          <div>
            <h2 className="serif text-3xl md:text-4xl mb-2">감정 기반 영화 추천</h2>
            <p className="text-[9px] md:text-[10px] tracking-widest uppercase opacity-40">
              지금의 기분이나 상황에 맞는 영화를 찾아보세요
            </p>
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearch(moodInput)}
              placeholder="예: 지금 우울해요, 친구들이랑 볼 영화..."
              className="flex-1 bg-transparent border-b border-black/20 py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#2D2A26] placeholder:opacity-30"
            />
            <button
              type="button"
              onClick={() => handleSearch(moodInput)}
              disabled={isLoading || !moodInput.trim()}
              className="border border-black/20 px-8 py-3 uppercase text-[9px] md:text-[10px] tracking-[0.3em] hover:bg-black hover:text-[#D8D5CF] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? '검색 중...' : '추천 받기'}
            </button>
          </div>

          {/* 빠른 선택 버튼 */}
          <div className="flex flex-wrap gap-2">
            {QUICK_MOODS.map((quickMood) => (
              <button
                key={quickMood.mood}
                type="button"
                onClick={() => handleSearch(quickMood.mood)}
                disabled={isLoading}
                className="px-4 py-2 text-[9px] md:text-[10px] tracking-wider uppercase border border-black/10 hover:border-black/30 hover:bg-black/5 transition-all disabled:opacity-30"
              >
                {quickMood.label}
              </button>
            ))}
          </div>
        </div>

        {/* 추천 결과 */}
        {hasSearched && (
          <div>
            {isLoading ? (
              <div className="text-center py-12 opacity-60">추천 영화를 찾는 중...</div>
            ) : recommendedMovies.length > 0 ? (
              <>
                {reason && (
                  <p className="text-sm italic mb-6 opacity-70 serif">{reason}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                  {recommendedMovies.map((movie) => (
                    <MovieCard key={movie.movie_id} movie={movie} onClick={() => onSelectMovie(movie)} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 opacity-60">
                {reason || '추천할 영화를 찾지 못했어요. 다른 키워드로 시도해보세요.'}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default MoodRecommendWidget;
