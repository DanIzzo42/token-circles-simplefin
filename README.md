# Token Circles - SimpleFin Edition

A personal finance dashboard built with Token Circles and integrated with SimpleFin for secure bank connections.

## Features

- **Secure Bank Connections**: Connect to your bank accounts through SimpleFin
- **Multi-User Access**: Both you and your wife can access the same financial data
- **Real-time Updates**: Refresh financial data with a single click
- **Transaction Tracking**: View all transactions with categorization
- **Account Management**: Monitor all your accounts in one place
- **Expense Analysis**: See spending by category

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DanIzzo42/token-circles-simplefin.git
   cd token-circles-simplefin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

### Connecting to SimpleFin

1. Visit the [SimpleFin Bridge](https://bridge.simplefin.org)
2. Generate a setup token
3. Enter the setup token in the connection form
4. Click "Connect" to link your bank accounts

## Architecture

### Frontend
- **Framework**: SolidJS
- **Build Tool**: Vite
- **Styling**: Custom CSS
- **TypeScript**: Full type safety

### Backend Services
- **SimpleFin API**: Secure bank account connections
- **Local State Management**: Client-side data handling

### Security
- SimpleFin never stores your bank credentials
- All data is processed client-side
- No external API calls except to SimpleFin

## Development

### Building for Production

```bash
npm run build
```

This will create a `dist` folder with the optimized build.

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Deployment

### Self-Hosting

1. Build the application:
   ```bash
   npm run build
   ```

2. Serve the `dist` folder with any static server:
   ```bash
   npx serve -s dist -p 3000
   ```

### Cloud Deployment

The application can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## Environment Variables

Create a `.env` file for development:

```
VITE_PORT=3000
SIMPLEFIN_API_URL=https://bridge.simplefin.org
```

## Contributing

This is a personal project for multi-user financial management. Contributions are welcome but please ensure all changes maintain security and privacy standards.

## License

MIT License - feel free to use this for personal finance management.

## Security Notes

- SimpleFin provides read-only access to your financial data
- The application never stores your bank credentials
- All transaction data is processed client-side
- Consider using HTTPS in production for additional security