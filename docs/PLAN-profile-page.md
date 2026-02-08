# Profile Page Implementation Plan

## Goal Description
Implement a user profile page where users can:
- Update their display name
- Change their email address (requires current password)
- Change their password (requires current password)
- Upload/Update their profile avatar

## User Review Required
> [!IMPORTANT]
> The **Change Email** and **Change Password** actions will require the user to provide their **current password** for security verification.

## Proposed Changes

### Routes
#### [NEW] [profile.astro](file:///home/richard/code/gerenciador-projetos/src/pages/profile.astro)
- New Astro page routed at `/profile`.
- Protected route (redirects to login if not authenticated).
- Uses the main application layout.
- Hydrates the `ProfileForm` component.

### Components
#### [NEW] [profile-form.tsx](file:///home/richard/code/gerenciador-projetos/src/components/profile/profile-form.tsx)
- React component managing the profile state.
- **Tabs/Sections**:
    - **General**: Name update, Avatar upload.
    - **Security**: Email update, Password change.
- **Features**:
    - Uses `react-hook-form` + `zod` for validation.
    - uses `better-auth` client for `updateUser`, `changePassword`, `changeEmail`.
    - Integrated `FileUpload` component for avatar.
    - Handles upload signature and S3 PUT via existing `storage` API.

### Layout
#### [MODIFY] [user-nav.tsx](file:///home/richard/code/gerenciador-projetos/src/components/dashboard/user-nav.tsx)
- Update the "Profile" link in the user dropdown to point to `/profile`.

## Verification Plan

### Automated Tests
- **Unit Tests**:
    - Create `src/components/profile/profile-form.test.tsx` to test form validation and submission handling.
    - Mock `better-auth` client methods.

### Manual Verification
1.  **Navigation**:
    - Log in.
    - Click User Avatar -> Profile.
    - Verify redirection to `/profile`.
2.  **Avatar Upload**:
    - Upload an image.
    - Verify image previews.
    - Save and refresh. Verify new avatar persists.
3.  **Update Profile**:
    - Change name. Save.
    - Verify success toast and UI update.
4.  **Security**:
    - Attempt password change without current password (should fail/validate).
    - Change password with correct credentials.
    - Verify login with new password.
