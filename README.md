# MuMuAINovel - AI-Powered Novel Writing Assistant

A modern Next.js 16 application for AI-assisted novel writing with multi-provider AI support, character management, and chapter organization.

## 🎯 Features

- **Multi-Provider AI Support**: OpenAI, Anthropic (Claude), and Gemini
- **Project Management**: Create and organize multiple novel projects
- **AI-Assisted Writing**: Generate chapter content and character profiles with AI
- **Character Management**: Track characters with detailed profiles
- **Chapter Organization**: Structure your novel with chapters and synopses
- **Word Count Tracking**: Monitor progress toward writing goals
- **Modern UI**: Built with Next.js 16, React 19, Tailwind CSS, and shadcn/ui

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL database)

### 1. Clone and Install

```bash
cd new-mumuainovel
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://mumuai:mumuai_password@localhost:5432/mumuai_novel?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Local Auth (for development)
LOCAL_AUTH_ENABLED=true
LOCAL_AUTH_USERNAME=admin
LOCAL_AUTH_PASSWORD=admin123
LOCAL_AUTH_DISPLAY_NAME="Admin User"

# AI Providers (configure at least one)
OPENAI_API_KEY="sk-..."
DEFAULT_AI_PROVIDER=openai
DEFAULT_MODEL=gpt-4o-mini

# Optional: Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Optional: LinuxDO OAuth
LINUXDO_CLIENT_ID="your-client-id"
LINUXDO_CLIENT_SECRET="your-client-secret"
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Usage

### First Time Setup

1. **Sign In**: Use the local credentials you configured (default: `admin`/`admin123`)
2. **Create Project**: Click "Create New Project" and fill in project details
3. **Add Characters**: Navigate to Characters and add your cast
4. **Write Chapters**: Create chapters and use AI assistance to generate content

### AI Features

- **Project Outlines**: Generate chapter outlines with AI
- **Character Profiles**: Let AI create detailed character descriptions
- **Chapter Content**: Generate chapter content based on synopsis and context
- **Streaming Responses**: Watch AI generate content in real-time

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (beta)
- **AI**: OpenAI, Anthropic SDKs
- **Testing**: Vitest, Playwright

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication components
│   └── projects/         # Project components
├── lib/                   # Utilities
│   ├── ai/               # AI service abstraction
│   ├── auth.ts           # NextAuth configuration
│   └── db.ts             # Prisma client
├── services/              # Business logic
│   ├── project.service.ts
│   ├── chapter.service.ts
│   ├── character.service.ts
│   └── wizard.service.ts
└── hooks/                 # React hooks
    └── use-ai-stream.ts
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
```

### Database Management

```bash
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma Client
```

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t mumuainovel .
docker run -p 3000:3000 mumuainovel
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes* |
| `ANTHROPIC_API_KEY` | Anthropic API key | No |
| `DEFAULT_AI_PROVIDER` | Default AI provider | Yes |
| `DEFAULT_MODEL` | Default AI model | Yes |

*At least one AI provider key is required

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel](https://vercel.com/)

---

Built with ❤️ using Next.js 16 and AI
