# hCaptcha Setup Instructions

hCaptcha has been successfully integrated into the signup form to prevent bot registrations.

## Current Configuration

The signup form (`src/pages/signup.tsx`) is currently using hCaptcha's **test site key**:
- Site Key: `10000000-ffff-ffff-ffff-000000000001`
- This test key will **always pass validation** (for development/testing only)

## Features Implemented

✅ Bot protection on email/password signup
✅ Dark theme matching app design
✅ Centered captcha widget at bottom of form
✅ Submit button disabled until captcha is verified
✅ Captcha resets on signup error
✅ Clear error message if user tries to submit without completing captcha

## To Use in Production

### 1. Get Your hCaptcha Site Keys

1. Go to [hCaptcha.com](https://www.hcaptcha.com/)
2. Sign up for a free account
3. In the dashboard, click "New Site"
4. Add your domain (e.g., `quiziq.com` or `localhost` for testing)
5. Copy your **Site Key** and **Secret Key**

### 2. Update the Site Key

In `/src/pages/signup.tsx`, replace the test site key:

```tsx
<HCaptcha
    ref={captchaRef}
    sitekey="YOUR_ACTUAL_SITE_KEY_HERE"  // ← Replace this
    onVerify={(token) => setCaptchaToken(token)}
    onExpire={() => setCaptchaToken(null)}
    theme="dark"
/>
```

### 3. Security Note

**IMPORTANT**: The current implementation verifies the captcha on the client side only. For production use, you should:

1. Create a backend API endpoint that verifies the captcha token with hCaptcha's servers
2. Use your **Secret Key** (never expose this in frontend code)
3. Verify the token server-side before creating the user account

Example verification endpoint:
```typescript
// pages/api/verify-captcha.ts
export default async function handler(req, res) {
    const { token } = req.body;
    
    const response = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `response=${token}&secret=YOUR_SECRET_KEY`
    });
    
    const data = await response.json();
    res.json({ success: data.success });
}
```

## Testing

With the test site key, you can:
- See the captcha widget appear
- Click "I am human"
- The captcha will always pass
- Submit button will enable after completing captcha

## Documentation

- [hCaptcha Documentation](https://docs.hcaptcha.com/)
- [React hCaptcha Library](https://github.com/hCaptcha/react-hcaptcha)
