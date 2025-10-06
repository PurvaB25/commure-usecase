# No-Show Prevention System (v0 Prototype)

React + TypeScript application demonstrating AI-powered no-show prediction and proactive patient outreach.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key (with GPT-5 access)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key:
# VITE_OPENAI_API_KEY=sk-...

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Features

### Agent 1: No-Show Risk Scorer
- Generates patient-level risk scores (0-100) based on history, demographics, appointment details
- Identifies primary and secondary risk factors with clear explanations
- Provides risk badges (Low/Medium/High) for quick assessment
- Calculates predicted show probability (0-1)

### Agent 2: Outreach Sequencer
- Designs personalized 3-touchpoint SMS/email outreach campaigns
- Creates 2 message variants per touchpoint with different tones (friendly, urgent, incentive-based)
- Adapts timing and messaging to patient risk level
- Ensures SMS stays under 160 characters
- Includes easy confirmation/reschedule options

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v3
- **AI**: OpenAI GPT-5 (gpt-5-2025-08-07) with function calling
- **Icons**: Lucide React
- **Data**: JSON mocks (matching production schema.sql structure)

## Project Structure

```
/src
  App.tsx                    # Main dashboard layout
  /components
    RiskScorer.tsx           # Agent 1 UI (no-show risk prediction)
    OutreachDesigner.tsx     # Agent 2 UI (campaign generation)
  /data
    mockData.ts              # JSON mock data (providers, patients, appointments, patient history)
  /lib
    openai.ts                # OpenAI client wrapper
    agents.ts                # 2 AI agents (risk scorer, outreach sequencer)
  /types
    schema.ts                # TypeScript types matching production SQL schema
```

## Architecture

**v0 (Current):**
```
React App → OpenAI GPT-5 API (client-side) → Display Results
Data: JSON mocks (mockData.ts)
```

**Production Vision:**
```
React → FastAPI → PostgreSQL (Star Schema)
Data: Fact/Dimension tables with proper audit trails
```

## Demo Flow

1. **Generate Risk** - Click per appointment to get AI-powered no-show risk assessment (~2-3 sec)
   - Shows risk score (0-100), risk badge (Low/Medium/High), primary/secondary risk factors
   - Displays predicted show probability

2. **Design Outreach** - Generate personalized SMS/email campaigns for high-risk patients (~3-4 sec)
   - Creates 3-touchpoint sequence (7 days, 2 days, 1 day before appointment)
   - Generates 2 message variants per touchpoint with different tones
   - Optimizes for patient risk profile

## Important Notes

- **API Key Security**: For v0, the OpenAI API key is used client-side (`dangerouslyAllowBrowser: true`). In production, move all LLM calls to a backend server.
- **Mock Data**: All data is hardcoded in `src/data/mockData.ts`. Includes realistic patient histories with varying no-show rates (0% to 40%) for demo purposes.
- **Schema Design**: The JSON data structure exactly matches `../schema.sql`, demonstrating production-ready data modeling.
- **GPT-5 Specifics**: Uses gpt-5-2025-08-07 model with default temperature (GPT-5 doesn't support custom temperature values).

## Performance

- **Risk Scoring**: ~2-3 seconds per patient (analyzes history, demographics, appointment details)
- **Outreach Design**: ~3-4 seconds (generates 3 touchpoints with 2 variants each = 6 messages total)

All agents use GPT-5 (gpt-5-2025-08-07) with OpenAI function calling for structured, reliable outputs.

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Troubleshooting

**"OpenAI API key not configured"**
- Make sure `.env` file exists with `VITE_OPENAI_API_KEY=sk-...`
- Restart the dev server after adding the key

**"Failed to generate risk score" / API errors**
- Check browser console for detailed error
- Verify API key is valid and has credits at https://platform.openai.com/usage
- Ensure your API key has access to GPT-5 (gpt-5-2025-08-07)
- Check network connectivity

**"Temperature not supported" error**
- This is expected with GPT-5 - the model only supports default temperature
- The codebase has been updated to remove temperature parameters

## Next Steps (Production)

1. **Backend Migration** - Move to FastAPI/Node.js backend for secure API key handling
2. **Database** - Implement PostgreSQL with star schema (see `../schema.sql`)
3. **Authentication** - Add user auth and role-based access control
4. **EHR Integration** - Connect to hospital systems (HL7/FHIR)
5. **Analytics Dashboard** - Track no-show rate reduction, ROI, outreach effectiveness
6. **A/B Testing** - Test message variants to optimize engagement rates
7. **SMS/Email Integration** - Integrate with Twilio (SMS) and SendGrid (email) for automated delivery
