import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';

const FloatingHelp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 'greet', role: 'assistant', text: '👋 Hello! How can I help you today?' }
  ]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);
  const { language } = useAppState();
  const t = useTranslation(language);

  const apiBase = process.env.REACT_APP_API_BASE || 'http://98.84.139.47:8002';

  // Simple conversation state: 0-select subject, 1-select topic, 2-Q&A
  const [stage, setStage] = useState(0);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  // Dropdown options
  const SUBJECTS = ['Math', 'Science', 'English', 'History', 'Computer Science'];
  const TOPICS_BY_SUBJECT = {
    Math: ['Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics', 'Arithmetic'],
    Science: ['Physics', 'Chemistry', 'Biology', 'Photosynthesis', 'Ecology'],
    English: ['Grammar', 'Comprehension', 'Writing', 'Vocabulary'],
    History: ['Ancient', 'Medieval', 'Modern', 'World Wars'],
    'Computer Science': ['Programming Basics', 'Data Structures', 'Algorithms', 'Databases']
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const q = message.trim();
    if (!q || isSending) return;
    // Stage collection
    if (stage === 0) {
      setSubject(q);
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: q }]);
      setMessages((prev) => [...prev, { id: `a-${Date.now()+1}`, role: 'assistant', text: 'Great! Which topic within this subject?' }]);
      setStage(1);
      setMessage('');
      return;
    }
    if (stage === 1) {
      setTopic(q);
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: q }]);
      setMessages((prev) => [...prev, { id: `a-${Date.now()+1}`, role: 'assistant', text: 'Awesome! Ask your question about this topic.' }]);
      setStage(2);
      setMessage('');
      return;
    }

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setIsSending(true);
    try {
      const resp = await fetch(`${apiBase}/support/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subject || undefined, topic: topic || undefined })
      });
      const data = await resp.json();
      if (!resp.ok) {
        const detail = data?.detail || 'Server error';
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      const a = data?.answer || 'Sorry, I could not answer right now.';
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: a }]);
    } catch (e) {
      const msg = e?.message?.toString?.() || 'Network error. Please try again.';
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: msg }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmSubject = () => {
    if (!subject) return;
    const ts = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${ts}`, role: 'user', text: subject },
      { id: `a-${ts+1}`, role: 'assistant', text: 'Great! Which topic within this subject?' }
    ]);
    setStage(1);
  };

  const handleConfirmTopic = () => {
    if (!topic) return;
    const ts = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${ts}`, role: 'user', text: topic },
      { id: `a-${ts+1}`, role: 'assistant', text: 'Awesome! Ask your question about this topic.' }
    ]);
    setStage(2);
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-glow flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-4">
              <h3 className="font-display font-semibold text-lg">
                {t('help')} & Support
              </h3>
              <p className="text-sm opacity-90">Ask us anything!</p>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`${m.role === 'user' ? 'bg-primary-50 border border-primary-100 ml-10' : 'bg-white'} rounded-lg p-3 shadow-sm`}>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
              {isSending && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-gray-500">{t('loading')}...</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {stage < 2 ? (
                <div className="space-y-3">
                  {stage === 0 && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                      >
                        <option value="">Select subject...</option>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirmSubject}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm"
                      >
                        Continue
                      </motion.button>
                    </div>
                  )}
                  {stage === 1 && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                      >
                        <option value="">Select topic...</option>
                        {(TOPICS_BY_SUBJECT[subject] || []).map((tpc) => (
                          <option key={tpc} value={tpc}>{tpc}</option>
                        ))}
                      </select>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirmTopic}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm"
                      >
                        Start Chat
                      </motion.button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('askAnything')}
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={isSending}
                    className={`p-2 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white ${isSending ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingHelp;
