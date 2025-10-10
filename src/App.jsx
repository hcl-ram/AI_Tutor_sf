import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import FloatingHelp from './components/FloatingHelp';
import Home from './pages/Home';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import AITutor from './pages/AITutor';
import DocChat from './pages/DocChat';
import Agents from './pages/Agents';

function App() {
  return (
    <Router>
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="fixed inset-0 -z-10">
          <div className="gradient-blob w-96 h-96 bg-primary-300 top-0 left-0 animate-float" />
          <div className="gradient-blob w-80 h-80 bg-secondary-300 top-1/4 right-0 animate-float-delayed" />
          <div className="gradient-blob w-72 h-72 bg-accent-300 bottom-0 left-1/3 animate-float" />
        </div>

        <Navbar />
        
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/student" element={<PrivateRoute role="student"><Student /></PrivateRoute>} />
            <Route path="/student/login" element={<Student />} />
            <Route path="/student/signup" element={<Student />} />
            <Route path="/teacher" element={<PrivateRoute role="teacher"><Teacher /></PrivateRoute>} />
            <Route path="/teacher/login" element={<Teacher />} />
            <Route path="/teacher/signup" element={<Teacher />} />
            <Route path="/ai-tutor" element={<AITutor />} />
            <Route path="/doc-chat" element={<DocChat />} />
            <Route path="/agents" element={<Agents />} />
          </Routes>
        </AnimatePresence>

        <FloatingHelp />
      </div>
    </Router>
  );
}

export default App;
