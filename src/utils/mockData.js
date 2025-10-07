// Mock data for the application

export const mockQuizQuestions = {
  en: [
    {
      id: 1,
      question: "What is the value of 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: 1,
      explanation: "2 + 2 equals 4. This is basic addition.",
      hint: "Think about counting on your fingers."
    },
    {
      id: 2,
      question: "Which planet is closest to the Sun?",
      options: ["Venus", "Mercury", "Earth", "Mars"],
      correctAnswer: 1,
      explanation: "Mercury is the closest planet to the Sun in our solar system.",
      hint: "It's named after the Roman messenger god known for speed."
    },
    {
      id: 3,
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      explanation: "Paris is the capital and largest city of France.",
      hint: "Think of the Eiffel Tower."
    }
  ],
  hi: [
    {
      id: 1,
      question: "2 + 2 का मान क्या है?",
      options: ["3", "4", "5", "6"],
      correctAnswer: 1,
      explanation: "2 + 2 बराबर 4 होता है। यह बुनियादी जोड़ है।",
      hint: "अपनी उंगलियों पर गिनने के बारे में सोचें।"
    },
    {
      id: 2,
      question: "सूर्य के सबसे निकट कौन सा ग्रह है?",
      options: ["शुक्र", "बुध", "पृथ्वी", "मंगल"],
      correctAnswer: 1,
      explanation: "बुध हमारे सौर मंडल में सूर्य के सबसे निकट का ग्रह है।",
      hint: "इसका नाम गति के लिए जाने जाने वाले रोमन संदेशवाहक देवता के नाम पर रखा गया है।"
    },
    {
      id: 3,
      question: "फ्रांस की राजधानी क्या है?",
      options: ["लंदन", "बर्लिन", "पेरिस", "मैड्रिड"],
      correctAnswer: 2,
      explanation: "पेरिस फ्रांस की राजधानी और सबसे बड़ा शहर है।",
      hint: "एफिल टॉवर के बारे में सोचें।"
    }
  ]
};

export const mockFlashcards = {
  en: [
    {
      id: 1,
      front: "What is Photosynthesis?",
      back: "The process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water."
    },
    {
      id: 2,
      front: "Newton's First Law",
      back: "An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force."
    },
    {
      id: 3,
      front: "Pythagorean Theorem",
      back: "a² + b² = c² where c is the hypotenuse of a right triangle."
    }
  ],
  hi: [
    {
      id: 1,
      front: "प्रकाश संश्लेषण क्या है?",
      back: "वह प्रक्रिया जिसके द्वारा हरे पौधे कार्बन डाइऑक्साइड और पानी से पोषक तत्वों को संश्लेषित करने के लिए सूर्य के प्रकाश का उपयोग करते हैं।"
    },
    {
      id: 2,
      front: "न्यूटन का प्रथम नियम",
      back: "विश्राम में रहने वाली वस्तु विश्राम में ही रहती है और गति में रहने वाली वस्तु गति में ही रहती है जब तक कि कोई बाहरी बल उस पर न लगे।"
    },
    {
      id: 3,
      front: "पाइथागोरस प्रमेय",
      back: "a² + b² = c² जहाँ c समकोण त्रिभुज का कर्ण है।"
    }
  ]
};

export const mockStudentData = [
  {
    id: 1,
    name: "Rahul Sharma",
    progress: 78,
    lastActive: "2 hours ago",
    score: 85,
    weakTopics: ["Algebra", "Geometry"],
    strongTopics: ["Arithmetic", "Statistics"]
  },
  {
    id: 2,
    name: "Priya Patel",
    progress: 92,
    lastActive: "30 minutes ago",
    score: 94,
    weakTopics: ["Trigonometry"],
    strongTopics: ["Algebra", "Calculus", "Geometry"]
  },
  {
    id: 3,
    name: "Amit Kumar",
    progress: 65,
    lastActive: "1 day ago",
    score: 72,
    weakTopics: ["Calculus", "Statistics"],
    strongTopics: ["Algebra"]
  },
  {
    id: 4,
    name: "Sneha Reddy",
    progress: 88,
    lastActive: "5 hours ago",
    score: 89,
    weakTopics: ["Geometry"],
    strongTopics: ["Algebra", "Arithmetic", "Trigonometry"]
  }
];

export const mockHeatmapData = [
  { topic: "Algebra", mastery: 85 },
  { topic: "Geometry", mastery: 62 },
  { topic: "Trigonometry", mastery: 74 },
  { topic: "Calculus", mastery: 58 },
  { topic: "Statistics", mastery: 81 },
  { topic: "Arithmetic", mastery: 92 },
];

export const mockInterventions = {
  en: [
    {
      id: 1,
      title: "Focus on Calculus Fundamentals",
      description: "3 students struggling with derivatives. Suggest review session.",
      priority: "high",
      students: ["Amit Kumar", "Rohit Singh", "Neha Gupta"]
    },
    {
      id: 2,
      title: "Geometry Practice Needed",
      description: "Multiple students showing weakness in geometry concepts.",
      priority: "medium",
      students: ["Rahul Sharma", "Sneha Reddy"]
    },
    {
      id: 3,
      title: "Advanced Algebra Challenge",
      description: "Top performers ready for advanced problems.",
      priority: "low",
      students: ["Priya Patel", "Arjun Mehta"]
    }
  ],
  hi: [
    {
      id: 1,
      title: "कैलकुलस की बुनियादी बातों पर ध्यान दें",
      description: "3 छात्र व्युत्पन्न के साथ संघर्ष कर रहे हैं। समीक्षा सत्र का सुझाव दें।",
      priority: "high",
      students: ["अमित कुमार", "रोहित सिंह", "नेहा गुप्ता"]
    },
    {
      id: 2,
      title: "ज्यामिति अभ्यास की आवश्यकता",
      description: "कई छात्र ज्यामिति अवधारणाओं में कमजोरी दिखा रहे हैं।",
      priority: "medium",
      students: ["राहुल शर्मा", "स्नेहा रेड्डी"]
    },
    {
      id: 3,
      title: "उन्नत बीजगणित चुनौती",
      description: "शीर्ष प्रदर्शनकर्ता उन्नत समस्याओं के लिए तैयार हैं।",
      priority: "low",
      students: ["प्रिया पटेल", "अर्जुन मेहता"]
    }
  ]
};

export const mockStudyPlan = {
  en: [
    {
      id: 1,
      title: "Complete Algebra Chapter 5",
      dueDate: "Tomorrow",
      status: "in-progress",
      progress: 60
    },
    {
      id: 2,
      title: "Review Trigonometry Formulas",
      dueDate: "In 3 days",
      status: "pending",
      progress: 0
    },
    {
      id: 3,
      title: "Practice 20 Calculus Problems",
      dueDate: "This week",
      status: "pending",
      progress: 0
    }
  ],
  hi: [
    {
      id: 1,
      title: "बीजगणित अध्याय 5 पूरा करें",
      dueDate: "कल",
      status: "in-progress",
      progress: 60
    },
    {
      id: 2,
      title: "त्रिकोणमिति सूत्रों की समीक्षा करें",
      dueDate: "3 दिनों में",
      status: "pending",
      progress: 0
    },
    {
      id: 3,
      title: "20 कैलकुलस समस्याओं का अभ्यास करें",
      dueDate: "इस सप्ताह",
      status: "pending",
      progress: 0
    }
  ]
};

export const mockDocChatMessages = {
  en: [
    {
      id: 1,
      sender: "user",
      message: "What is the main topic of this document?"
    },
    {
      id: 2,
      sender: "ai",
      message: "Based on the document, the main topic is Machine Learning fundamentals, specifically covering supervised and unsupervised learning algorithms.",
      references: ["Page 1, Paragraph 2"]
    }
  ],
  hi: [
    {
      id: 1,
      sender: "user",
      message: "इस दस्तावेज़ का मुख्य विषय क्या है?"
    },
    {
      id: 2,
      sender: "ai",
      message: "दस्तावेज़ के आधार पर, मुख्य विषय मशीन लर्निंग की बुनियादी बातें हैं, विशेष रूप से पर्यवेक्षित और गैर-पर्यवेक्षित शिक्षण एल्गोरिदम को कवर करती हैं।",
      references: ["पृष्ठ 1, पैराग्राफ 2"]
    }
  ]
};

// Stub functions for AI integration
export const fetchAIResponse = async (message) => {
  // Placeholder for AI chat integration
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        message: "This is a placeholder AI response. Backend integration required.",
        timestamp: new Date().toISOString()
      });
    }, 1000);
  });
};

export const generateFlashcards = async (topic, language = 'en') => {
  // Placeholder for flashcard generation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockFlashcards[language]);
    }, 1500);
  });
};

export const uploadDocument = async (file) => {
  // Placeholder for document upload
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        documentId: "doc_" + Date.now(),
        fileName: file.name,
        pageCount: 10
      });
    }, 2000);
  });
};

export const getProgressData = async (studentId) => {
  // Placeholder for fetching student progress
  return new Promise((resolve) => {
    setTimeout(() => {
      const student = mockStudentData.find(s => s.id === studentId) || mockStudentData[0];
      resolve(student);
    }, 800);
  });
};

export const evaluateAnswer = async (questionId, answer) => {
  // Placeholder for answer evaluation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        correct: Math.random() > 0.5,
        explanation: "This is a placeholder explanation.",
        nextQuestion: Math.floor(Math.random() * 3) + 1
      });
    }, 1000);
  });
};

export const generateAdaptiveQuiz = async (level, topic) => {
  // Placeholder for adaptive quiz generation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockQuizQuestions);
    }, 1200);
  });
};
