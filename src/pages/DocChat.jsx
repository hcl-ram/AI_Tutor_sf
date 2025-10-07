import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Send, FileText, Loader } from 'lucide-react';
import useAppState from '../hooks/useAppState';
import { useTranslation } from '../utils/translations';
import { uploadDocument } from '../utils/mockData';

const DocChat = () => {
  const { language, uploadedDocument, setUploadedDocument } = useAppState();
  const t = useTranslation(language);
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file) => {
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      try {
        const result = await uploadDocument(file);
        setUploadedDocument(result);
        setMessages([
          {
            id: 1,
            type: 'system',
            content: language === 'en'
              ? `Document "${file.name}" uploaded successfully! You can now ask questions about it.`
              : `दस्तावेज़ "${file.name}" सफलतापूर्वक अपलोड किया गया! अब आप इसके बारे में प्रश्न पूछ सकते हैं।`,
          },
        ]);
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && uploadedDocument) {
      const userMessage = {
        id: messages.length + 1,
        type: 'user',
        content: inputMessage,
      };

      setMessages([...messages, userMessage]);
      setInputMessage('');

      // Simulate AI response
      setTimeout(() => {
        const aiMessage = {
          id: messages.length + 2,
          type: 'ai',
          content: language === 'en'
            ? 'This is a simulated AI response. In production, this would analyze your document and provide relevant answers based on the content.'
            : 'यह एक सिम्युलेटेड AI प्रतिक्रिया है। उत्पादन में, यह आपके दस्तावेज़ का विश्लेषण करेगा और सामग्री के आधार पर प्रासंगिक उत्तर प्रदान करेगा।',
          references: ['Page 1, Paragraph 2'],
        };
        setMessages((prev) => [...prev, aiMessage]);
      }, 1000);
    }
  };

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
            {t('docChat')}
          </h1>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Upload a document and chat with AI to understand it better'
              : 'दस्तावेज़ अपलोड करें और इसे बेहतर समझने के लिए AI के साथ चैट करें'}
          </p>
        </motion.div>

        {!uploadedDocument ? (
          /* Upload Section */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`card border-2 border-dashed transition-all ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center py-12">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 mb-6"
                >
                  {isUploading ? (
                    <Loader className="text-white animate-spin" size={40} />
                  ) : (
                    <Upload className="text-white" size={40} />
                  )}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{t('uploadDocument')}</h3>
                <p className="text-gray-600 mb-6">{t('dragDropPdf')}</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block btn-primary cursor-pointer"
                  >
                    {isUploading
                      ? language === 'en'
                        ? 'Uploading...'
                        : 'अपलोड हो रहा है...'
                      : language === 'en'
                      ? 'Choose File'
                      : 'फ़ाइल चुनें'}
                  </motion.div>
                </label>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Chat Interface */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Viewer Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card h-[600px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-semibold text-lg flex items-center space-x-2">
                  <FileText size={20} className="text-primary-600" />
                  <span>{t('documentPreview')}</span>
                </h3>
                <button
                  onClick={() => {
                    setUploadedDocument(null);
                    setMessages([]);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {language === 'en' ? 'Change Document' : 'दस्तावेज़ बदलें'}
                </button>
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-auto">
                <div className="bg-white rounded shadow-sm p-8 min-h-full">
                  <p className="text-gray-700 mb-4">
                    {language === 'en'
                      ? 'Document Preview (Placeholder)'
                      : 'दस्तावेज़ पूर्वावलोकन (प्लेसहोल्डर)'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>{uploadedDocument.fileName}</strong>
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {uploadedDocument.pageCount} {language === 'en' ? 'pages' : 'पृष्ठ'}
                  </p>
                  <div className="mt-8 space-y-4">
                    <p className="text-gray-700">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                      tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <p className="text-gray-700">
                      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                      aliquip ex ea commodo consequat.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Chat Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card h-[600px] flex flex-col"
            >
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-semibold text-lg">{t('chatWithDoc')}</h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex ${
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                            : message.type === 'system'
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {message.references && (
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <p className="text-xs opacity-75">
                              {language === 'en' ? 'References:' : 'संदर्भ:'}
                            </p>
                            {message.references.map((ref, idx) => (
                              <p key={idx} className="text-xs opacity-75">
                                • {ref}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('askQuestion')}
                  className="flex-1 input-field"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className={`p-3 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md hover:shadow-lg transition-all ${
                    !inputMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocChat;
