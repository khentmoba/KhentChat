# KhentChat

KhentChat is an AI-powered chat application built with Next.js and the AI SDK.

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat interfaces
  - Supports multiple AI providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com)
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for chat history
  - [Vercel Blob](https://vercel.com/storage/blob) for file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and configure your environment variables
3. Install dependencies:

```bash
pnpm install
```

4. Set up the database:

```bash
pnpm db:migrate
```

5. Start the development server:

```bash
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for required environment variables:

- `AUTH_SECRET` - Secret for authentication
- `AI_GATEWAY_API_KEY` - API key for AI providers
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `POSTGRES_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

## License

MIT
