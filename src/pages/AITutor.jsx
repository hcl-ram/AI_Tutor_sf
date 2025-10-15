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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState('');

  const tabs = [
    { id: 'flashcards', label: t('flashcards'), icon: BookOpen },
    { id: 'notes', label: t('noteEditor'), icon: FileText },
    { id: 'plan', label: 'Exam Study Guide', icon: Calendar },
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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [refinedNote, setRefinedNote] = useState("");

  // 🧩 Function to call FastAPI endpoint
  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    setRefinedNote("");

    try {
      const response = await fetch("http://localhost:8002/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "test_user_1",
          raw_text: noteContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);

      // ✅ show refined version returned by API
      if (data.item && data.item.refined_text) {
        setRefinedNote(data.item.refined_text);
      } else if (data.item && data.item.note) {
        // fallback if your DB key is named "note"
        setRefinedNote(data.item.note);
      }
    } catch (error) {
      console.error("Error saving note:", error);
      setMessage("Failed to save note.");
    } finally {
      setLoading(false);
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
              <div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? t("saving") : t("save")}
                </motion.button>

                {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
                {refinedNote && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-md">
                    <h3 className="font-semibold mb-2">Refined Note:</h3>
                    <p className="whitespace-pre-wrap">{refinedNote}</p>
                  </div>
                )}
              </div>
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
              <div className="text-center">
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Exam Study Guide</h2>
                <p className="text-gray-600 mb-8">Create a personalized study plan for your upcoming exam</p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setStudyMode('exam'); setExamStep(1); setGeneratedPlan(null); }}
                  className="btn-primary text-lg px-8 py-4"
                >
                  Start Creating Study Plan
                </motion.button>
              </div>
            )}

            {studyMode === 'exam' && (
              <>
                {/* Back to modes */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStudyMode(null); setGeneratedPlan(null); }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← Back to Exam Study Guide
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
                        onClick={async () => {
                          if (!preferredTime || !studyIntensity || !sessionDuration) return;
                          
                          setIsGeneratingPlan(true);
                          setPlanError('');
                          
                          try {
                            const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:8002';
                            const response = await fetch(`${apiBase}/tutor/generate-study-plan`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                plan_name: planName,
                                grade_level: gradeLevel,
                                subject: examSubject,
                                topics: topics.filter(t => t.trim()),
                                exam_date: examDate,
                                start_time: startTime,
                                end_time: endTime,
                                preferred_time: preferredTime,
                                study_intensity: studyIntensity,
                                session_duration: sessionDuration,
                                use_google_calendar: useGoogleCalendar,
                              }),
                            });
                            
                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.detail || 'Failed to generate study plan');
                            }
                            
                            setGeneratedPlan(data.study_plan);
                          } catch (error) {
                            console.error('Study plan generation error:', error);
                            setPlanError(error.message || 'Failed to generate study plan');
                          } finally {
                            setIsGeneratingPlan(false);
                          }
                        }}
                        disabled={!preferredTime || !studyIntensity || !sessionDuration || isGeneratingPlan}
                        className={`btn-primary ${(!preferredTime || !studyIntensity || !sessionDuration || isGeneratingPlan) ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {isGeneratingPlan ? 'Generating...' : 'Generate My Study Plan'}
            </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Error Display */}
                {planError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card border-red-200 bg-red-50"
                  >
                    <div className="text-red-600">
                      <h4 className="font-semibold mb-2">Error generating study plan</h4>
                      <p className="text-sm">{planError}</p>
                    </div>
                  </motion.div>
                )}

                {/* Summary */}
                {generatedPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Plan Overview */}
                    <div className="card">
                      <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">Your Personalized Study Plan</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-500">Study Plan Name</p>
                          <p className="font-semibold text-gray-900">{generatedPlan.plan_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Subject</p>
                          <p className="font-semibold text-gray-900">{generatedPlan.subject || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Exam Date & Time</p>
                          <p className="font-semibold text-gray-900">{generatedPlan.exam_date || '—'}</p>
                          <p className="text-sm text-gray-700">{generatedPlan.exam_time || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Days Until Exam</p>
                          <p className="font-semibold text-gray-900">{generatedPlan.days_until_exam || '—'} days</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Topics to Cover</p>
                        <div className="flex flex-wrap gap-2">
                          {(generatedPlan.topics || []).map((topic, idx) => (
                            <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Study Schedule */}
                    {generatedPlan.study_schedule && (
                      <div className="card">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4">📅 Study Schedule</h4>
                        {generatedPlan.study_schedule.weekly_breakdown && generatedPlan.study_schedule.weekly_breakdown.map((week, idx) => (
                          <div key={idx} className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <h5 className="font-semibold text-gray-800 mb-2">Week {week.week}</h5>
                            <p className="text-sm text-gray-600 mb-3">Focus: {week.focus_topics?.join(', ')}</p>
                            {week.daily_schedule && (
                              <div className="space-y-2">
                                {week.daily_schedule.map((day, dayIdx) => (
                                  <div key={dayIdx} className="flex justify-between items-center text-sm">
                                    <span className="font-medium">{day.day}</span>
                                    <span className="text-gray-600">{day.time}</span>
                                    <span className="text-gray-700">{day.activity}</span>
                                    <span className="text-gray-500">{day.duration}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Topic Prioritization */}
                    {generatedPlan.topic_prioritization && (
                      <div className="card">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4">🎯 Topic Prioritization</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {generatedPlan.topic_prioritization.map((topic, idx) => (
                            <div key={idx} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-gray-900">{topic.topic}</h5>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  topic.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  topic.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {topic.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">Time: {topic.time_allocation}</p>
                              <p className="text-sm text-gray-600">Difficulty: {topic.difficulty}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Topic Information */}
                    {generatedPlan.detailed_topic_info && (
                      <div className="card">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4">📖 Detailed Topic Information</h4>
                        <div className="space-y-6">
                          {Object.entries(generatedPlan.detailed_topic_info).map(([topic, info], idx) => (
                            <div key={idx} className="p-6 border rounded-lg bg-gray-50">
                              <h5 className="text-lg font-bold text-gray-900 mb-3">{topic}</h5>
                              
                              {/* Definition */}
                              <div className="mb-4">
                                <h6 className="font-semibold text-gray-800 mb-2">Definition:</h6>
                                <p className="text-gray-700 text-sm">{info.definition}</p>
                              </div>

                              {/* Sub-topics */}
                              {info.sub_topics && info.sub_topics.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-semibold text-gray-800 mb-2">Sub-topics to Cover:</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {info.sub_topics.map((subTopic, subIdx) => (
                                      <div key={subIdx} className="px-3 py-2 bg-white rounded border text-sm">
                                        {subTopic}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Key Concepts */}
                              {info.key_concepts && info.key_concepts.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-semibold text-gray-800 mb-2">Key Concepts:</h6>
                                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                    {info.key_concepts.map((concept, conceptIdx) => (
                                      <li key={conceptIdx}>{concept}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Formulas */}
                              {info.formulas && info.formulas.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-semibold text-gray-800 mb-2">Important Formulas:</h6>
                                  <div className="bg-white p-3 rounded border">
                                    {info.formulas.map((formula, formulaIdx) => (
                                      <div key={formulaIdx} className="text-sm font-mono text-gray-800 mb-1">
                                        {formula}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Examples */}
                              {info.examples && info.examples.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-semibold text-gray-800 mb-2">Example Problems:</h6>
                                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                    {info.examples.map((example, exampleIdx) => (
                                      <li key={exampleIdx}>{example}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Learning Objectives */}
                              {info.learning_objectives && info.learning_objectives.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-semibold text-gray-800 mb-2">Learning Objectives:</h6>
                                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                    {info.learning_objectives.map((objective, objIdx) => (
                                      <li key={objIdx}>{objective}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Study Strategies */}
                    {generatedPlan.study_strategies && (
                      <div className="card">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4">📚 Study Strategies</h4>
                        <div className="space-y-4">
                          {generatedPlan.study_strategies.map((strategy, idx) => (
                            <div key={idx} className="p-4 border rounded-lg">
                              <h5 className="font-semibold text-gray-800 mb-2">{strategy.topic}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-gray-700 mb-1">Techniques:</p>
                                  <ul className="list-disc list-inside text-gray-600">
                                    {strategy.techniques?.map((tech, techIdx) => (
                                      <li key={techIdx}>{tech}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700 mb-1">Resources:</p>
                                  <ul className="list-disc list-inside text-gray-600">
                                    {strategy.resources?.map((res, resIdx) => (
                                      <li key={resIdx}>{res}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700 mb-1">Practice Methods:</p>
                                  <ul className="list-disc list-inside text-gray-600">
                                    {strategy.practice_methods?.map((method, methodIdx) => (
                                      <li key={methodIdx}>{method}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {generatedPlan.recommendations && (
                      <div className="card">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4">💡 Recommendations</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-gray-800 mb-2">Study Environment</h5>
                            <p className="text-sm text-gray-600">{generatedPlan.recommendations.study_environment}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-800 mb-2">Time Management</h5>
                            <p className="text-sm text-gray-600">{generatedPlan.recommendations.time_management}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-800 mb-2">Stress Management</h5>
                            <p className="text-sm text-gray-600">{generatedPlan.recommendations.stress_management}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-800 mb-2">Last Minute Prep</h5>
                            <p className="text-sm text-gray-600">{generatedPlan.recommendations.last_minute_prep}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="btn-secondary"
                        onClick={() => { 
                          setStudyMode(null); 
                          setExamStep(1); 
                          setGeneratedPlan(null); 
                          setPlanError('');
                        }}
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
