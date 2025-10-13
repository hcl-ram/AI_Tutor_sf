import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, AlertCircle, ArrowLeft, BookOpen, Brain, Calculator } from 'lucide-react';
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
  const [selectedStudent, setSelectedStudent] = useState(null);

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
      // Use static data for demonstration
      const staticStudents = [
        { id: '1', name: 'John Doe', progress: 78, score: 78, lastActive: '2 hours ago' },
        { id: '2', name: 'Jane Smith', progress: 85, score: 85, lastActive: '1 hour ago' },
        { id: '3', name: 'Mike Johnson', progress: 72, score: 72, lastActive: '3 hours ago' },
        { id: '4', name: 'Sarah Wilson', progress: 91, score: 91, lastActive: '30 minutes ago' },
        { id: '5', name: 'David Brown', progress: 68, score: 68, lastActive: '4 hours ago' }
      ];
      setStudents(staticStudents);
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

  // Static student knowledge metrics data
  const getStudentMetrics = (studentId) => {
    const metricsData = {
      '1': {
        name: 'John Doe',
        overallScore: 78,
        subjects: {
          'Maths': {
            overallScore: 82,
            topics: {
              'Algebra': { score: 85, attempts: 12, lastAttempt: '2024-01-15' },
              'Geometry': { score: 78, attempts: 8, lastAttempt: '2024-01-12' },
              'Trigonometry': { score: 88, attempts: 15, lastAttempt: '2024-01-18' },
              'Calculus': { score: 75, attempts: 6, lastAttempt: '2024-01-10' },
              'Statistics': { score: 65, attempts: 5, lastAttempt: '2024-01-08' },
              'Probability': { score: 62, attempts: 4, lastAttempt: '2024-01-05' }
            }
          },
          'Physics': {
            overallScore: 74,
            topics: {
              'Mechanics': { score: 80, attempts: 10, lastAttempt: '2024-01-16' },
              'Thermodynamics': { score: 70, attempts: 7, lastAttempt: '2024-01-14' },
              'Waves': { score: 72, attempts: 9, lastAttempt: '2024-01-17' },
              'Electricity': { score: 74, attempts: 11, lastAttempt: '2024-01-19' },
              'Optics': { score: 68, attempts: 6, lastAttempt: '2024-01-11' },
              'Modern Physics': { score: 58, attempts: 3, lastAttempt: '2024-01-03' }
            }
          },
          'Chemistry': {
            overallScore: 76,
            topics: {
              'Organic Chemistry': { score: 82, attempts: 13, lastAttempt: '2024-01-18' },
              'Inorganic Chemistry': { score: 70, attempts: 8, lastAttempt: '2024-01-13' },
              'Physical Chemistry': { score: 76, attempts: 10, lastAttempt: '2024-01-16' },
              'Biochemistry': { score: 78, attempts: 12, lastAttempt: '2024-01-20' },
              'Analytical Chemistry': { score: 64, attempts: 5, lastAttempt: '2024-01-09' },
              'Environmental Chemistry': { score: 60, attempts: 4, lastAttempt: '2024-01-06' }
            }
          }
        }
      },
      '2': {
        name: 'Jane Smith',
        overallScore: 85,
        subjects: {
          'Maths': {
            overallScore: 88,
            topics: {
              'Algebra': { score: 90, attempts: 15, lastAttempt: '2024-01-18' },
              'Geometry': { score: 85, attempts: 12, lastAttempt: '2024-01-16' },
              'Trigonometry': { score: 92, attempts: 18, lastAttempt: '2024-01-20' },
              'Calculus': { score: 87, attempts: 14, lastAttempt: '2024-01-19' },
              'Statistics': { score: 82, attempts: 10, lastAttempt: '2024-01-17' },
              'Probability': { score: 78, attempts: 8, lastAttempt: '2024-01-14' }
            }
          },
          'Physics': {
            overallScore: 82,
            topics: {
              'Mechanics': { score: 85, attempts: 13, lastAttempt: '2024-01-17' },
              'Thermodynamics': { score: 80, attempts: 10, lastAttempt: '2024-01-15' },
              'Waves': { score: 84, attempts: 12, lastAttempt: '2024-01-18' },
              'Electricity': { score: 79, attempts: 11, lastAttempt: '2024-01-16' },
              'Optics': { score: 75, attempts: 9, lastAttempt: '2024-01-13' },
              'Modern Physics': { score: 68, attempts: 6, lastAttempt: '2024-01-10' }
            }
          },
          'Chemistry': {
            overallScore: 85,
            topics: {
              'Organic Chemistry': { score: 88, attempts: 16, lastAttempt: '2024-01-19' },
              'Inorganic Chemistry': { score: 82, attempts: 12, lastAttempt: '2024-01-17' },
              'Physical Chemistry': { score: 85, attempts: 14, lastAttempt: '2024-01-18' },
              'Biochemistry': { score: 85, attempts: 15, lastAttempt: '2024-01-20' },
              'Analytical Chemistry': { score: 78, attempts: 8, lastAttempt: '2024-01-15' },
              'Environmental Chemistry': { score: 72, attempts: 7, lastAttempt: '2024-01-12' }
            }
          }
        }
      },
      '3': {
        name: 'Mike Johnson',
        overallScore: 72,
        subjects: {
          'Maths': {
            overallScore: 75,
            topics: {
              'Algebra': { score: 78, attempts: 10, lastAttempt: '2024-01-14' },
              'Geometry': { score: 72, attempts: 7, lastAttempt: '2024-01-11' },
              'Trigonometry': { score: 80, attempts: 12, lastAttempt: '2024-01-16' },
              'Calculus': { score: 68, attempts: 5, lastAttempt: '2024-01-08' },
              'Statistics': { score: 58, attempts: 3, lastAttempt: '2024-01-05' },
              'Probability': { score: 55, attempts: 2, lastAttempt: '2024-01-02' }
            }
          },
          'Physics': {
            overallScore: 70,
            topics: {
              'Mechanics': { score: 75, attempts: 8, lastAttempt: '2024-01-13' },
              'Thermodynamics': { score: 65, attempts: 5, lastAttempt: '2024-01-10' },
              'Waves': { score: 68, attempts: 6, lastAttempt: '2024-01-12' },
              'Electricity': { score: 70, attempts: 7, lastAttempt: '2024-01-14' },
              'Optics': { score: 62, attempts: 4, lastAttempt: '2024-01-07' },
              'Modern Physics': { score: 55, attempts: 2, lastAttempt: '2024-01-03' }
            }
          },
          'Chemistry': {
            overallScore: 71,
            topics: {
              'Organic Chemistry': { score: 75, attempts: 9, lastAttempt: '2024-01-15' },
              'Inorganic Chemistry': { score: 65, attempts: 6, lastAttempt: '2024-01-11' },
              'Physical Chemistry': { score: 70, attempts: 7, lastAttempt: '2024-01-13' },
              'Biochemistry': { score: 72, attempts: 8, lastAttempt: '2024-01-16' },
              'Analytical Chemistry': { score: 58, attempts: 3, lastAttempt: '2024-01-06' },
              'Environmental Chemistry': { score: 55, attempts: 2, lastAttempt: '2024-01-03' }
            }
          }
        }
      },
      '4': {
        name: 'Sarah Wilson',
        overallScore: 91,
        subjects: {
          'Maths': {
            overallScore: 93,
            topics: {
              'Algebra': { score: 95, attempts: 20, lastAttempt: '2024-01-20' },
              'Geometry': { score: 90, attempts: 18, lastAttempt: '2024-01-19' },
              'Trigonometry': { score: 96, attempts: 22, lastAttempt: '2024-01-21' },
              'Calculus': { score: 92, attempts: 19, lastAttempt: '2024-01-20' },
              'Statistics': { score: 88, attempts: 15, lastAttempt: '2024-01-18' },
              'Probability': { score: 85, attempts: 12, lastAttempt: '2024-01-16' }
            }
          },
          'Physics': {
            overallScore: 89,
            topics: {
              'Mechanics': { score: 92, attempts: 18, lastAttempt: '2024-01-19' },
              'Thermodynamics': { score: 88, attempts: 15, lastAttempt: '2024-01-17' },
              'Waves': { score: 90, attempts: 16, lastAttempt: '2024-01-18' },
              'Electricity': { score: 87, attempts: 14, lastAttempt: '2024-01-16' },
              'Optics': { score: 85, attempts: 12, lastAttempt: '2024-01-15' },
              'Modern Physics': { score: 82, attempts: 10, lastAttempt: '2024-01-13' }
            }
          },
          'Chemistry': {
            overallScore: 91,
            topics: {
              'Organic Chemistry': { score: 94, attempts: 20, lastAttempt: '2024-01-20' },
              'Inorganic Chemistry': { score: 88, attempts: 16, lastAttempt: '2024-01-18' },
              'Physical Chemistry': { score: 91, attempts: 18, lastAttempt: '2024-01-19' },
              'Biochemistry': { score: 92, attempts: 19, lastAttempt: '2024-01-20' },
              'Analytical Chemistry': { score: 87, attempts: 14, lastAttempt: '2024-01-17' },
              'Environmental Chemistry': { score: 84, attempts: 12, lastAttempt: '2024-01-15' }
            }
          }
        }
      },
      '5': {
        name: 'David Brown',
        overallScore: 68,
        subjects: {
          'Maths': {
            overallScore: 70,
            topics: {
              'Algebra': { score: 72, attempts: 8, lastAttempt: '2024-01-12' },
              'Geometry': { score: 68, attempts: 6, lastAttempt: '2024-01-10' },
              'Trigonometry': { score: 75, attempts: 9, lastAttempt: '2024-01-14' },
              'Calculus': { score: 62, attempts: 4, lastAttempt: '2024-01-07' },
              'Statistics': { score: 55, attempts: 2, lastAttempt: '2024-01-04' },
              'Probability': { score: 52, attempts: 1, lastAttempt: '2024-01-02' }
            }
          },
          'Physics': {
            overallScore: 66,
            topics: {
              'Mechanics': { score: 70, attempts: 6, lastAttempt: '2024-01-11' },
              'Thermodynamics': { score: 60, attempts: 3, lastAttempt: '2024-01-08' },
              'Waves': { score: 65, attempts: 4, lastAttempt: '2024-01-09' },
              'Electricity': { score: 68, attempts: 5, lastAttempt: '2024-01-10' },
              'Optics': { score: 58, attempts: 2, lastAttempt: '2024-01-05' },
              'Modern Physics': { score: 50, attempts: 1, lastAttempt: '2024-01-01' }
            }
          },
          'Chemistry': {
            overallScore: 68,
            topics: {
              'Organic Chemistry': { score: 72, attempts: 7, lastAttempt: '2024-01-13' },
              'Inorganic Chemistry': { score: 62, attempts: 4, lastAttempt: '2024-01-09' },
              'Physical Chemistry': { score: 68, attempts: 5, lastAttempt: '2024-01-11' },
              'Biochemistry': { score: 70, attempts: 6, lastAttempt: '2024-01-12' },
              'Analytical Chemistry': { score: 55, attempts: 2, lastAttempt: '2024-01-06' },
              'Environmental Chemistry': { score: 52, attempts: 1, lastAttempt: '2024-01-03' }
            }
          }
        }
      }
    };
    return metricsData[studentId] || null;
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
                        <button 
                          onClick={() => setSelectedStudent(student)}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
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

        {/* Student Details Modal */}
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedStudent.name} - {language === 'en' ? 'Knowledge Metrics' : 'ज्ञान मेट्रिक्स'}
                      </h2>
                      <p className="text-gray-600">
                        {language === 'en' ? 'Detailed performance analysis across subjects and topics' : 'विषयों और विषयों में विस्तृत प्रदर्शन विश्लेषण'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {(() => {
                  const metrics = getStudentMetrics(selectedStudent.id);
                  if (!metrics) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          {language === 'en' ? 'No data available for this student' : 'इस छात्र के लिए कोई डेटा उपलब्ध नहीं है'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* Overall Performance */}
                      <div className="card">
                        <h3 className="text-xl font-semibold mb-4 flex items-center">
                          <Brain className="mr-2 text-primary-600" size={24} />
                          {language === 'en' ? 'Overall Performance' : 'समग्र प्रदर्शन'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-primary-50 rounded-lg">
                            <div className="text-3xl font-bold text-primary-600">{metrics.overallScore}%</div>
                            <div className="text-sm text-gray-600">
                              {language === 'en' ? 'Overall Score' : 'समग्र स्कोर'}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-secondary-50 rounded-lg">
                            <div className="text-3xl font-bold text-secondary-600">
                              {Object.keys(metrics.subjects).length}
                            </div>
                            <div className="text-sm text-gray-600">
                              {language === 'en' ? 'Subjects' : 'विषय'}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-accent-50 rounded-lg">
                            <div className="text-3xl font-bold text-accent-600">
                              {Object.values(metrics.subjects).reduce((total, subject) => 
                                total + Object.keys(subject.topics).length, 0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {language === 'en' ? 'Topics Covered' : 'कवर किए गए विषय'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subject-wise Performance */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {Object.entries(metrics.subjects).map(([subjectName, subjectData]) => (
                          <div key={subjectName} className="card">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold flex items-center">
                                {subjectName === 'Maths' && <Calculator className="mr-2 text-blue-600" size={20} />}
                                {subjectName === 'Physics' && <BookOpen className="mr-2 text-green-600" size={20} />}
                                {subjectName === 'Chemistry' && <Brain className="mr-2 text-purple-600" size={20} />}
                                {subjectName}
                              </h4>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary-600">{subjectData.overallScore}%</div>
                                <div className="text-xs text-gray-500">
                                  {language === 'en' ? 'Overall' : 'समग्र'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {Object.entries(subjectData.topics).map(([topicName, topicData]) => (
                                <div key={topicName} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{topicName}</span>
                                    <span className="text-sm font-semibold text-gray-700">{topicData.score}%</span>
                                  </div>
                                  <ProgressBar progress={topicData.score} showLabel={false} height="h-2" />
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>
                                      {language === 'en' ? 'Attempts:' : 'प्रयास:'} {topicData.attempts}
                                    </span>
                                    <span>
                                      {language === 'en' ? 'Last:' : 'अंतिम:'} {topicData.lastAttempt}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Performance Insights */}
                      <div className="card">
                        <h3 className="text-xl font-semibold mb-4">
                          {language === 'en' ? 'Performance Insights' : 'प्रदर्शन अंतर्दृष्टि'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-2">
                              {language === 'en' ? 'Strong Areas' : 'मजबूत क्षेत्र'}
                            </h4>
                            <ul className="text-sm text-green-700 space-y-1">
                              {Object.entries(metrics.subjects).map(([subjectName, subjectData]) => 
                                Object.entries(subjectData.topics)
                                  .filter(([_, topicData]) => topicData.score >= 85)
                                  .map(([topicName, _]) => (
                                    <li key={`${subjectName}-${topicName}`}>
                                      {subjectName} - {topicName}
                                    </li>
                                  ))
                              )}
                            </ul>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg">
                            <h4 className="font-semibold text-red-800 mb-2">
                              {language === 'en' ? 'Areas for Improvement' : 'सुधार के क्षेत्र'}
                            </h4>
                            <ul className="text-sm text-red-700 space-y-1">
                              {Object.entries(metrics.subjects).map(([subjectName, subjectData]) => 
                                Object.entries(subjectData.topics)
                                  .filter(([_, topicData]) => topicData.score < 70)
                                  .map(([topicName, _]) => (
                                    <li key={`${subjectName}-${topicName}`}>
                                      {subjectName} - {topicName}
                                    </li>
                                  ))
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Teacher;
