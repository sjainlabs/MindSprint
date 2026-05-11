# MindSprint

MindSprint is a gamified skill assessment app for kids, built with Angular and Tailwind CSS. It provides an engaging and interactive way for children to test their knowledge in Math, English, and Science — powered by the **Super-Syllabus**: a unified K–12 curriculum framework combining Kumon-style fluency, Mathnasium conceptual mastery, NWEA MAP alignment, reasoning & logic, and competition math.

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
- **Topic Browser** (`/topics`) - K–12 Super-Syllabus browser with Exploration Mode
- **MAP Prep Mode** (`/map-prep`) - RIT band practice, MAP growth projection, adaptive skill report
- **Student Profile** (`/profile`) - Fluency, Mastery, Reasoning, MAP RIT, Competition level scores
- **Game Mode** (`/game`) - 8 game modes including Super-Syllabus modes

### Components
- **AvatarSelector** - Allows kids to choose their character avatar
- **QuestionCard** - Interactive question display with multiple choice options
- **TimerBar** - Visual countdown timer for each question
- **XPProgress** - Experience points progress bar showing level and XP
- **ParentReport** - Modal dialog with detailed progress reports for parents

## 🌐 Super-Syllabus

The Super-Syllabus unifies 7 curriculum domains into a single K–12 framework:

| Domain | Description | Examples |
|---|---|---|
| ⚡ **Fluency & Speed** | Automatic recall and computation | Abacus Flash, Fluency Speed |
| 🧩 **Conceptual Mastery** | Deep number sense and algebra understanding | Fractions, Algebra, Geometry |
| 🔍 **Reasoning & Logic** | Multi-step problem solving and patterns | Reasoning Puzzle mode |
| 📊 **MAP Skills (RIT Bands)** | NWEA MAP-aligned skills by RIT band | MAP Prep Mode, MAP Challenge |
| 🏆 **Competition Math** | AMC-8, AMC-10, MATHCOUNTS, AIME | Competition Boss mode |
| 🔀 **Adaptive Pathways** | Personalized next-step recommendations | Topic Browser + Exploration |
| 🎮 **Gamified Mastery** | XP, badges, boss battles, daily quests | Game Module |

### Powered Features

- **Topic Browser** — Browse by domain, RIT band, reasoning level, or competition difficulty
- **MAP Prep Mode** — RIT band selector, adaptive practice, skill report, growth projection
- **Game Module** — 4 core modes + 4 Super-Syllabus modes (Fluency Speed, Reasoning Puzzle, MAP Challenge, Competition Boss)
- **Student Profile** — Fluency score, Conceptual mastery score, Reasoning score, MAP RIT estimate, Competition math level
- **Exploration Mode** — Adaptive topic recommendations with multi-dimension filtering

### API Services (`SyllabusService`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/syllabus` | GET | Full Super-Syllabus |
| `/api/syllabus/:domainId` | GET | Skills for a specific domain |
| `/api/syllabus/rit/:band` | GET | Skills for a RIT band |
| `/api/syllabus/skill/:skillId` | GET | Single skill detail |
| `/api/syllabus/map-projection` | GET | MAP RIT growth projection |

## 🚀 Tech Stack

### Frontend
- **Angular 21.x** - Modern web application framework
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **Phaser.js** - Game framework (ready for integration)

### Backend (Phase 1 MVP)
- **Node.js + Express + SQLite** backend scaffold now lives in `/backend`
- JSON-driven syllabus/templates are in `backend/src/utils`
- Diagnostic + worksheet APIs:
  - `GET /api/diagnostic/start`
  - `POST /api/diagnostic/submit`
  - `GET /api/practice/:level`
  - `POST /api/practice/worksheet`

## 📦 Installation & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# (Optional) Start backend API server
cd backend
npm install
npm run start

# Build for production
npm run build

# Run tests
npm test
```

### GitHub Pages Deployment

This app is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

**Setup Steps:**
1. Ensure GitHub Pages is enabled in your repository settings
2. Set the source to "GitHub Actions"
3. Push to the `main` branch to trigger deployment
4. Your app will be available at: `https://sjainlabs.github.io/MindSprint/`

The deployment workflow is configured in `.github/workflows/deploy-pages.yml`.

## 🎮 Usage

1. Open the app and select your avatar
2. Choose an assessment (Math, English, or Science)
3. Answer questions within the time limit
4. View your results and achievements
5. Explore topics in the Topic Browser with Super-Syllabus categories
6. Practice MAP skills in MAP Prep Mode
7. Play gamified challenges in Game Mode
8. Track all scores in Student Profile
9. Parents can check detailed progress reports

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
│   │   ├── results/
│   │   ├── topic-browser/   # Super-Syllabus browser + Exploration Mode
│   │   ├── map-prep/        # MAP Prep Mode (NEW)
│   │   ├── student-profile/ # Super-Syllabus score profile (NEW)
│   │   └── game-mode/       # 8-mode game hub
│   ├── services/
│   │   ├── syllabus.service.ts  # Super-Syllabus API (NEW)
│   │   ├── topic.service.ts
│   │   ├── game.service.ts
│   │   └── student-intelligence.service.ts
│   ├── app.routes.ts       # Application routing
│   └── app.ts              # Root component
├── styles.css              # Global styles with Tailwind
└── index.html              # Main HTML file
```

**Note:** The repository previously had a duplicate `mindsprint-frontend/` folder which has been removed to maintain a clean structure.

## 🎯 Gamification Features

- **XP System**: Earn experience points for completing assessments and game challenges
- **Level Progression**: Progress through levels as you earn XP
- **Achievements**: Unlock badges for various accomplishments (including Super-Syllabus mode badges)
- **Avatar System**: Personalize your learning experience
- **Visual Feedback**: Engaging animations and progress indicators
- **Daily Quests**: Complete daily objectives for bonus XP
- **Boss Battles**: Challenge bosses in Boss Battle and Competition Boss modes

## 📊 Parent Dashboard

Parents can access detailed reports including:
- Overall progress across all subjects
- Recent activity and completion history
- Strengths and areas for improvement
- Performance trends over time

## 🔮 Future Enhancements

- [ ] Create separate backend repository (recommended approach)
- [ ] Backend API integration with Node.js/Express
- [ ] Supabase database setup for user data persistence
- [ ] Phaser.js mini-games integration
- [ ] Real-time multiplayer assessments
- [ ] Advanced analytics and reporting
- [ ] Adaptive difficulty based on performance
- [ ] More subject areas and question types
- [ ] Full Super-Syllabus backend implementation (`/api/syllabus/*`)
- [ ] MAP RIT growth tracking over time
- [ ] Competition math tournament mode

## 📝 License

MIT License - feel free to use this project for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for young learners everywhere.
