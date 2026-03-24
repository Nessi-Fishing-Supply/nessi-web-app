# Auth Flows

All authentication journeys: signup, login, password reset, email change, logout.

## Signup (Email + OTP)

```mermaid
flowchart TD
    A[User clicks Sign Up] --> B[Enter email + password]
    B --> C["POST /api/auth/register (admin client)"]
    C --> D{Response?}
    D -->|409 DUPLICATE_EMAIL| E[Show inline 'Sign in' link]
    D -->|Success| F[Form transitions to OTP input]
    F --> G["User enters 6-digit code from email"]
    G --> H["verifyOtp(type='signup')"]
    H --> I{Valid?}
    I -->|No| J[Show error, allow retry]
    I -->|Yes| K[Session established via cookies]
    K --> L{Onboarding complete?}
    L -->|No| M[Onboarding banner appears]
    L -->|Yes| N[User stays on current page]

    F --> O{Code not received?}
    O --> P["resendOtp() - 60s cooldown"]
    P --> F
```

## Login

```mermaid
flowchart TD
    A[User clicks Log In] --> B[Enter email + password]
    B --> C["signInWithPassword()"]
    C --> D{Response?}
    D -->|email_not_confirmed| E[Show inline resend verification button]
    E --> F["resendOtp()"]
    F --> G[User verifies email, then logs in again]
    D -->|Invalid credentials| H[Show error message]
    D -->|Success| I[Session cookies set]
    I --> J["onSuccess callback (close modal)"]
    J --> K[User stays on current page]
    K --> L["useCartMerge() - merge guest cart to DB"]
    K --> M["useRecentlyViewedMerge() - merge guest views to DB"]
```

## Password Reset (3-step)

```mermaid
flowchart TD
    A["User visits /auth/reset-password"] --> B["Step 1: Enter email"]
    B --> C["forgotPassword(email)"]
    C --> D[OTP sent to email]
    D --> E["Step 2: Enter 6-digit code"]
    E --> F["verifyOtp(type='recovery')"]
    F --> G{Valid?}
    G -->|No| H[Show error, allow retry]
    G -->|Yes| I["Step 3: Enter new password"]
    I --> J["resetPassword(newPassword)"]
    J --> K[Session established]
    K --> L["Redirect to /"]
```

## Email Change (Authenticated)

```mermaid
flowchart TD
    A["User in /dashboard/account"] --> B[Click edit email]
    B --> C[Enter new email address]
    C --> D["checkEmailAvailable(email)"]
    D --> E{Available?}
    E -->|No| F[Show error: email taken]
    E -->|Yes| G["changeEmail(newEmail)"]
    G --> H[OTP sent to NEW email]
    H --> I[Enter 6-digit code]
    I --> J["verifyEmailChange(type='email_change')"]
    J --> K{Valid?}
    K -->|No| L[Show error]
    K -->|Yes| M[Email updated, session persists]
```

## Logout

```mermaid
flowchart TD
    A[User clicks Logout] --> B["signOut()"]
    B --> C[Session cookies cleared]
    C --> D[Context store reset to member]
    D --> E["Redirect to /"]
```

## Route Protection (proxy.ts)

```mermaid
flowchart TD
    A[Any request] --> B{Path?}
    B -->|"/api/*" or "/_next/*" or "/auth/*"| C[Skip auth check, pass through]
    B -->|"/dashboard/*"| D["getUser() - verify JWT from cookies"]
    D --> E{Authenticated?}
    E -->|No| F["Redirect to /"]
    E -->|Yes| G{Path is /onboarding?}
    G -->|Yes| H{onboarding_completed_at set?}
    H -->|Yes| I["Redirect to / (already onboarded)"]
    H -->|No| J[Allow through to onboarding]
    G -->|No| K[Allow through to dashboard]
    B -->|Public pages| L[Refresh session cookies, allow through]
```
