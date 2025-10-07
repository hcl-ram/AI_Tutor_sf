import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, FileText, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
  const [noteContent, setNoteContent] = useState('');

  const tabs = [
    { id: 'flashcards', label: t('flashcards'), icon: BookOpen },
    { id: 'quiz', label: t('adaptiveQuiz'), icon: Brain },
    { id: 'notes', label: t('noteEditor'), icon: FileText },
    { id: 'plan', label: t('studyPlan'), icon: Calendar },
  ];

  const flashcards = mockFlashcards[language];
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

            <div className="text-center mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary"
              >
                {t('generateFlashcards')}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Adaptive Quiz Tab */}
        {activeTab === 'quiz' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-2xl mx-auto text-center"
          >
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                <Brain className="text-white" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
                {t('adaptiveQuiz')}
              </h2>
              <p className="text-gray-600">
                {language === 'en'
                  ? 'Test your knowledge with AI-generated questions'
                  : 'AI-जनित प्रश्नों के साथ अपने ज्ञान का परीक्षण करें'}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-primary-50 rounded-xl text-left">
                <p className="font-medium text-gray-900 mb-2">
                  {language === 'en' ? 'Difficulty' : 'कठिनाई'}: Adaptive
                </p>
                <p className="text-sm text-gray-600">
                  {language === 'en'
                    ? 'Questions will adjust based on your performance'
                    : 'प्रश्न आपके प्रदर्शन के आधार पर समायोजित होंगे'}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary w-full"
            >
              {t('startQuiz')}
            </motion.button>
          </motion.div>
        )}

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
            className="max-w-3xl mx-auto space-y-4"
          >
            <div className="card">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                {t('studyPlan')}
              </h2>
              <p className="text-gray-600 mb-6">
                {language === 'en'
                  ? 'Your personalized learning roadmap'
                  : 'आपका व्यक्तिगत शिक्षण रोडमैप'}
              </p>
            </div>

            {studyPlan.map((task) => (
              <motion.div
                key={task.id}
                whileHover={{ scale: 1.02 }}
                className="card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {language === 'en' ? 'Due:' : 'नियत तिथि:'} {task.dueDate}
                    </p>
                    {task.progress > 0 && (
                      <ProgressBar progress={task.progress} height="h-2" showLabel={false} />
                    )}
                  </div>
                  <span
                    className={`ml-4 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      task.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {task.status === 'in-progress'
                      ? language === 'en'
                        ? 'In Progress'
                        : 'प्रगति में'
                      : language === 'en'
                      ? 'Pending'
                      : 'लंबित'}
                  </span>
                </div>
              </motion.div>
            ))}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full btn-secondary"
            >
              {language === 'en' ? 'Generate New Plan' : 'नई योजना बनाएं'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AITutor;
