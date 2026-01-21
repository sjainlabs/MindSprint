# MindSprint

MindSprint is a gamified skill assessment app for kids, built with Angular and Tailwind CSS. It provides an engaging and interactive way for children to test their knowledge in Math, English, and Science.

## 🎨 Design

### Color Scheme
- **Primary**: #4A90E2 (Blue) - Used for main UI elements and buttons
- **Accent**: #F5A623 (Orange) - Used for highlights and CTAs
- **Background**: #F9FAFB (Light Gray) - Used for app background
- **Text**: #333333 (Dark Gray) - Used for text content

### Mobile-First Layout
The app is designed with a mobile-first approach, ensuring excellent user experience on smartphones and tablets while scaling beautifully to larger screens.

## 📱 Features

### Pages
- **Welcome Page** (`/welcome`) - Main landing page with avatar selection and assessment options
- **Math Assessment** (`/assessment/math`) - Math skill evaluation
- **English Assessment** (`/assessment/english`) - English language assessment
- **Science Assessment** (`/assessment/science`) - Science knowledge test
- **Results Page** (`/results`) - Comprehensive results display with achievements

### Components
- **AvatarSelector** - Allows kids to choose their character avatar
- **QuestionCard** - Interactive question display with multiple choice options
- **TimerBar** - Visual countdown timer for each question
- **XPProgress** - Experience points progress bar showing level and XP
- **ParentReport** - Modal dialog with detailed progress reports for parents

## 🚀 Tech Stack

### Frontend
- **Angular 21.x** - Modern web application framework
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **Phaser.js** - Game framework (ready for integration)

### Backend (Ready for Integration)
- **Node.js + Express** - Backend API (to be implemented)
- **Supabase** - Database and authentication (to be configured)

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🎮 Usage

1. Open the app and select your avatar
2. Choose an assessment (Math, English, or Science)
3. Answer questions within the time limit
4. View your results and achievements
5. Parents can check detailed progress reports

## 🏗️ Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── avatar-selector/
│   │   ├── question-card/
│   │   ├── timer-bar/
│   │   ├── xp-progress/
│   │   └── parent-report/
│   ├── pages/              # Route pages
│   │   ├── welcome/
│   │   ├── assessment-math/
│   │   ├── assessment-english/
│   │   ├── assessment-science/
│   │   └── results/
│   ├── app.routes.ts       # Application routing
│   └── app.ts              # Root component
├── styles.css              # Global styles with Tailwind
└── index.html              # Main HTML file
```

## 🎯 Gamification Features

- **XP System**: Earn experience points for completing assessments
- **Level Progression**: Progress through levels as you earn XP
- **Achievements**: Unlock badges for various accomplishments
- **Avatar System**: Personalize your learning experience
- **Visual Feedback**: Engaging animations and progress indicators

## 📊 Parent Dashboard

Parents can access detailed reports including:
- Overall progress across all subjects
- Recent activity and completion history
- Strengths and areas for improvement
- Performance trends over time

## 🔮 Future Enhancements

- [ ] Backend API integration with Node.js/Express
- [ ] Supabase database setup for user data persistence
- [ ] Phaser.js mini-games integration
- [ ] Real-time multiplayer assessments
- [ ] Advanced analytics and reporting
- [ ] Adaptive difficulty based on performance
- [ ] More subject areas and question types

## 📝 License

MIT License - feel free to use this project for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for young learners everywhere.
