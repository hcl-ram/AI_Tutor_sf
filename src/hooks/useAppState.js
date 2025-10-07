import { create } from 'zustand';

const useAppState = create((set) => ({
  // Language state
  language: 'en', // 'en' or 'hi'
  toggleLanguage: () => set((state) => ({ 
    language: state.language === 'en' ? 'hi' : 'en' 
  })),
  
  // User role
  userRole: null, // 'student' or 'teacher'
  setUserRole: (role) => set({ userRole: role }),
  
  // Student progress
  studentProgress: {
    class: null,
    subject: null,
    quizCompleted: false,
    practiceCompleted: false,
    score: 0,
    masteredTopics: [],
    weakTopics: [],
  },
  updateStudentProgress: (updates) => set((state) => ({
    studentProgress: { ...state.studentProgress, ...updates }
  })),
  
  // Doc Chat state
  uploadedDocument: null,
  setUploadedDocument: (doc) => set({ uploadedDocument: doc }),
  
  // Chat messages for AI Tutor
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  clearChatMessages: () => set({ chatMessages: [] }),
  
  // Flashcards state
  currentFlashcardSet: null,
  setFlashcardSet: (set_data) => set({ currentFlashcardSet: set_data }),
}));

export default useAppState;
