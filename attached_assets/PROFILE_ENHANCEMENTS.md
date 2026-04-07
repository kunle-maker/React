# Profile Enhancements

## Changes
1. **Customizable Cover Photos**: Users can now upload and update their profile cover photos.
2. **Animated Profile Pictures**: Supa and Verified users can now add animated profile pictures (videos/GIFs).

## Technical Details
- **Model Update**: Added `animatedProfilePicture` field to the `User` model in `models/User.js`.
- **Route Update**: Enhanced `PUT /api/profile` in `server.js` to handle multiple file uploads using `upload.fields`.
- **Validation**:
    - `coverPhoto`: Available to all users.
    - `animatedProfilePicture`: Restricted to users where `isSupa: true` (and not expired) or `isVerified: true`.

## Fields Updated in Profile API
- `profilePicture` (File)
- `coverPhoto` (File)
- `animatedProfilePicture` (File)
- `name` (String)
- `bio` (String)
