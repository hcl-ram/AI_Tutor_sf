import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, RefreshCw, Brain, BookOpen, FileText } from 'lucide-react';
// QuizCard removed from single-question flow; showing all questions at once
import ProgressBar from '../components/ProgressBar';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';
// Removed mock data; questions will be loaded from backend

const Student = () => {
  const { language, updateStudentProgress } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  // Authentication is now handled on Home page
  const t = useTranslation(language);
  
  const [step, setStep] = useState(0); // 0: student hub (AI Tutor, Doc Chat, Adaptive Quiz), 1: class selection, 2: subject selection, 3: chapter selection, 4: quiz, 5: practice
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [answerResults, setAnswerResults] = useState([]); // {question, is_correct} per item
  const [recs, setRecs] = useState(null); // {strong_topics:[], needs_practice:[], summary}
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState([]); // per-question selected option index or null
  const [selectedRationales, setSelectedRationales] = useState([]); // per-question free-text rationale

  const classes = ['Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const subjects = ['Maths', 'Physics', 'Chemistry', 'Botany', 'Zoology'];
  const subjectChaptersMap = {
    'Maths': {
      'Class 9': ['Number Systems', 'Polynomials', 'Coordinate Geometry', 'Linear Equations', 'Introduction to Euclid\'s Geometry', 'Lines and Angles', 'Triangles', 'Quadrilaterals', 'Areas', 'Circles', 'Constructions', 'Heron\'s Formula', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
      'Class 10': ['Real Numbers', 'Polynomials', 'Pair of Linear Equations', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Constructions', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
      'Class 11': ['Sets', 'Relations and Functions', 'Trigonometric Functions', 'Principle of Mathematical Induction', 'Complex Numbers', 'Linear Inequalities', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series', 'Straight Lines', 'Conic Sections', 'Introduction to Three Dimensional Geometry', 'Limits and Derivatives', 'Mathematical Reasoning', 'Statistics', 'Probability'],
      'Class 12': ['Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants', 'Continuity and Differentiability', 'Application of Derivatives', 'Integrals', 'Application of Integrals', 'Differential Equations', 'Vector Algebra', 'Three Dimensional Geometry', 'Linear Programming', 'Probability']
    },
    'Physics': {
      'Class 9': ['Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound'],
      'Class 10': ['Light - Reflection and Refraction', 'Human Eye and Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Sources of Energy'],
      'Class 11': ['Physical World', 'Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion', 'Work, Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation', 'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter', 'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves'],
      'Class 12': ['Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity', 'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves', 'Ray Optics and Optical Instruments', 'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics', 'Communication Systems']
    },
    'Chemistry': {
      'Class 9': ['Matter in Our Surroundings', 'Is Matter Around Us Pure', 'Atoms and Molecules', 'Structure of the Atom'],
      'Class 10': ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Periodic Classification of Elements'],
      'Class 11': ['Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements and Periodicity in Properties', 'Chemical Bonding and Molecular Structure', 'States of Matter', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Hydrogen', 's-Block Elements', 'p-Block Elements', 'Organic Chemistry - Some Basic Principles and Techniques', 'Hydrocarbons', 'Environmental Chemistry'],
      'Class 12': ['Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry', 'General Principles and Processes of Isolation of Elements', 'p-Block Elements', 'd and f Block Elements', 'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers', 'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules', 'Polymers', 'Chemistry in Everyday Life']
    },
    'Botany': {
      'Class 9': ['The Fundamental Unit of Life', 'Tissues', 'Diversity in Living Organisms', 'Natural Resources'],
      'Class 10': ['Life Processes', 'Control and Coordination', 'How do Organisms Reproduce', 'Heredity and Evolution', 'Our Environment'],
      'Class 11': ['The Living World', 'Biological Classification', 'Plant Kingdom', 'Morphology of Flowering Plants', 'Anatomy of Flowering Plants', 'Cell - The Unit of Life', 'Cell Cycle and Cell Division', 'Transport in Plants', 'Mineral Nutrition', 'Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth and Development'],
      'Class 12': ['Reproduction in Organisms', 'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health', 'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance', 'Evolution', 'Human Health and Disease', 'Strategies for Enhancement in Food Production', 'Microbes in Human Welfare', 'Biotechnology - Principles and Processes', 'Biotechnology and its Applications', 'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation', 'Environmental Issues']
    },
    'Zoology': {
      'Class 9': ['The Fundamental Unit of Life', 'Tissues', 'Diversity in Living Organisms', 'Natural Resources'],
      'Class 10': ['Life Processes', 'Control and Coordination', 'How do Organisms Reproduce', 'Heredity and Evolution', 'Our Environment'],
      'Class 11': ['The Living World', 'Biological Classification', 'Animal Kingdom', 'Structural Organisation in Animals', 'Cell - The Unit of Life', 'Cell Cycle and Cell Division', 'Digestion and Absorption', 'Breathing and Exchange of Gases', 'Body Fluids and Circulation', 'Excretory Products and their Elimination', 'Locomotion and Movement', 'Neural Control and Coordination', 'Chemical Coordination and Integration'],
      'Class 12': ['Reproduction in Organisms', 'Human Reproduction', 'Reproductive Health', 'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance', 'Evolution', 'Human Health and Disease', 'Strategies for Enhancement in Food Production', 'Microbes in Human Welfare', 'Biotechnology - Principles and Processes', 'Biotechnology and its Applications', 'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation', 'Environmental Issues']
    }
  };
  // Removed old subjectTopicsMap reference
  const difficulties = ['easy', 'medium', 'hard'];

  const [questions, setQuestions] = useState([]);

  const startQuiz = async () => {
    if (selectedClass && selectedSubject && selectedChapter) {
      updateStudentProgress({ class: selectedClass, subject: selectedSubject, topic: selectedChapter, difficulty, numQuestions });
      try {
        setQuizError('');
        setQuizLoading(true);
        setAnswerResults([]);
        setRecs(null);
        setRecsError('');
        const token = localStorage.getItem('token');
        const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002';
        const res = await fetch(`${base}/quiz/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            class_level: (selectedClass.match(/\d+/)?.[0] || '10'),
            subject: selectedSubject,
            topic: selectedChapter,
            difficulty: difficulty,
            num_questions: Number(numQuestions) || 5
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to generate quiz');
        const normalized = (data.questions || []).map((q) => ({
          question: q.question,
          options: q.options,
          correctAnswer: ['A','B','C','D'].indexOf(q.answer),
          explanation: q.solution,
          hint: q.hint
        }));
        setQuestions(normalized);
        setSelectedAnswers(new Array(normalized.length).fill(null));
        setSelectedRationales(new Array(normalized.length).fill(''));
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowHints(false);
      } catch (e) {
        setQuestions([]);
        setQuizError(e.message || 'Unable to load quiz');
      } finally {
        setQuizLoading(false);
      }
    }
  };

  // Auto-start quiz when step 4 is reached
  React.useEffect(() => {
    if (step === 4) {
      startQuiz();
    }
  }, [step]);

  // Authentication handler removed - now handled on Home page

  const submitQuiz = async () => {
    if (!questions.length) return;
    const computedResults = questions.map((q, idx) => {
      const sel = selectedAnswers[idx];
      const correct = q.correctAnswer;
      return {
        question: q.question,
        options: q.options,
        correct_index: correct,
        selected_index: sel,
        explanation: q.explanation,
        student_explanation: selectedRationales[idx] || '',
      };
    });
    const totalScore = computedResults.reduce((acc, r) => acc + (r.selected_index === r.correct_index ? 1 : 0), 0);
    setScore(totalScore);
    setAnswerResults(computedResults);
    try {
      setRecsLoading(true);
      setRecsError('');
      const token = localStorage.getItem('token');
      const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002';
        const res = await fetch(`${base}/quiz/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            subject: selectedSubject,
            topic: selectedChapter || selectedSubject,
            class_level: (selectedClass.match(/\d+/)?.[0] || '10'),
            difficulty: difficulty,
            results: computedResults,
          }),
        });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to get recommendations');
      setRecs(data?.recommendations || null);
    } catch (err) {
      setRecs(null);
      setRecsError(err.message || 'Unable to load recommendations');
    } finally {
      setRecsLoading(false);
      setStep(5);
    }
  };

  const handleRetryWithHints = () => {
    setShowHints(true);
    setCurrentQuestionIndex(0);
    setScore(0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator (visible after starting Adaptive Quiz) */}
        {step > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all text-xs ${
                      step >= s
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s + 1}
                  </div>
                  {s < 5 && (
                    <div
                      className={`w-12 h-1 mx-1 rounded transition-all ${
                        step > s ? 'bg-primary-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 max-w-4xl mx-auto">
              <span>{language === 'en' ? 'Start' : 'शुरू'}</span>
              <span>{language === 'en' ? 'Class' : 'कक्षा'}</span>
              <span>{language === 'en' ? 'Subject' : 'विषय'}</span>
              <span>{language === 'en' ? 'Chapter' : 'अध्याय'}</span>
              <span>{language === 'en' ? 'Quiz' : 'प्रश्नोत्तरी'}</span>
              <span>{language === 'en' ? 'Results' : 'परिणाम'}</span>
            </div>
          </div>
        )}

        {/* Step 0: Student Hub - three centered feature buttons */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">
              {language === 'en' ? 'What would you like to do?' : 'आप क्या करना चाहेंगे?'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Navigate to AI Tutor page
                  navigate('/ai-tutor');
                }}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-400 transition text-left"
              >
                <div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                  <BookOpen className="text-white" size={28} />
                </div>
                <div className="font-semibold text-gray-900 mb-1">{t('aiTutor')}</div>
                <div className="text-sm text-gray-600">{language === 'en' ? 'Learn with flashcards, plans and notes' : 'फ्लैशकार्ड, योजना और नोट्स के साथ सीखें'}</div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  navigate('/doc-chat');
                }}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-400 transition text-left"
              >
                <div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                  <FileText className="text-white" size={28} />
                </div>
                <div className="font-semibold text-gray-900 mb-1">{t('docChat')}</div>
                <div className="text-sm text-gray-600">{language === 'en' ? 'Upload PDF and chat to understand' : 'PDF अपलोड करें और समझने के लिए चैट करें'}</div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(1)}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-400 transition text-left"
              >
                <div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                  <Brain className="text-white" size={28} />
                </div>
                <div className="font-semibold text-gray-900 mb-1">{t('adaptiveQuiz')}</div>
                <div className="text-sm text-gray-600">{language === 'en' ? 'AI-generated questions tailored to you' : 'आपके अनुरूप AI-जनित प्रश्न'}</div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Class Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-8 text-center">
              {language === 'en' ? 'Select Your Class' : 'अपनी कक्षा चुनें'}
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

            {/* Continue Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (selectedClass) {
                  setStep(2); // Go to subject selection
                }
              }}
              disabled={!selectedClass}
              className={`w-full btn-primary flex items-center justify-center space-x-2 ${
                !selectedClass ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>{language === 'en' ? 'Next' : 'अगला'}</span>
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Subject Selection */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-8 text-center">
              {language === 'en' ? 'Select Subject' : 'विषय चुनें'}
            </h2>

            {/* Subject Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {language === 'en' ? 'Choose your subject' : 'अपना विषय चुनें'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <motion.button
                    key={subject}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedSubject(subject)}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${
                      selectedSubject === subject
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {subject}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(1)}
                className="btn-secondary flex items-center space-x-2"
              >
                <ChevronRight size={20} className="rotate-180" />
                <span>{language === 'en' ? 'Back' : 'वापस'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (selectedSubject) {
                    setStep(3); // Go to chapter selection
                  }
                }}
                disabled={!selectedSubject}
                className={`btn-primary flex items-center space-x-2 ${
                  !selectedSubject ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>{language === 'en' ? 'Next' : 'अगला'}</span>
                <ChevronRight size={20} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Chapter Selection */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-8 text-center">
              {language === 'en' ? 'Select Chapter' : 'अध्याय चुनें'}
            </h2>

            {/* Chapter Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {language === 'en' ? `Choose a chapter from ${selectedSubject}` : `${selectedSubject} से एक अध्याय चुनें`}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {(subjectChaptersMap[selectedSubject]?.[selectedClass] || []).map((chapter) => (
                  <motion.button
                    key={chapter}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedChapter(chapter)}
                    className={`p-3 rounded-xl border-2 font-medium transition-all text-sm ${
                      selectedChapter === chapter
                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {chapter}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(2)}
                className="btn-secondary flex items-center space-x-2"
              >
                <ChevronRight size={20} className="rotate-180" />
                <span>{language === 'en' ? 'Back' : 'वापस'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (selectedChapter) {
                    setStep(4); // Go to quiz
                  }
                }}
                disabled={!selectedChapter}
                className={`btn-primary flex items-center space-x-2 ${
                  !selectedChapter ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>{language === 'en' ? 'Start Quiz' : 'प्रश्नोत्तरी शुरू करें'}</span>
                <ChevronRight size={20} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Adaptive Quiz */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                {language === 'en' ? 'Adaptive Quiz' : 'अनुकूली प्रश्नोत्तरी'}
              </h2>
              <div className="mb-4 p-4 bg-primary-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">
                  {language === 'en' ? 'Quiz Details:' : 'प्रश्नोत्तरी विवरण:'}
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full">
                    {selectedClass}
                  </span>
                  <span className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full">
                    {selectedSubject}
                  </span>
                  <span className="px-3 py-1 bg-accent-100 text-accent-700 rounded-full">
                    {selectedChapter}
                  </span>
                </div>
              </div>
              <p className="text-gray-600">
                {language === 'en' 
                  ? 'Answer the questions below. The difficulty will adapt based on your performance.'
                  : 'नीचे दिए गए प्रश्नों के उत्तर दें। कठिनाई आपके प्रदर्शन के आधार पर समायोजित होगी।'
                }
              </p>
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                <span className="text-gray-500">
                  {language === 'en' ? 'Question' : 'प्रश्न'} {questions.length ? currentQuestionIndex + 1 : 0} / {questions.length}
                </span>
                <span className="text-primary-600 font-semibold">
                  {language === 'en' ? 'Score' : 'स्कोर'}: {score}
                </span>
              </div>
            </div>

            {quizLoading && (
              <div className="card max-w-2xl mx-auto text-center text-gray-700">
                <div className="flex items-center justify-center mb-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mr-2"></div>
                  <span>{language === 'en' ? 'Questions are on the way…' : 'प्रश्न आ रहे हैं…'}</span>
                </div>
                <p className="text-sm text-gray-500">{language === 'en' ? 'Generating quiz from AI' : 'AI से प्रश्न तैयार किए जा रहे हैं'}</p>
              </div>
            )}

            {!quizLoading && questions.length > 0 ? (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="card">
                    <div className="mb-3 font-medium text-gray-900">
                      {language === 'en' ? 'Question' : 'प्रश्न'} {idx + 1}:
                    </div>
                    <div className="mb-4 text-gray-800">{q.question}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, oidx) => (
                        <label key={oidx} className={`p-3 rounded-lg border cursor-pointer transition ${selectedAnswers[idx] === oidx ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            className="mr-2"
                            checked={selectedAnswers[idx] === oidx}
                            onChange={() => {
                              setSelectedAnswers((prev) => {
                                const next = [...prev];
                                next[idx] = oidx;
                                return next;
                              });
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {/* Learner rationale input */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'en' ? 'Explain your answer (optional)' : 'अपने उत्तर का कारण बताएं (वैकल्पिक)'}
                      </label>
                      <textarea
                        className="input min-h-[88px]"
                        placeholder={language === 'en' ? 'Write a brief explanation of your choice...' : 'अपनी पसंद का संक्षिप्त कारण लिखें...'}
                        value={selectedRationales[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedRationales((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                      />
                    </div>
                    {showHints && q.hint && (
                      <div className="mt-3 text-sm text-gray-600">{q.hint}</div>
                    )}
                  </div>
                ))}
                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={submitQuiz}
                    className="btn-primary"
                  >
                    {language === 'en' ? 'Submit Answers' : 'उत्तर सबमिट करें'}
                  </motion.button>
                </div>
              </div>
            ) : (!quizLoading && (
              <div className="card max-w-2xl mx-auto text-center text-gray-600">
                {quizError || (language === 'en' ? 'No questions available. Try another selection.' : 'कोई प्रश्न उपलब्ध नहीं। कोई अन्य चयन आज़माएँ।')}
              </div>
            ))}
          </motion.div>
        )}

        {/* Step 5: Adaptive Practice */}
        {step === 5 && (
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

            {/* Recommendations - Rich UI */}
            <div className="mb-8 text-left">
              <h3 className="font-semibold text-lg mb-4">
                {language === 'en' ? 'Your Learning Path' : 'आपका सीखने का मार्ग'}
              </h3>
              {recsLoading && (
                <div className="text-sm text-gray-600">{language === 'en' ? 'Analyzing your answers…' : 'आपके उत्तरों का विश्लेषण हो रहा है…'}</div>
              )}
              {!recsLoading && recsError && (
                <div className="text-sm text-red-600">{recsError}</div>
              )}
              {!recsLoading && recs && (
                <>
                  {recs.summary && (
                    <p className="mb-4 text-gray-700">{recs.summary}</p>
                  )}
                  {/* Per-question breakdown */}
                  {Array.isArray(recs.breakdown) && recs.breakdown.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2">{language === 'en' ? 'Question-wise feedback' : 'प्रश्नवार प्रतिक्रिया'}</h4>
                      <div className="space-y-3">
                        {recs.breakdown.map((b, i) => (
                          <div key={i} className={`p-4 rounded-lg border ${b.is_correct ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                            <div className="font-medium text-gray-900 mb-1">Q{i+1}. {b.question}</div>
                            <div className="text-sm text-gray-700"><span className="font-medium">{language === 'en' ? 'Your answer' : 'आपका उत्तर'}:</span> {b.selected || (language === 'en' ? 'None' : 'कोई नहीं')}</div>
                            <div className="text-sm text-gray-700"><span className="font-medium">{language === 'en' ? 'Correct answer' : 'सही उत्तर'}:</span> {b.correct}</div>
                            {b.explanation && (
                              <div className="text-sm text-gray-600 mt-1">{b.explanation}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Learning path */}
                  {Array.isArray(recs.learning_path) && recs.learning_path.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2">{language === 'en' ? 'Personalized learning path' : 'व्यक्तिगत सीखने का मार्ग'}</h4>
                      <ol className="list-decimal ml-6 space-y-1 text-gray-800">
                        {recs.learning_path.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {/* Topic buckets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                      <p className="font-medium text-green-800">{language === 'en' ? 'Strong Topics' : 'मजबूत विषय'}</p>
                      <p className="text-sm text-green-700">{(recs.strong_topics || []).join(', ') || (language === 'en' ? 'N/A' : 'उपलब्ध नहीं')}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                      <p className="font-medium text-yellow-800">{language === 'en' ? 'Needs Practice' : 'अभ्यास की आवश्यकता'}</p>
                      <p className="text-sm text-yellow-700">{(recs.needs_practice || []).join(', ') || (language === 'en' ? 'N/A' : 'उपलब्ध नहीं')}</p>
                    </div>
                  </div>
                </>
              )}
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
                  setAnswerResults([]);
                  setRecs(null);
                  setRecsError('');
                }}
                className="flex-1 btn-primary"
              >
                {language === 'en' ? 'Start New Topic' : 'नया विषय शुरू करें'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  navigate('/student/login');
                }}
                className="flex-1 btn-secondary"
              >
                {language === 'en' ? 'Logout' : 'लॉगआउट'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Student;
