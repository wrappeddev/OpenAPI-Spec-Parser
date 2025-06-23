# Contributing to Universal API Schema Explorer

Thank you for your interest in contributing to the Universal API Schema Explorer! This document provides guidelines and information for contributors to both the CLI and Web UI components.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Modern web browser
- Basic knowledge of TypeScript, React, and Node.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/universal-api-explorer.git
   cd universal-api-explorer
   ```

2. **Install CLI Dependencies**
   ```bash
   npm install
   ```

3. **Install Web UI Dependencies**
   ```bash
   cd web-ui
   npm install
   cd ..
   ```

4. **Start Development**
   ```bash
   # CLI development
   npm run dev

   # Web UI development (from web-ui directory)
   cd web-ui
   npm run dev:full
   ```

5. **Verify Setup**
   - CLI: `npm run cli --help`
   - Frontend: http://localhost:5174
   - Backend: http://localhost:3001

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Strict mode with comprehensive type definitions
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Structured commit messages

### Project Architecture

```
universal-api-explorer/
├── src/                    # CLI source code
│   ├── connectors/         # Protocol-specific connectors
│   ├── core/              # Core functionality
│   ├── utils/             # Utility functions
│   └── cli.ts             # Main CLI entry point
├── web-ui/                # React web interface
│   ├── src/               # Frontend source
│   ├── backend/           # Express.js API server
│   └── public/            # Static assets
├── tests/                 # Test suites
└── docs/                  # Documentation
```

### CLI Development

1. **Connector Development**
   ```typescript
   // src/connectors/new-protocol.ts
   export class NewProtocolConnector implements ProtocolConnector {
     async introspect(url: string, options: IntrospectionOptions): Promise<UniversalSchema> {
       // Implementation
     }
   }
   ```

2. **Adding Commands**
   ```typescript
   // Add to src/cli.ts
   program
     .command('new-command')
     .description('Description of new command')
     .action(async (options) => {
       // Command implementation
     });
   ```

### Web UI Development

1. **Component Structure**
   ```tsx
   interface ComponentProps {
     // Props with proper TypeScript types
   }

   export function Component({ prop }: ComponentProps) {
     return (
       <div className="tailwind-classes">
         {/* JSX content */}
       </div>
     );
   }
   ```

2. **State Management**
   - Use React Context for global state
   - Local state with useState for component-specific data
   - Custom hooks for reusable logic

3. **API Integration**
   - Use the existing `ApiService` class
   - Add proper TypeScript interfaces
   - Handle errors gracefully

## 🧪 Testing

### Running Tests

```bash
# CLI tests
npm test

# Web UI tests
cd web-ui
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Writing Tests

- Write tests for all new functionality
- Use Jest for CLI tests
- Use React Testing Library for component tests
- Mock external dependencies
- Aim for >80% code coverage

## 📝 Pull Request Process

### Before Submitting

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding guidelines
   - Add tests for new functionality
   - Update documentation

3. **Test Locally**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

Use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Build process or auxiliary tool changes

## 🐛 Bug Reports

### Bug Report Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 10]
- Node.js version: [e.g., 18.17.0]
- Browser (if web UI): [e.g., Chrome 91]

**Additional Context**
Screenshots, logs, or other relevant information
```

## 💡 Feature Requests

### Feature Request Template

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Mockups, examples, or references
```

## 🏗️ Architecture Decisions

### Adding New Protocol Support

1. Create connector in `src/connectors/`
2. Implement `ProtocolConnector` interface
3. Add protocol detection logic
4. Update CLI commands
5. Add comprehensive tests
6. Update documentation

### Adding New Dependencies

Before adding dependencies:

1. **Evaluate Necessity**: Is the dependency really needed?
2. **Bundle Size**: Consider impact on bundle size
3. **Maintenance**: Is the package actively maintained?
4. **Security**: Check for known vulnerabilities
5. **Alternatives**: Consider existing solutions

## 📚 Resources

### Documentation

- [Node.js Documentation](https://nodejs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tools

- [TypeScript Playground](https://www.typescriptlang.org/play)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)

## 🤝 Community

### Getting Help

- Create an issue for bugs or questions
- Join discussions in GitHub Discussions
- Check existing documentation and issues first

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the project's code of conduct

## 🎉 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to the Universal API Schema Explorer! 🚀
