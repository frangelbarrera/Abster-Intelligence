# Contributing to Abster Intelligence

First off, thanks for taking the time to contribute! 🛡️

## How Can I Contribute?

### Report Bugs
- Open an issue using the **Bug Report** template
- Include: OS, browser, steps to reproduce, expected vs actual behavior
- Check existing issues before opening a new one

### Suggest Features
- Open an issue describing the feature and why it's useful for OSINT investigators
- Include mockups or examples if possible

### Submit Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run `npm run build` to verify nothing breaks
5. Commit with clear messages
6. Open a Pull Request against `main`

## Development Setup

```bash
git clone https://github.com/frangelbarrera/Abster-Intelligence.git
cd Abster-Intelligence
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Code Style

- **TypeScript**: Strict mode enabled — avoid `any` types
- **Components**: Keep files under 300 lines. Extract hooks and utilities when a component grows too large
- **Styling**: Use Tailwind CSS classes. Avoid inline `style={{}}` objects
- **State**: Use the Zustand store (`src/store/absterStore.ts`) for shared state
- **Commits**: Use clear, descriptive messages in English

## Project Structure

```
src/
├── ai/ # AI/LLM integration flows
├── app/ # Next.js App Router pages and API routes
├── components/ # React components (UI, features)
├── data/ # Static data (OSINT tools catalog)
├── hooks/ # Custom React hooks
├── lib/ # Utilities, DB, security helpers
└── store/ # Zustand state management
```

## Security Guidelines

- **Never commit API keys, secrets, or credentials**
- All API keys are user-provided (BYOK model) and stored locally in the browser
- Report security vulnerabilities via GitHub's private vulnerability reporting, not public issues

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0.
