import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, RefreshCw } from 'lucide-react';
import QuizCard from '../components/QuizCard';
import ProgressBar from '../components/ProgressBar';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';
import { mockQuizQuestions } from '../utils/mockData';

const Student = () => {
  const { language, updateStudentProgress } = useAppState();
  const t = useTranslation(language);
  
  const [step, setStep] = useState(1); // 1: selection, 2: quiz, 3: practice
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHints, setShowHints] = useState(false);

  const classes = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const subjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'];

  const questions = mockQuizQuestions[language];

  const handleContinue = () => {
    if (selectedClass && selectedSubject) {
      updateStudentProgress({ class: selectedClass, subject: selectedSubject });
      setStep(2);
    }
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setStep(3);
      }
    }, 2000);
  };

  const handleRetryWithHints = () => {
    setShowHints(true);
    setCurrentQuestionIndex(0);
    setScore(0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step >= s
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded transition-all ${
                      step > s ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600 max-w-md mx-auto">
            <span>{language === 'en' ? 'Select' : 'चुनें'}</span>
            <span>{language === 'en' ? 'Diagnostic' : 'निदान'}</span>
            <span>{language === 'en' ? 'Practice' : 'अभ्यास'}</span>
          </div>
        </div>

        {/* Step 1: Class & Subject Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-8 text-center">
              {t('selectClass')}
            </h2>

            {/* Class Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {language === 'en' ? 'Choose your class' : 'अपनी कक्षा चुनें'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {classes.map((cls) => (
                  <motion.button
                    key={cls}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${
                      selectedClass === cls
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cls}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Subject Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('selectSubject')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((subject) => (
                  <motion.button
                    key={subject}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedSubject(subject)}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${
                      selectedSubject === subject
                        ? 'border-secondary-500 bg-secondary-50 text-secondary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {subject}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              disabled={!selectedClass || !selectedSubject}
              className={`w-full btn-primary flex items-center justify-center space-x-2 ${
                !selectedClass || !selectedSubject ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>{t('continue')}</span>
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Diagnostic Quiz */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                {t('diagnosticQuiz')}
              </h2>
              <p className="text-gray-600">{t('quizInstructions')}</p>
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                <span className="text-gray-500">
                  {language === 'en' ? 'Question' : 'प्रश्न'} {currentQuestionIndex + 1} / {questions.length}
                </span>
                <span className="text-primary-600 font-semibold">
                  {language === 'en' ? 'Score' : 'स्कोर'}: {score}
                </span>
              </div>
            </div>

            <QuizCard
              question={questions[currentQuestionIndex]}
              onAnswer={handleAnswer}
              showHint={showHints}
              language={language}
            />
          </motion.div>
        )}

        {/* Step 3: Adaptive Practice */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">
              {t('adaptivePractice')}
            </h2>

            {/* Score Summary */}
            <div className="mb-8 p-6 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl">
              <div className="text-6xl font-bold text-gradient mb-2">
                {Math.round((score / questions.length) * 100)}%
              </div>
              <p className="text-gray-600 mb-4">
                {language === 'en'
                  ? `You got ${score} out of ${questions.length} correct!`
                  : `आपने ${questions.length} में से ${score} सही किए!`}
              </p>
              <ProgressBar progress={Math.round((score / questions.length) * 100)} />
            </div>

            {/* Recommendations */}
            <div className="mb-8 text-left">
              <h3 className="font-semibold text-lg mb-4">
                {language === 'en' ? 'Your Learning Path' : 'आपका सीखने का मार्ग'}
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                  <p className="font-medium text-green-800">
                    {language === 'en' ? 'Strong Topics' : 'मजबूत विषय'}
                  </p>
                  <p className="text-sm text-green-700">Basic arithmetic, Simple equations</p>
                </div>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                  <p className="font-medium text-yellow-800">
                    {language === 'en' ? 'Needs Practice' : 'अभ्यास की आवश्यकता'}
                  </p>
                  <p className="text-sm text-yellow-700">Word problems, Complex calculations</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRetryWithHints}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw size={18} />
                <span>{t('retryWithHints')}</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setStep(1);
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setShowHints(false);
                }}
                className="flex-1 btn-primary"
              >
                {language === 'en' ? 'Start New Topic' : 'नया विषय शुरू करें'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Student;
