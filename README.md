# MindSprint

A gamified skill assessment app for Grades 1-2 students, built with Angular, Tailwind CSS, and a Node.js backend (coming soon).

## 🎮 Features

- **Interactive Assessments**: Math, English, and Science assessments with engaging questions
- **Gamification**: XP system, levels, and progress tracking
- **Mobile-First Design**: Responsive layout optimized for tablets and mobile devices
- **Custom Components**:
  - AvatarSelector - Choose fun avatars
  - QuestionCard - Interactive multiple-choice questions
  - TimerBar - Visual countdown timer
  - XPProgress - Level and XP tracking
  - ParentReport - Comprehensive progress reports

## 🎨 Design System

- **Primary Color**: #4A90E2 (Blue)
- **Accent Color**: #F5A623 (Orange)
- **Background**: #F9FAFB (Light Gray)
- **Text**: #333333 (Dark Gray)

## 📁 Project Structure

```
MindSprint/
├── mindsprint-frontend/          # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/            # Page components
│   │   │   │   ├── welcome/
│   │   │   │   ├── assessment-math/
│   │   │   │   ├── assessment-english/
│   │   │   │   ├── assessment-science/
│   │   │   │   └── results/
│   │   │   ├── components/       # Reusable components
│   │   │   │   ├── avatar-selector/
│   │   │   │   ├── question-card/
│   │   │   │   ├── timer-bar/
│   │   │   │   ├── xp-progress/
│   │   │   │   └── parent-report/
│   │   │   ├── app.routes.ts     # Routing configuration
│   │   │   └── app.ts            # Root component
│   │   └── styles.css            # Global styles with Tailwind
│   ├── tailwind.config.js        # Tailwind configuration
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sjainlabs/MindSprint.git
   cd MindSprint
   ```

2. Install dependencies:
   ```bash
   cd mindsprint-frontend
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:4200`

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 🗺️ Routes

- `/welcome` - Welcome page with app introduction
- `/assessment/math` - Math assessment
- `/assessment/english` - English assessment
- `/assessment/science` - Science assessment
- `/results` - Results page with parent report

## 🛠️ Technology Stack

- **Frontend Framework**: Angular 21.x (Standalone Components)
- **Styling**: Tailwind CSS 3.x
- **Language**: TypeScript
- **Build Tool**: Angular CLI with esbuild
- **Package Manager**: npm

## 📱 Mobile-First Approach

The application is designed with a mobile-first approach using Tailwind's responsive utilities:
- Base styles target mobile devices
- `md:` breakpoint (768px+) for tablet and desktop enhancements
- Optimized touch targets and spacing for young learners

## 🎯 Future Enhancements

- Backend API with Node.js + Express
- Supabase integration for authentication and data persistence
- Phaser.js game integration
- Real-time progress tracking
- Parent dashboard
- Multiple student profiles

## 📄 License

MIT

## 👥 Contributors

MindSprint Team
