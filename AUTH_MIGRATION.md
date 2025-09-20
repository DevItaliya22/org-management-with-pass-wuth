# Authentication Migration: Convex Auth → NextAuth.js

## Overview
This project has been migrated from Convex Auth to NextAuth.js for better production reliability and stability.

## What Changed

### 1. Authentication System
- **Before**: Convex Auth with OTP verification
- **After**: NextAuth.js with Google OAuth and email/password authentication

### 2. Key Files Modified
- `lib/auth.ts` - NextAuth.js configuration
- `app/api/auth/[...nextauth]/route.ts` - API routes
- `app/signin/page.tsx` - Updated signin page
- `middleware.ts` - Updated middleware
- `components/SessionProvider.tsx` - New session provider
- `components/SignOutButton.tsx` - Updated sign out button
- `hooks/use-role.ts` - Updated role hook
- `convex/schema.ts` - Updated user schema
- `convex/users.ts` - Added NextAuth.js compatible functions

### 3. Environment Variables Required
Add these to your `.env.local` file:

```env
# NextAuth.js
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Convex (existing)
NEXT_PUBLIC_CONVEX_URL=your-convex-url
CONVEX_DEPLOY_KEY=your-convex-deploy-key
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install next-auth@beta bcryptjs
npm install --save-dev @types/bcryptjs
```

### 2. Environment Variables
1. Generate a secret for NextAuth.js:
   ```bash
   openssl rand -base64 32
   ```
2. Add the secret to your `.env.local` file as `NEXTAUTH_SECRET`

### 3. Google OAuth Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Add the client ID and secret to your `.env.local` file

### 4. Database Migration
The user schema has been updated to include:
- `passwordHash` - For password authentication
- `googleId` - For Google OAuth users

Existing users will need to be migrated or re-registered.

## Features

### Authentication Methods
1. **Google OAuth** - One-click sign in with Google
2. **Email/Password** - Traditional email and password authentication
3. **Email Verification** - OTP-based email verification for new accounts

### Role-Based Access Control
- **Owner** - Full system access
- **Staff** - Order management access
- **Reseller** - Team-based access with admin/member roles

### Security Features
- JWT-based sessions
- Password hashing with bcrypt
- Email verification for new accounts
- Protected routes with middleware

## Testing

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Authentication
1. Navigate to `http://localhost:3000/signin`
2. Try Google OAuth (if configured)
3. Try email/password authentication
4. Test email verification flow

### 3. Test Protected Routes
1. Try accessing `/dashboard` without authentication
2. Verify redirect to `/signin`
3. Sign in and verify access to protected routes

## Troubleshooting

### Common Issues

1. **"NEXTAUTH_SECRET is not set"**
   - Add `NEXTAUTH_SECRET` to your `.env.local` file

2. **Google OAuth not working**
   - Check Google Cloud Console configuration
   - Verify redirect URIs match your domain
   - Ensure client ID and secret are correct

3. **Email verification not working**
   - Check your email service configuration
   - Verify SMTP settings in your environment

4. **Session not persisting**
   - Check if `NEXTAUTH_URL` is set correctly
   - Verify middleware configuration

### Production Deployment

1. Set production environment variables
2. Update `NEXTAUTH_URL` to your production domain
3. Configure Google OAuth for production domain
4. Test all authentication flows in production

## Benefits of NextAuth.js

1. **Production Ready** - Battle-tested in thousands of applications
2. **Better Error Handling** - More reliable error messages and recovery
3. **Flexible** - Easy to add new providers and customizations
4. **Well Documented** - Extensive documentation and community support
5. **TypeScript Support** - Full TypeScript support with type safety
6. **Session Management** - Robust session handling and persistence

## Migration Notes

- Existing Convex Auth users will need to re-register or be migrated
- All authentication flows have been preserved
- Role-based access control remains the same
- Team management functionality is unchanged
