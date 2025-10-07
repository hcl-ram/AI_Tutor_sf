# Shepherd AI Learning Platform

A full-featured React frontend replicating Shepherd.study's design with bilingual support (English/Hindi) and advanced AI learning system features.

## 🎨 Features

### Core Pages
1. **Home Page** - Clean landing with role selection (Student/Teacher)
2. **Student Page** - Stepwise learning flow with adaptive quizzes
3. **Teacher Page** - Comprehensive dashboard with analytics
4. **AI Tutor** - Flashcards, quizzes, note editor, and study plans
5. **Doc Chat** - Document upload and AI-powered chat interface
6. **Behind the Scenes** - AI agent orchestration visualization

### Key Features
- ✅ **Bilingual Support**: Full English and Hindi translations
- ✅ **Smooth Animations**: Framer Motion transitions throughout
- ✅ **Responsive Design**: Mobile, tablet, and desktop optimized
- ✅ **Beautiful UI**: Gradient backgrounds, smooth shadows, elegant cards
- ✅ **Mock Data**: Complete sample data for all features
- ✅ **AI Integration Stubs**: Ready for backend connection

## 📦 Tech Stack

- **React 18** - UI library (using create-react-app)
- **React Router 6** - Navigation
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Analytics visualizations
- **React Flow** - Agent orchestration diagrams
- **Zustand** - State management
- **Lucide React** - Icons

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or navigate to the project directory:
```bash
cd C:\Users\Administrator\Desktop\frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from create-react-app (one-way operation)

## 📁 Project Structure

```
src/
├── pages/              # Main page components
│   ├── Home.jsx       # Landing page with role selection
│   ├── Student.jsx    # Student learning flow
│   ├── Teacher.jsx    # Teacher dashboard
│   ├── AITutor.jsx    # AI tutor tools
│   ├── DocChat.jsx    # Document chat interface
│   └── Agents.jsx     # AI agent visualization
│
├── components/         # Reusable components
│   ├── Navbar.jsx     # Navigation with language toggle
│   ├── RoleCard.jsx   # Animated role selection cards
│   ├── QuizCard.jsx   # Interactive quiz questions
│   ├── Flashcard.jsx  # Flippable flashcards
│   ├── ProgressBar.jsx # Progress indicators
│   └── FloatingHelp.jsx # Help chat bubble
│
├── hooks/
│   └── useAppState.js # Zustand global state
│
├── utils/
│   ├── translations.js # Bilingual content
│   └── mockData.js    # Sample data & API stubs
│
├── App.jsx            # Main app with routing
├── index.js           # Entry point
└── index.css          # Global styles

public/
└── index.html         # HTML template
```

## 🎯 Page Features

### Home Page
- Hero section with animated gradient text
- Role selection cards (Student/Teacher)
- Feature highlights
- Smooth entrance animations

### Student Page
**Step 1: Selection**
- Class selection (6-12)
- Subject selection
- Continue to quiz

**Step 2: Diagnostic Quiz**
- Multiple choice questions
- Bilingual questions/explanations
- Real-time scoring
- Progress indicator

**Step 3: Adaptive Practice**
- Score summary
- Personalized recommendations
- Retry with hints option
- Learning path visualization

### Teacher Page
**Tabs:**
1. **Overview** - Stats cards, recent activity
2. **Students** - Table with progress bars, scores
3. **Concept Heatmap** - Color-coded mastery chart
4. **Interventions** - AI-generated recommendations

### AI Tutor Page
**Tabs:**
1. **Flashcards** - Flippable cards with navigation
2. **Adaptive Quiz** - Start quiz interface
3. **Note Editor** - Notion-style rich text editor
4. **Study Plan** - Task cards with progress

### Doc Chat Page
- Drag & drop PDF upload
- Split layout: Document viewer + Chat
- Animated message bubbles
- Reference citations
- Change document option

### Agents Page
- React Flow interactive diagram
- 4 AI agents: Tutor, Evaluator, Content, Teacher
- Hover tooltips with descriptions
- Animated connections
- How It Works section

## 🌐 Bilingual Support

Toggle between English and Hindi using the globe button in the navbar.

**Supported:**
- All UI labels and text
- Navigation menu
- Page headings
- Instructions
- Mock data (questions, flashcards, etc.)
- Error messages

## 🎨 Design System

### Colors
- **Primary**: Blue gradient (#0ea5e9 → #0284c7)
- **Secondary**: Purple gradient (#d946ef → #c026d3)
- **Accent**: Orange gradient (#f97316 → #ea580c)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#fbbf24)
- **Error**: Red (#ef4444)

### Typography
- **Display**: Poppins (headings)
- **Body**: Inter (content)

### Components
- Cards with shadow-soft
- Gradient buttons with hover effects
- Rounded corners (rounded-xl, rounded-2xl)
- Smooth transitions (200-300ms)

## 🔌 API Integration Points

### Stub Functions (in `utils/mockData.js`)

```javascript
// Ready for backend integration
fetchAIResponse(message)
generateFlashcards(topic, language)
uploadDocument(file)
getProgressData(studentId)
evaluateAnswer(questionId, answer)
generateAdaptiveQuiz(level, topic)
```

All functions return promises with mock data. Replace implementations with actual API calls.

## 📊 State Management

Using Zustand for global state:

```javascript
// Language toggle
language // 'en' or 'hi'
toggleLanguage()

// User role
userRole // 'student' or 'teacher'
setUserRole(role)

// Student progress
studentProgress
updateStudentProgress(updates)

// Document state
uploadedDocument
setUploadedDocument(doc)

// Chat messages
chatMessages
addChatMessage(message)
clearChatMessages()
```

## 🎭 Animations

### Framer Motion Usage
- Page transitions (fade, slide)
- Card hover effects (scale, lift)
- Button interactions (tap, hover)
- Progress bar fills
- Floating gradient blobs
- Message bubbles (enter/exit)

### CSS Animations
- Pulse (loading states)
- Float (background blobs)
- Shimmer (skeleton loaders)
- Fade-in
- Slide-up

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Responsive Features
- Mobile-friendly navigation menu
- Flexible grid layouts
- Stacked cards on mobile
- Touch-friendly buttons
- Scrollable content areas

## 🛠 Customization

### Adding a New Page

1. Create page in `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`:
```jsx
<Route path="/new-page" element={<NewPage />} />
```
3. Add navigation link in `src/components/Navbar.jsx`
4. Add translations in `src/utils/translations.js`

### Adding Bilingual Content

In `src/utils/translations.js`:
```javascript
export const translations = {
  en: {
    newKey: 'English text'
  },
  hi: {
    newKey: 'हिंदी पाठ'
  }
};
```

Usage:
```javascript
const t = useTranslation(language);
<h1>{t('newKey')}</h1>
```

## 🐛 Troubleshooting

### Common Issues

**App doesn't start:**
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

**Styling issues:**
```bash
npm install -D tailwindcss postcss autoprefixer
```

**React Flow not displaying:**
- Check that parent container has explicit height
- Ensure `reactflow/dist/style.css` is imported

## 🚧 Future Enhancements

- [ ] Connect to backend API
- [ ] Real-time AI responses
- [ ] PDF parsing and rendering
- [ ] Rich text editor with formatting
- [ ] User authentication
- [ ] Data persistence
- [ ] WebSocket for real-time updates
- [ ] Push notifications
- [ ] Offline mode
- [ ] Performance optimizations

## 📄 License

This project is created for demonstration purposes.

## 👥 Contributing

This is a frontend demonstration project. For production use:
1. Replace mock data with real API calls
2. Add authentication and authorization
3. Implement proper error handling
4. Add comprehensive testing
5. Optimize bundle size
6. Set up CI/CD pipeline

## 🙏 Acknowledgments

- Design inspired by [Shepherd.study](https://www.shepherd.study/)
- Icons by [Lucide](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)

---

**Built with ❤️ using React & TailwindCSS**
