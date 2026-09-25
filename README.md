# JEV Studio

English | [中文](./README-zh.md)

JEV Studio is a small Next.js evaluation lab for turning natural-language input into structured signals with the Typesafe SystemOne API.

It provides three evaluation modes:

- **Noul** — binary signal detection
- **Choice** — multi-class routing with custom options
- **Score** — ordinal scoring with custom levels

The background is shared across all three tabs, while each tab keeps its own question. Drafts, including the current mode, questions, criteria, API key, and language preference, are stored in the current browser with `localStorage`.

## Preview

English interface:

![JEV Studio in English](./public/sample/image-en.png)

Chinese interface:

![JEV Studio in Chinese](./public/sample/image-zh.png)

Example result:

![JEV Studio result](./public/sample/result.png)

## Requirements

- Node.js 20.9 or later
- pnpm 11 (recommended; npm also works)
- A Typesafe API key

## Getting started

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set your key in `.env`:

```env
TYPESAFE_API_KEY=your_typesafe_api_key
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

If `TYPESAFE_API_KEY` is not configured on the server, the UI displays a field for entering a key. That key is sent only for the current request and is saved in the current browser as part of the local draft.

## Usage

1. Select **Noul**, **Choice**, or **Score**.
2. Enter the shared background text.
3. Enter the question for the selected tab.
4. For **Choice**, add at least two key/description options.
5. For **Score**, add at least two scoring levels.
6. Click **Run evaluation** to send the request.
7. Review the structured answer, confidence, probabilities, token usage, and raw JSON response.

Use the language toggle in the top-right corner to switch between English and Chinese.

## API route

The browser calls the local route below rather than calling Typesafe directly:

```text
POST /api/systemone
```

The route validates the shared `state` and `questions` fields, adds the server-side API key, and forwards the request to:

```text
https://api.typesafe.ai/v1/systemone
```

The API key is never hard-coded in the client bundle when it is configured through `.env`.

## Scripts

```bash
pnpm dev       # Start the development server
pnpm lint      # Run ESLint
pnpm build     # Create a production build
pnpm start     # Start the production server
```

## Project structure

```text
app/
  api/systemone/route.ts  # Typesafe API proxy
  globals.css             # Global styling and responsive layout
  layout.tsx              # Root metadata and layout
  page.tsx                # Interactive evaluation workspace
public/sample/            # README preview images
.env.example              # Environment variable template
```

## License

This project is private and intended for demonstration and internal development.
