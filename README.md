# EventLinq - AI-Powered Event Networking

EventLinq is an intelligent networking platform that helps event attendees discover meaningful connections through AI-powered matching. Built with Next.js and powered by Sensay AI, it streamlines the process of finding relevant people to meet at conferences, hackathons, and other events.

Organisational_ID: c5599b34-9215-40ac-aea6-eacb9fafc1cd

## 🧬 How the Chatbot Works

The EventLinq chatbot serves as your personal networking assistant, guiding you through a conversational onboarding process to build your profile and find matches:

### Onboarding Flow
1. **Profile Building**: The bot asks for your name, role, company, bio, interests, and goals
2. **Event Scoping**: Automatically detects or asks for the event you're attending
3. **Contact Info**: Optionally collects Telegram and X/Twitter handles for easy connection
4. **Availability**: Captures when you're free to meet during the event

### Intelligent Matching
- **AI-Powered**: Uses Sensay AI for sophisticated matching based on interests, goals, and complementary roles
- **Local Fallback**: Implements Jaccard similarity scoring for interests/goals overlap when Sensay AI is unavailable
- **Event-Scoped**: Only matches you with people attending the same event
- **Smart Filtering**: Considers role complementarity (e.g., founders + engineers, investors + startups)

### Interactive Features
- **Quick Commands**: Update your profile instantly with commands like `set interests: ai, fintech`
- **Event Switching**: Change events with `event:devcon` without re-onboarding
- **Real-time Matching**: Get fresh suggestions by typing `match`
- **Intro Management**: Request, accept, or decline introductions directly in chat

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Sensay AI API access (optional, has local fallback)

### 1. Clone and Install
```bash
git clone <https://github.com/Lynndabel/EventLinq>
cd sensay
npm install
```

### 2. Database Setup
```bash
# Set up Supabase tables
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/schema.sql
```

### 3. Environment Configuration
Create `.env.local` with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sensay AI Configuration
SENSAY_API_URL=https://api.sensay.ai
SENSAY_API_KEY=your-sensay-api-key
SENSAY_ORG_ID=your-organization-id
SENSAY_MATCH_URL=https://api.sensay.ai/match

# App Configuration
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_MIN_MATCH_SCORE=0.15
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🧑‍💻 Sensay API Integration

### Organization ID
Your Sensay API Organization ID should be set as `SENSAY_ORG_ID` in your environment variables. This identifies your organization when making API calls to Sensay's matching service.

### API Endpoints Used
- **Matching**: `POST /match` - Returns AI-generated suggestions based on attendee profiles
- **CV Analysis**: `POST /analyze-cv` - Extracts structured profile data from uploaded CVs (feature disabled in current build)

### Fallback Behavior
If Sensay API is unavailable or not configured, the system automatically falls back to local matching algorithms that use:
- Jaccard similarity for interests and goals overlap
- Role complementarity scoring
- Availability overlap detection
- Company diversity preferences

## 📁 Project Structure

```
src/
├── app/
│   ├── chat/              # Conversational onboarding interface
│   ├── matches/           # Match browsing and intro management
│   ├── api/
│   │   ├── attendees/     # Profile CRUD operations
│   │   ├── match/         # AI matching endpoint
│   │   └── intros/        # Introduction request handling
│   └── components/
│       ├── ChatUI.tsx     # Main chat interface
│       └── site/          # Landing page components
├── lib/
│   ├── match.ts           # Local matching algorithms
│   ├── sensay.ts          # Sensay API integration
│   └── supabaseClient.ts  # Database connection
└── supabase/
    └── schema.sql         # Database schema
```

## 🎯 Use Cases

### For Event Organizers
- **Networking Enhancement**: Increase attendee satisfaction by facilitating meaningful connections
- **Event Analytics**: Track networking activity and popular interests/goals
- **Sponsor Value**: Provide sponsors with networking insights and engagement metrics

### For Attendees
- **Efficient Networking**: Skip random conversations, focus on relevant connections
- **Goal Achievement**: Find people who can help with specific objectives (hiring, fundraising, partnerships)
- **Time Optimization**: Pre-plan meetings with high-potential matches

### For Communities
- **Hackathons**: Team formation based on complementary skills and shared interests
- **Conferences**: Speaker-attendee connections, investor-startup matching
- **Meetups**: Interest-based clustering and follow-up coordination

## 🔧 Customization

### Matching Algorithm Tuning
Adjust weights in `src/lib/match.ts`:
- `tagSim * 0.6`: Interest similarity weight
- `goalSim * 0.3`: Goal similarity weight  
- `availSim * 0.1`: Availability overlap weight

### Minimum Score Threshold
Set `NEXT_PUBLIC_MIN_MATCH_SCORE` to control match quality vs. quantity (default: 0.15)

### Event Scoping
Attendees are automatically scoped to events via URL parameters (`?event=devcon`) or chat commands (`event:devcon`)

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Other Platforms
- **Railway**: `railway up`
- **Netlify**: Configure build command as `npm run build`
- **Docker**: Use included Dockerfile for containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
