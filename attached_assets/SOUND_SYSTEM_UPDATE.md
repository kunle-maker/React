# Sound System Update

## Changes
Implemented an external song search API for adding music to posts without requiring an API key.

## Technical Details
- Added `GET /api/sounds/search/external` endpoint in `routes/sounds.js`.
- Integrates with the **iTunes Search API** to fetch high-quality song previews and metadata.
- Returns a list of songs including:
    - Track Name
    - Artist Name
    - Album Name
    - Preview URL (Audio)
    - Artwork URL
    - Duration
- No API key required for fetching.

## Usage
Frontend can now call `/api/sounds/search/external?q=song+name` to get a list of tracks that can be added to posts via the `soundUrl` field in the post creation endpoint.
