import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Flashcard from '../components/Flashcard';
import ProgressBar from '../components/ProgressBar';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';
import { mockFlashcards, mockStudyPlan } from '../utils/mockData';

const AITutor = () => {
  const { language } = useAppState();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState(mockFlashcards[language]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [noteContent, setNoteContent] = useState('');
  // Study Plans: Exam Study Guide state
  const [studyMode, setStudyMode] = useState(null); // 'exam' | null
  const [examStep, setExamStep] = useState(1);
  const [planName, setPlanName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [topics, setTopics] = useState(['', '']);
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [studyIntensity, setStudyIntensity] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [useGoogleCalendar, setUseGoogleCalendar] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const tabs = [
    { id: 'flashcards', label: t('flashcards'), icon: BookOpen },
    { id: 'notes', label: t('noteEditor'), icon: FileText },
    { id: 'plan', label: t('studyPlan'), icon: Calendar },
  ];

  const flashcards = cards;
  const studyPlan = mockStudyPlan[language];

  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center space-x-2 mb-4">
            <Sparkles className="text-accent-500" size={32} />
            <h1 className="text-4xl font-display font-bold text-gradient">
              {t('aiTutor')}
            </h1>
          </div>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Your personalized AI learning companion'
              : 'आपका व्यक्तिगत AI शिक्षण साथी'}
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-soft'
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
              >
                <option value="">Select subject...</option>
                {['Math','Science','English','History','Computer Science'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
              >
                <option value="">Select topic...</option>
                {(subject === 'Math' ? ['Algebra','Geometry','Trigonometry','Calculus','Statistics','Arithmetic'] :
                  subject === 'Science' ? ['Physics','Chemistry','Biology','Photosynthesis','Ecology'] :
                  subject === 'English' ? ['Grammar','Comprehension','Writing','Vocabulary'] :
                  subject === 'History' ? ['Ancient','Medieval','Modern','World Wars'] :
                  subject === 'Computer Science' ? ['Programming Basics','Data Structures','Algorithms','Databases'] : []
                ).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!subject || !topic || isGenerating}
                onClick={async () => {
                  if (!subject || !topic) return;
                  setIsGenerating(true);
                  setErrorText('');
                  try {
                    const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:8002';
                    const resp = await fetch(`${apiBase}/tutor/flashcards`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        // public endpoint; no auth required
                      },
                      body: JSON.stringify({ subject, topic, num_cards: 6 })
                    });
                    const data = await resp.json();
                    if (!resp.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Server error');
                    const newCards = Array.isArray(data?.flashcards) && data.flashcards.length
                      ? data.flashcards
                      : mockFlashcards[language];
                    setCards(newCards);
                    setCurrentCardIndex(0);
                  } catch (err) {
                    const msg = err?.message?.toString?.() || 'Failed to generate flashcards.';
                    setErrorText(msg);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                className={`btn-primary ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isGenerating ? (language === 'en' ? 'Generating...' : 'बना रहा है...') : t('generateFlashcards')}
              </motion.button>
            </div>

            {errorText && (
              <div className="text-center text-sm text-red-600">{errorText}</div>
            )}

            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                {language === 'en' ? 'Card' : 'कार्ड'} {currentCardIndex + 1} / {flashcards.length}
              </p>
            </div>

            <Flashcard
              front={flashcards[currentCardIndex].front}
              back={flashcards[currentCardIndex].back}
            />

            <div className="flex items-center justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrevCard}
                disabled={currentCardIndex === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  currentCardIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-soft'
                }`}
              >
                <ChevronLeft size={20} />
                <span>{t('previousCard')}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNextCard}
                disabled={currentCardIndex === flashcards.length - 1}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  currentCardIndex === flashcards.length - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                <span>{t('nextCard')}</span>
                <ChevronRight size={20} />
              </motion.button>
            </div>

            
          </motion.div>
        )}

        {/* Adaptive Quiz Tab removed */}

        {/* Note Editor Tab */}
        {activeTab === 'notes' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
              {t('noteEditor')}
            </h2>

            {/* Notion-style Editor UI */}
            <div className="mb-4 flex space-x-2 p-2 bg-gray-50 rounded-lg">
              <button className="px-3 py-1 rounded hover:bg-white transition-colors font-semibold">
                B
              </button>
              <button className="px-3 py-1 rounded hover:bg-white transition-colors italic">
                I
              </button>
              <button className="px-3 py-1 rounded hover:bg-white transition-colors underline">
                U
              </button>
              <div className="w-px bg-gray-300 mx-2"></div>
              <button className="px-3 py-1 rounded hover:bg-white transition-colors">
                H1
              </button>
              <button className="px-3 py-1 rounded hover:bg-white transition-colors">
                H2
              </button>
              <div className="w-px bg-gray-300 mx-2"></div>
              <button className="px-3 py-1 rounded hover:bg-white transition-colors">
                • List
              </button>
            </div>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Start typing your notes here...'
                  : 'यहाँ अपने नोट्स टाइप करना शुरू करें...'
              }
              className="w-full h-96 p-4 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none font-sans"
            />

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {language === 'en' ? 'Auto-saved' : 'स्वतः सहेजा गया'} • {noteContent.length} {language === 'en' ? 'characters' : 'वर्ण'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
              >
                {t('save')}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Study Plan Tab */}
        {activeTab === 'plan' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {!studyMode && (
              <>
                <div className="text-center">
                  <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Study Plans</h2>
                  <p className="text-gray-600">Pick your study mode and dive in</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { setStudyMode('exam'); setExamStep(1); setGeneratedPlan(null); }}
                    className="card h-full text-left"
                  >
                    <div className="text-4xl mb-3">📘</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Exam Study Guide</h3>
                    <p className="text-sm text-gray-600">Stay on top of your exams with a structured study plan</p>
                  </motion.button>

                  <motion.div whileHover={{ scale: 1.02 }} className="card h-full">
                    <div className="text-4xl mb-3">💡</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Deep Dive</h3>
                    <p className="text-sm text-gray-600">Learn a subject in-depth or extract key insights from a document</p>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="card h-full">
                    <div className="text-4xl mb-3">📅</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Class Workspace</h3>
                    <p className="text-sm text-gray-600">Organize your classes, notes, and deadlines in one place.</p>
                  </motion.div>
                </div>
              </>
            )}

            {studyMode === 'exam' && (
              <>
                {/* Back to modes */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStudyMode(null); setGeneratedPlan(null); }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← Back to Study Plans
                  </button>
                  <div className="text-sm text-gray-600">Step {examStep} of 3</div>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-center space-x-2">
                  {[1,2,3].map((s) => (
                    <div key={s} className={`w-8 h-1 rounded ${examStep >= s ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
                  ))}
                </div>

                {/* Step 1: Exam Details */}
                {examStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                  >
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-6">What does your exam cover?</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Study Plan Name</label>
                        <input className="input" placeholder="Eg. John’s Study Plan" value={planName} onChange={(e) => setPlanName(e.target.value)} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                        <select className="input" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                          <option value="">Select grade…</option>
                          {['Class 9','Class 10','Class 11','Class 12'].map(g => (<option key={g} value={g}>{g}</option>))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input className="input" placeholder="Eg. Physics" value={examSubject} onChange={(e) => setExamSubject(e.target.value)} />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                        <div className="space-y-2">
                          {topics.map((t, idx) => (
                            <input
                              key={idx}
                              className="input"
                              placeholder={`Topic ${idx + 1}`}
                              value={t}
                              onChange={(e) => {
                                const next = [...topics];
                                next[idx] = e.target.value;
                                setTopics(next);
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setTopics([...topics, ''])}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            + Add another Topic
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 text-right">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setExamStep(2)}
                        disabled={!planName || !gradeLevel || !examSubject || topics.filter(t => t.trim()).length === 0}
                        className={`btn-primary ${(!planName || !gradeLevel || !examSubject || topics.filter(t => t.trim()).length === 0) ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        Continue
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Exam Schedule */}
                {examStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                  >
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-6">When is your exam?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                        <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">Please specify start time for your exam</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">Please specify end time for your exam</p>
                      </div>
                    </div>
                    <div className="mt-6 text-right">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setExamStep(3)}
                        disabled={!examDate || !startTime || !endTime}
                        className={`btn-primary ${(!examDate || !startTime || !endTime) ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        Continue
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Study Preferences */}
                {examStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                  >
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-6">Exam Study Guide: What are your study preferences?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time of Study</label>
                        <select className="input" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                          <option value="">Select time…</option>
                          {['Morning','Afternoon','Evening','Night'].map(t => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Study Intensity</label>
                        <select className="input" value={studyIntensity} onChange={(e) => setStudyIntensity(e.target.value)}>
                          <option value="">Select intensity…</option>
                          <option>Light (once a week)</option>
                          <option>Moderate (3 times a week)</option>
                          <option>Intense (daily)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Study Session Duration</label>
                        <select className="input" value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)}>
                          <option value="">Select duration…</option>
                          <option>Quick Study (15–30 mins)</option>
                          <option>Standard (45–60 mins)</option>
                          <option>Deep Focus (90 mins)</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 mt-6 md:mt-0">
                        <input id="gc" type="checkbox" className="h-4 w-4" checked={useGoogleCalendar} onChange={(e) => setUseGoogleCalendar(e.target.checked)} />
                        <label htmlFor="gc" className="text-sm text-gray-700">Find time on my Google Calendar</label>
                      </div>
                    </div>

                    <div className="mt-6 text-right">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          // Generate summary
                          const topicList = topics.filter(t => t.trim());
                          let frequency = '2-3 times per week';
                          if (studyIntensity.startsWith('Light')) frequency = 'once per week';
                          if (studyIntensity.startsWith('Moderate')) frequency = '3 times per week';
                          if (studyIntensity.startsWith('Intense')) frequency = 'daily';
                          const summary = {
                            planName,
                            subject: examSubject,
                            topics: topicList,
                            examDate,
                            timeWindow: startTime && endTime ? `${startTime} - ${endTime}` : '',
                            schedule: `${frequency} • ${sessionDuration || '45–60 mins'} • ${preferredTime || 'Anytime'}`,
                            calendar: useGoogleCalendar,
                          };
                          setGeneratedPlan(summary);
                        }}
                        disabled={!preferredTime || !studyIntensity || !sessionDuration}
                        className={`btn-primary ${(!preferredTime || !studyIntensity || !sessionDuration) ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        Generate My Study Plan
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Summary */}
                {generatedPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                  >
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">Your Personalized Study Plan</h3>
                    <p className="text-gray-600 mb-6">Based on your inputs, here’s a suggested outline.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Study Plan Name</p>
                        <p className="font-semibold text-gray-900">{generatedPlan.planName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Subject and Topics</p>
                        <p className="font-semibold text-gray-900">{generatedPlan.subject || '—'}</p>
                        <p className="text-sm text-gray-700 mt-1">{(generatedPlan.topics || []).join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Exam Date and Duration</p>
                        <p className="font-semibold text-gray-900">{generatedPlan.examDate || '—'}{generatedPlan.timeWindow ? ` • ${generatedPlan.timeWindow}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Recommended Schedule</p>
                        <p className="font-semibold text-gray-900">{generatedPlan.schedule}</p>
                      </div>
                    </div>

                    {generatedPlan.calendar && (
                      <div className="mt-4 text-sm text-gray-600">We’ll try to find suitable time slots on your Google Calendar.</div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        className="btn-secondary"
                        onClick={() => { setStudyMode(null); setExamStep(1); setGeneratedPlan(null); }}
                      >
                        Start Over
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => { /* Placeholder for future backend save */ }}
                      >
                        Save Plan (Coming Soon)
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AITutor;
