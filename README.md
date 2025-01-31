# AI Chat Application

A modern chat application built with Next.js that leverages Hugging Face's models for intelligent conversations, featuring a flexible tool system for enhanced capabilities.

## Features

- 🤖 Integration with Hugging Face models
- 🛠️ Extensible tool system for enhanced AI capabilities
- 🔍 Built-in web search functionality
- 🌐 URL content fetching
- 💬 Support for multi-turn conversations
- ⚙️ Configurable model parameters
- 🎨 Modern UI with Geist UI components
- 🔄 Real-time streaming responses

## Tech Stack

- **Framework**: Next.js 15.1.6
- **Language**: TypeScript
- **UI Components**: 
  - Geist UI
  - Radix UI
  - Tailwind CSS
- **AI/ML**: 
  - Hugging Face Models
  - LangChain
- **Development Tools**:
  - ESLint
  - Prettier
  - TypeScript
  - TailwindCSS

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- A Hugging Face API key

### Environment Setup

1. Clone the repository
2. Create a `.env` file in the root directory with:
   ```
   HUGGINGFACE_API_KEY=your_api_key_here
   ```

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

The application will start in development mode with Turbopack enabled.

### Production Build

```bash
pnpm run build
pnpm start
```

## Architecture

### Core Components

1. **Chat Model (`custom-chat-model.ts`)**
   - Custom implementation of LangChain's BaseChatModel
   - Handles message formatting and tool integration
   - Supports streaming responses

2. **Tool System (`tools/base-tool.ts`)**
   - Abstract base class for all tools
   - Built-in parameter validation using Zod
   - Error handling and result formatting

3. **API Routes**
   - `/api/chat`: Handles chat interactions and tool execution
   - `/api/models`: Manages available model configurations

### Available Tools

- **Search Tool**: Enables web search capabilities
- **URL Fetch Tool**: Allows fetching and processing content from URLs

## Configuration

Model configurations are stored in `config/models.json` and include:
- Model ID and name
- Description and features
- Temperature and token settings
- Tool support configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is proprietary and confidential.
