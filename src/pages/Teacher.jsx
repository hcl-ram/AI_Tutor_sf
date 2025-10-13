import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ProgressBar from '../components/ProgressBar';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';
// Removed mocks; will fetch live data from backend

const Teacher = () => {
  const { language } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  // Authentication is now handled on Home page
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [interventions, setInterventions] = useState([]);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002';
    const headers = { 'Authorization': `Bearer ${token}` };
    Promise.all([
      fetch(`${base}/teacher/students`, { headers }).then(r => r.json()).catch(() => ({ students: [] })),
      fetch(`${base}/teacher/heatmap`, { headers }).then(r => r.json()).catch(() => ({ heatmap: [] })),
      fetch(`${base}/teacher/interventions`, { headers }).then(r => r.json()).catch(() => ({ interventions: [] })),
    ]).then(([s, h, i]) => {
      setStudents(s.students || []);
      setHeatmap(h.heatmap || []);
      setInterventions(i.interventions || []);
    });
  }, []);

  const tabs = [
    { id: 'overview', label: t('overview') },
    { id: 'students', label: t('students') },
    { id: 'heatmap', label: t('conceptHeatmap') },
    { id: 'interventions', label: t('interventions') },
  ];

  const getHeatmapColor = (mastery) => {
    if (mastery >= 80) return '#10b981';
    if (mastery >= 60) return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Auth Card removed - now handled on Home page */}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-display font-bold text-gradient mb-2">
            {language === 'en' ? 'Teacher Dashboard' : 'शिक्षक डैशबोर्ड'}
          </h1>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Monitor student progress and provide personalized guidance'
              : 'छात्र प्रगति की निगरानी करें और व्यक्तिगत मार्गदर्शन प्रदान करें'}
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="mb-8 flex space-x-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('totalStudents')}</p>
                    <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Users className="text-primary-600" size={24} />
                  </div>
                </div>
                <div className="text-sm text-green-600 flex items-center">
                  <TrendingUp size={16} className="mr-1" />
                  +12% from last month
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('avgProgress')}</p>
                    <p className="text-3xl font-bold text-gray-900">81%</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                    <TrendingUp className="text-secondary-600" size={24} />
                  </div>
                </div>
                <ProgressBar progress={81} showLabel={false} />
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('activeToday')}</p>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
                    <Clock className="text-accent-600" size={24} />
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {language === 'en' ? 'Out of' : 'कुल में से'} {students.length}
                </div>
              </div>
            </div>

            {/* Recent Students */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">
                {language === 'en' ? 'Recent Activity' : 'हाल की गतिविधि'}
              </h3>
              <div className="space-y-4">
                {students.slice(0, 3).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.lastActive}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600">{student.score}%</p>
                      <p className="text-xs text-gray-500">{t('progress')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h3 className="text-2xl font-semibold mb-6">{t('students')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      {t('studentName')}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      {t('progress')}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      {language === 'en' ? 'Score' : 'स्कोर'}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      {t('lastActive')}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      {language === 'en' ? 'Actions' : 'कार्य'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-32">
                          <ProgressBar progress={student.progress} showLabel={false} height="h-2" />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-primary-600">{student.score}%</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{student.lastActive}</td>
                      <td className="py-4 px-4">
                        <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                          {t('viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Heatmap Tab */}
        {activeTab === 'heatmap' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h3 className="text-2xl font-semibold mb-6">{t('conceptHeatmap')}</h3>
            <p className="text-gray-600 mb-8">
              {language === 'en'
                ? 'Visual representation of class mastery across different topics'
                : 'विभिन्न विषयों में कक्षा महारत का दृश्य प्रतिनिधित्व'}
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={heatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="topic" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="mastery" radius={[8, 8, 0, 0]}>
                  {heatmap.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHeatmapColor(entry.mastery)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>{language === 'en' ? 'Strong (80%+)' : 'मजबूत (80%+)'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                <span>{language === 'en' ? 'Moderate (60-79%)' : 'मध्यम (60-79%)'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>{language === 'en' ? 'Needs Work (<60%)' : 'काम की जरूरत (<60%)'}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Interventions Tab */}
        {activeTab === 'interventions' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <p className="text-gray-600 mb-6">
              {language === 'en'
                ? 'AI-generated recommendations based on student performance'
                : 'छात्र प्रदर्शन के आधार पर AI-जनित सिफारिशें'}
            </p>
            {interventions.map((intervention) => (
              <motion.div
                key={intervention.id}
                whileHover={{ scale: 1.02 }}
                className={`card border-l-4 ${
                  intervention.priority === 'high'
                    ? 'border-red-500'
                    : intervention.priority === 'medium'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <AlertCircle
                      className={
                        intervention.priority === 'high'
                          ? 'text-red-500'
                          : intervention.priority === 'medium'
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                      }
                      size={24}
                    />
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{intervention.title}</h4>
                      <p className="text-gray-600 mt-1">{intervention.description}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      intervention.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : intervention.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {intervention.priority.toUpperCase()}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {language === 'en' ? 'Affected students:' : 'प्रभावित छात्र:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {intervention.students.map((student, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
                        {student}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Teacher;
