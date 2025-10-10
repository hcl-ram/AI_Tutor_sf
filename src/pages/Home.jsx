import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Users } from 'lucide-react';
import RoleCard from '../components/RoleCard';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';

const Home = () => {
  const { language, setUserRole } = useAppState();
  const navigate = useNavigate();
  const t = useTranslation(language);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl mx-auto text-center">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <motion.h1
            className="text-5xl md:text-7xl font-display font-bold text-gradient mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t('mainTagline')}
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-gray-600 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t('subTagline')}
          </motion.p>
        </motion.div>

        {/* Role Selection Heading */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-display font-semibold text-gray-800 mb-12"
        >
          {t('selectRole')}
        </motion.h2>

        {/* Quick Auth Buttons (only options, no Get Started) */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="btn-primary" onClick={() => navigate('/student/login')}>
              {language === 'en' ? 'Student Login' : 'छात्र लॉगिन'}
            </button>
            <button className="btn-secondary" onClick={() => navigate('/student/signup')}>
              {language === 'en' ? 'Student Signup' : 'छात्र साइन अप'}
            </button>
            <button className="btn-primary" onClick={() => navigate('/teacher/login')}>
              {language === 'en' ? 'Teacher Login' : 'शिक्षक लॉगिन'}
            </button>
            <button className="btn-secondary" onClick={() => navigate('/teacher/signup')}>
              {language === 'en' ? 'Teacher Signup' : 'शिक्षक साइन अप'}
            </button>
          </div>
        </div>
        {/* Role cards removed to prevent navigation without login */}

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold text-lg mb-2">Adaptive Learning</h3>
            <p className="text-sm text-gray-600">
              {language === 'en' 
                ? 'AI adapts to your learning pace and style'
                : 'AI आपकी सीखने की गति और शैली के अनुसार ढलता है'}
            </p>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl">
            <div className="text-4xl mb-3">💡</div>
            <h3 className="font-semibold text-lg mb-2">Instant Feedback</h3>
            <p className="text-sm text-gray-600">
              {language === 'en'
                ? 'Get real-time explanations and insights'
                : 'वास्तविक समय स्पष्टीकरण और अंतर्दृष्टि प्राप्त करें'}
            </p>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">Track Progress</h3>
            <p className="text-sm text-gray-600">
              {language === 'en'
                ? 'Monitor your growth with detailed analytics'
                : 'विस्तृत विश्लेषण के साथ अपनी वृद्धि की निगरानी करें'}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
