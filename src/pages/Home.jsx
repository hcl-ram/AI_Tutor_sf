import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Users } from 'lucide-react';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';

const Home = () => {
  const { language, setUserRole } = useAppState();
  const navigate = useNavigate();
  const t = useTranslation(language);
  const [selectedRole, setSelectedRole] = useState(null); // 'student' | 'teacher'
  const [auth, setAuth] = useState({ email: '', password: '', name: '' });
  const [isSignup, setIsSignup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = isSignup ? `/auth/${selectedRole}/signup` : `/auth/${selectedRole}/login`;
      const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002';
      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isSignup ? { name: auth.name, email: auth.email, password: auth.password } : { email: auth.email, password: auth.password }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Authentication failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(`/${selectedRole}`);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

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

        {/* Role Selection → then show Login/Signup for chosen role */}
        <div className="mb-8">
          {!selectedRole ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                className="btn-primary"
                onClick={() => {
                  setSelectedRole('student');
                  setUserRole('student');
                }}
              >
                {language === 'en' ? "I'm a Student" : 'मैं एक छात्र हूँ'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedRole('teacher');
                  setUserRole('teacher');
                }}
              >
                {language === 'en' ? "I'm a Teacher" : 'मैं एक शिक्षक हूँ'}
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card max-w-md mx-auto"
            >
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-6 text-center">
                {isSignup 
                  ? (language === 'en' ? `${selectedRole === 'student' ? 'Student' : 'Teacher'} Sign Up` : `${selectedRole === 'student' ? 'छात्र' : 'शिक्षक'} पंजीकरण`) 
                  : (language === 'en' ? `${selectedRole === 'student' ? 'Student' : 'Teacher'} Login` : `${selectedRole === 'student' ? 'छात्र' : 'शिक्षक'} लॉगिन`)
                }
              </h2>
              <form onSubmit={handleAuth} className="space-y-4">
                {isSignup && (
                  <input 
                    className="input" 
                    placeholder={language === 'en' ? 'Full name' : 'पूरा नाम'} 
                    value={auth.name} 
                    onChange={(e) => setAuth({ ...auth, name: e.target.value })} 
                    required 
                  />
                )}
                <input 
                  className="input" 
                  type="email" 
                  placeholder="email@example.com" 
                  value={auth.email} 
                  onChange={(e) => setAuth({ ...auth, email: e.target.value })} 
                  required 
                />
                <input 
                  className="input" 
                  type="password" 
                  placeholder={language === 'en' ? 'Password' : 'पासवर्ड'} 
                  value={auth.password} 
                  onChange={(e) => setAuth({ ...auth, password: e.target.value })} 
                  required 
                />
                {authError && <div className="text-red-600 text-sm">{authError}</div>}
                <button type="submit" className="w-full btn-primary" disabled={authLoading}>
                  {authLoading 
                    ? (language === 'en' ? 'Please wait...' : 'कृपया प्रतीक्षा करें...') 
                    : isSignup 
                      ? (language === 'en' ? 'Create account' : 'खाता बनाएँ') 
                      : (language === 'en' ? 'Login' : 'लॉगिन')
                  }
                </button>
              </form>
              <div className="mt-4 text-center text-sm text-gray-600">
                <button className="text-primary-600 font-medium" onClick={() => setIsSignup(!isSignup)}>
                  {isSignup 
                    ? (language === 'en' ? 'Have an account? Login' : 'खाता है? लॉगिन करें') 
                    : (language === 'en' ? "Don't have an account? Sign up" : 'खाता नहीं? साइन अप करें')
                  }
                </button>
              </div>
              <div className="mt-4 text-center">
                <button
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setSelectedRole(null);
                    setAuth({ email: '', password: '', name: '' });
                    setIsSignup(false);
                    setAuthError('');
                  }}
                >
                  {language === 'en' ? 'Change selection' : 'चयन बदलें'}
                </button>
              </div>
            </motion.div>
          )}
        </div>

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
