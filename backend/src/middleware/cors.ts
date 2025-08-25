import cors from 'cors';

const allowedOrigins = [
  // Development origins - specific ports only
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',

  // Production origins - add your production domains here
  'https://gantpat-bts.netlify.app',
  'https://your-production-domain.com',

  // VS Code tunnel origins - more restrictive
  /^https:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
  /^wss:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,

  // Network access for cross-laptop testing
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^ws:\/\/192\.168\.\d+\.\d+:\d+$/,

  // Netlify and Vercel domains - allow all subdomains
  /^https:\/\/[a-zA-Z0-9-]+\.netlify\.app$/,
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    if (!origin) return callback(null, true);

    // Check if origin matches any allowed origin (string or regex)
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export const corsMiddleware = cors(corsOptions);
