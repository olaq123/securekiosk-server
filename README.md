# SecureKiosk Server

This server handles App Store Server Notifications for the SecureKiosk iOS app.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your App Store Connect credentials:
- `APPSTORE_ISSUER_ID`: Your App Store Connect issuer ID
- `APPSTORE_KEY_ID`: Your key ID from the .p8 file
- `APPSTORE_PRIVATE_KEY`: Your private key content from the .p8 file

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Endpoints

### Production
- URL: `/notifications/production`
- Method: POST
- Handles real App Store notifications

### Sandbox
- URL: `/notifications/sandbox`
- Method: POST
- Handles test notifications from sandbox environment

## Testing

1. Use the sandbox endpoint during development
2. Make test purchases using sandbox accounts
3. Monitor server logs for notification processing
4. Verify subscription status updates

## Deployment

1. Deploy to your hosting service (e.g., Heroku, AWS, etc.)
2. Set environment variables in your hosting platform
3. Update App Store Connect with your server URLs:
   - Production URL: `https://your-domain.com/notifications/production`
   - Sandbox URL: `https://your-domain.com/notifications/sandbox`
