import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Brain, CheckCircle, FileText, Users, Info } from 'lucide-react';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';

const CustomNode = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = data.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`card shadow-lg border-2 ${data.borderColor} min-w-[200px]`}>
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl ${data.bgColor} flex items-center justify-center`}>
            <Icon className={data.iconColor} size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{data.label}</h3>
            <p className="text-xs text-gray-500">{data.role}</p>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64"
        >
          <div className="bg-gray-900 text-white text-sm p-4 rounded-lg shadow-xl">
            <p className="font-semibold mb-2">{data.label}</p>
            <p className="text-gray-300">{data.description}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const Agents = () => {
  const { language } = useAppState();
  const t = useTranslation(language);

  const initialNodes = [
    {
      id: '1',
      type: 'custom',
      position: { x: 250, y: 50 },
      data: {
        label: t('tutorAgent'),
        role: language === 'en' ? 'Personalization' : 'व्यक्तिगतकरण',
        description: t('tutorDesc'),
        icon: Brain,
        bgColor: 'bg-primary-100',
        iconColor: 'text-primary-600',
        borderColor: 'border-primary-400',
      },
    },
    {
      id: '2',
      type: 'custom',
      position: { x: 100, y: 250 },
      data: {
        label: t('evaluatorAgent'),
        role: language === 'en' ? 'Assessment' : 'आकलन',
        description: t('evaluatorDesc'),
        icon: CheckCircle,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        borderColor: 'border-green-400',
      },
    },
    {
      id: '3',
      type: 'custom',
      position: { x: 400, y: 250 },
      data: {
        label: t('contentAgent'),
        role: language === 'en' ? 'Generation' : 'निर्माण',
        description: t('contentDesc'),
        icon: FileText,
        bgColor: 'bg-accent-100',
        iconColor: 'text-accent-600',
        borderColor: 'border-accent-400',
      },
    },
    {
      id: '4',
      type: 'custom',
      position: { x: 250, y: 450 },
      data: {
        label: t('teacherAgent'),
        role: language === 'en' ? 'Insights' : 'अंतर्दृष्टि',
        description: t('teacherDesc'),
        icon: Users,
        bgColor: 'bg-secondary-100',
        iconColor: 'text-secondary-600',
        borderColor: 'border-secondary-400',
      },
    },
  ];

  const initialEdges = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      animated: true,
      style: { stroke: '#0ea5e9', strokeWidth: 2 },
      label: language === 'en' ? 'Assigns' : 'असाइन करता है',
    },
    {
      id: 'e1-3',
      source: '1',
      target: '3',
      animated: true,
      style: { stroke: '#0ea5e9', strokeWidth: 2 },
      label: language === 'en' ? 'Requests' : 'अनुरोध करता है',
    },
    {
      id: 'e2-4',
      source: '2',
      target: '4',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      label: language === 'en' ? 'Reports' : 'रिपोर्ट करता है',
    },
    {
      id: 'e3-4',
      source: '3',
      target: '4',
      animated: true,
      style: { stroke: '#f97316', strokeWidth: 2 },
      label: language === 'en' ? 'Provides' : 'प्रदान करता है',
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-display font-bold text-gradient mb-2">
            {t('agentOrchestration')}
          </h1>
          <p className="text-gray-600">{t('agentDesc')}</p>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card border-l-4 border-primary-500"
          >
            <div className="flex items-start space-x-3">
              <Brain className="text-primary-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-sm mb-1">{t('tutorAgent')}</h3>
                <p className="text-xs text-gray-600">{t('tutorDesc')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card border-l-4 border-green-500"
          >
            <div className="flex items-start space-x-3">
              <CheckCircle className="text-green-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-sm mb-1">{t('evaluatorAgent')}</h3>
                <p className="text-xs text-gray-600">{t('evaluatorDesc')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card border-l-4 border-accent-500"
          >
            <div className="flex items-start space-x-3">
              <FileText className="text-accent-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-sm mb-1">{t('contentAgent')}</h3>
                <p className="text-xs text-gray-600">{t('contentDesc')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card border-l-4 border-secondary-500"
          >
            <div className="flex items-start space-x-3">
              <Users className="text-secondary-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-sm mb-1">{t('teacherAgent')}</h3>
                <p className="text-xs text-gray-600">{t('teacherDesc')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* React Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="card p-0 overflow-hidden"
          style={{ height: '600px' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.id) {
                  case '1':
                    return '#0ea5e9';
                  case '2':
                    return '#10b981';
                  case '3':
                    return '#f97316';
                  case '4':
                    return '#d946ef';
                  default:
                    return '#94a3b8';
                }
              }}
            />
          </ReactFlow>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 card"
        >
          <div className="flex items-start space-x-3 mb-4">
            <Info className="text-primary-600 mt-1" size={24} />
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
                {language === 'en' ? 'How It Works' : 'यह कैसे काम करता है'}
              </h2>
              <p className="text-gray-600 mb-4">
                {language === 'en'
                  ? 'Our AI agents work together in a coordinated system to provide personalized learning experiences:'
                  : 'हमारे AI एजेंट व्यक्तिगत शिक्षण अनुभव प्रदान करने के लिए एक समन्वित प्रणाली में एक साथ काम करते हैं:'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {language === 'en' ? 'Student Interaction' : 'छात्र परस्पर क्रिया'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {language === 'en'
                      ? 'The Tutor Agent analyzes student behavior and learning patterns.'
                      : 'ट्यूटर एजेंट छात्र व्यवहार और सीखने के पैटर्न का विश्लेषण करता है।'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {language === 'en' ? 'Performance Evaluation' : 'प्रदर्शन मूल्यांकन'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {language === 'en'
                      ? 'The Evaluator Agent assesses understanding and identifies knowledge gaps.'
                      : 'मूल्यांकनकर्ता एजेंट समझ का आकलन करता है और ज्ञान अंतराल की पहचान करता है।'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {language === 'en' ? 'Content Generation' : 'सामग्री निर्माण'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {language === 'en'
                      ? 'The Content Agent creates personalized materials adapted to the student.'
                      : 'सामग्री एजेंट छात्र के अनुसार अनुकूलित व्यक्तिगत सामग्री बनाता है।'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-secondary-600 font-semibold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {language === 'en' ? 'Teacher Insights' : 'शिक्षक अंतर्दृष्टि'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {language === 'en'
                      ? 'The Teacher Agent provides actionable insights and recommendations.'
                      : 'शिक्षक एजेंट कार्रवाई योग्य अंतर्दृष्टि और सिफारिशें प्रदान करता है।'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Agents;
