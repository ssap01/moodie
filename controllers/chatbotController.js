/**
 * 챗봇 API 컨트롤러
 */

const { generateChatbotReply } = require('../services/chatbotService');
const { extractMoodKeywords, getMoodBasedMovies, generateMoodReason } = require('../services/moodRecommendationService');

/**
 * POST /chatbot
 * 챗봇 메시지 처리 (로그인 선택적)
 */
function handleChatbotMessage(req, res) {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Please enter a message.' });
        }
        const trimmed = message.trim();
        if (trimmed.length > 500) {
            return res.status(400).json({ error: 'Message must be 500 characters or less.' });
        }

        // 로그인한 경우 userId 사용, 아니면 null
        const userId = req.user?.user_id || null;

        // 감정 키워드 감지 및 추천 요청 확인
        const moodKeywords = extractMoodKeywords(trimmed);
        const isRecommendationRequest = /추천|recommend|뭐\s*볼|볼\s*영화|보고\s*싶|영화|movie/i.test(trimmed);
        
        // 감정 기반 추천이 필요한 경우 (감정 키워드가 있고 추천 요청인 경우)
        if (moodKeywords.length > 0 && isRecommendationRequest) {
            const movies = getMoodBasedMovies(trimmed, 3, userId); // 챗봇에서는 3개만 표시
            const reason = generateMoodReason(trimmed, movies.length);
            
            if (movies.length > 0) {
                const reply = `${reason}`;
                return res.json({ reply, movies, isMoodRecommendation: true });
            } else {
                // 영화를 찾지 못한 경우
                const reply = `${reason} 하지만 현재 데이터베이스에서 해당 장르의 영화를 찾지 못했어요. 다른 키워드로 시도해보시거나 인기 영화를 확인해보세요.`;
                return res.json({ reply });
            }
        }

        const reply = generateChatbotReply(trimmed, userId);
        res.json({ reply });
    } catch (err) {
        console.error('handleChatbotMessage error:', err);
        res.status(500).json({ error: 'An error occurred while generating the reply. Please try again.' });
    }
}

module.exports = {
    handleChatbotMessage,
};
