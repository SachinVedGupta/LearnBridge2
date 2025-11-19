# Sim AI Chat Interface

A beautiful, modern chat interface for the Sim AI API built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern, aesthetic UI with gradient backgrounds and smooth animations
- 💬 Real-time chat interface with message history
- 🤖 Integration with Sim AI API
- ⚡ Fast and responsive
- 🌈 Beautiful dark theme with custom scrollbar
- 📱 Mobile-friendly design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:

```bash
cd sim-ai-chat
```

2. Install dependencies:

```bash
npm install
```

3. **Set up your API key** (if needed):

Create a `.env.local` file in the root directory:

```bash
# For development, you can use 'dev' or your actual API key
SIM_AI_API_KEY=dev
```

Or use your actual Sim AI API key if the 'dev' key doesn't work.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
sim-ai-chat/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts       # API endpoint for Sim AI integration
│   ├── components/
│   │   ├── ChatMessage.tsx    # Individual chat message component
│   │   ├── Header.tsx         # Chat header component
│   │   └── InputArea.tsx      # Message input area component
│   ├── globals.css            # Global styles and Tailwind imports
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main chat page
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## API Configuration

The chat interface is configured to use the Sim AI API endpoint:

- Endpoint: `https://www.sim.ai/api/workflows/7ee65689-7400-4c22-9df9-bb67fac7561f/execute`
- API Key: Set via `SIM_AI_API_KEY` environment variable (defaults to 'dev')

### Setting Your API Key

You can set your API key using one of these methods:

1. **Environment Variable** (Recommended): Create a `.env.local` file:

```bash
SIM_AI_API_KEY=your_actual_api_key
```

2. **Direct modification**: Edit the `app/api/chat/route.ts` file and replace the API key.

### Troubleshooting API Errors

If you see "Unauthorized: Invalid API key" errors:

1. Check that your API key is correct
2. Make sure the API key has proper permissions for the workflow
3. Verify the endpoint URL is correct

## Usage

1. Start the development server
2. Type a message in the input field
3. Press Enter or click the Send button
4. Wait for the AI response
5. Continue the conversation

## Technologies Used

- **Next.js 15** - React framework for production
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React** - UI library

## License

MIT
