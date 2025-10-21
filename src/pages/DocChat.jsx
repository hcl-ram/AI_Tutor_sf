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
  const [docSummary, setDocSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleFileUpload = async (file) => {
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      try {
        const result = await uploadDocument(file);
        setUploadedDocument(result);
        // Fetch summary for preview
        const token = localStorage.getItem('token');
        const base = process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_BASE_URL || 'http://98.84.139.47:8002';
        if (result?.s3Key) {
          setLoadingSummary(true);
          try {
            const res = await fetch(`${base}/tutor/doc-summary`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ s3_key: result.s3Key })
            });
            const data = await res.json();
            if (res.ok) setDocSummary(data.summary || '');
          } finally {
            setLoadingSummary(false);
          }
        }
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

  // const handleSendMessage = async () => {
  //   if (inputMessage.trim() && uploadedDocument) {
  //     const userMessage = {
  //       id: messages.length + 1,
  //       type: 'user',
  //       content: inputMessage,
  //     };

  //     setMessages([...messages, userMessage]);
  //     setInputMessage('');
  //     // Prefer RAG with the uploaded document; fallback to summary-context, then to plain LLM
  //     try {
  //       const token = localStorage.getItem('token');
  //       const base = process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002';
  //       let answerText = '';
  //       let refs = [];

  //       // 1) RAG using document key
  //       try {
  //         const ragRes = await fetch(`${base}/tutor/rag-answer`, {
  //           method: 'POST',
  //           headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
  //           body: JSON.stringify({ question: userMessage.content, s3_key: uploadedDocument?.s3Key })
  //         });
  //         const ragData = await ragRes.json();
  //         if (ragRes.ok) {
  //           answerText = ragData?.answer || '';
  //           refs = (ragData?.sources || []).map(s => `${s.source} (score ${s.score})`);
  //         }
  //       } catch {}

  //       // 2) If empty, ensure we have a summary then use summary context
  //       if (!answerText) {
  //         let summaryToUse = docSummary;
  //         if (!summaryToUse && uploadedDocument?.s3Key) {
  //           try {
  //             const sres = await fetch(`${base}/tutor/doc-summary`, {
  //               method: 'POST',
  //               headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
  //               body: JSON.stringify({ s3_key: uploadedDocument.s3Key })
  //             });
  //             const sdata = await sres.json();
  //             if (sres.ok) summaryToUse = sdata?.summary || '';
  //           } catch {}
  //         }
  //         try {
  //           const ctxRes = await fetch(`${base}/tutor/answer-with-context`, {
  //             method: 'POST',
  //             headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
  //             body: JSON.stringify({ question: userMessage.content, context: summaryToUse || '' })
  //           });
  //           const ctxData = await ctxRes.json();
  //           if (ctxRes.ok) answerText = ctxData?.answer || '';
  //         } catch {}
  //       }

  //       // 3) Final safety: generic helpful fallback if still empty
  //       if (!answerText) {
  //         answerText = language === 'en'
  //           ? 'Sorry, I could not find an answer in the document. Try rephrasing or asking more specifically.'
  //           : 'क्षमा करें, मुझे दस्तावेज़ में उत्तर नहीं मिला। कृपया अपना प्रश्न पुनः वाक्यांशित करें या अधिक विशिष्ट पूछें।';
  //       }
  //       const aiMessage = {
  //         id: userMessage.id + 1,
  //         type: 'ai',
  //         content: answerText || (language === 'en' ? 'No answer available.' : 'उत्तर उपलब्ध नहीं है।'),
  //         references: refs
  //       };
  //       setMessages((prev) => [...prev, aiMessage]);
  //     } catch (e) {
  //       const aiMessage = {
  //         id: userMessage.id + 1,
  //         type: 'ai',
  //         content: language === 'en' ? 'Failed to fetch answer.' : 'उत्तर प्राप्त करने में विफल।'
  //       };
  //       setMessages((prev) => [...prev, aiMessage]);
  //     }
  //   }
  // };

  const handleSendBedrockMessage = async () => {
    if (inputMessage.trim()) {
      const userMessage = {
        id: messages.length + 1,
        type: 'user',
        content: inputMessage,
      };
  
      setMessages([...messages, userMessage]);
      setInputMessage('');
  
      try {
        const token = localStorage.getItem('token');
        const base =
          process.env.REACT_APP_API_BASE ||
          process.env.REACT_APP_API_BASE_URL ||
          'http://98.84.139.47:8002';
  
        // Prepare request body
        const payload = { question: userMessage.content };
  
        // Call new backend endpoint (we’ll implement this later)
        const res = await fetch(`${base}/tutor/bedrock-answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(payload),
        });
  
        let answerText = '';
        if (res.ok) {
          const data = await res.json();
          answerText = data?.answer || '';
        }
  
        // Fallback if no response
        if (!answerText) {
          answerText =
            language === 'en'
              ? 'Sorry, no response received from Bedrock.'
              : 'क्षमा करें, Bedrock से कोई उत्तर प्राप्त नहीं हुआ।';
        }
  
        const aiMessage = {
          id: userMessage.id + 1,
          type: 'ai',
          content: answerText,
        };
  
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        const aiMessage = {
          id: userMessage.id + 1,
          type: 'ai',
          content:
            language === 'en'
              ? 'Failed to connect to Bedrock API.'
              : 'Bedrock API से कनेक्ट करने में विफल।',
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
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
          <div className="flex justify-center">
            {/* Document Viewer Panel */}
            {/* <motion.div
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
                    {language === 'en' ? 'Document Summary' : 'दस्तावेज़ सारांश'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>{uploadedDocument.fileName}</strong>
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {uploadedDocument.pageCount} {language === 'en' ? 'pages' : 'पृष्ठ'}
                  </p>
                  <div className="mt-4">
                    {loadingSummary ? (
                      <div className="text-sm text-gray-500">{language === 'en' ? 'Summarizing…' : 'सारांश बनाया जा रहा है…'}</div>
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{docSummary || (language === 'en' ? 'No summary available.' : 'सारांश उपलब्ध नहीं है।')}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div> */}

            {/* Chat Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card h-[600px] flex flex-col w-full max-w-3xl mx-auto lg:max-w-4xl"
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
                        {/* References removed per request */}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSendBedrockMessage()}
                  placeholder={t('askQuestion')}
                  className="flex-1 input-field"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendBedrockMessage}
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
