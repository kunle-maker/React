# Gemini Project Context

## Session Mandates
- **State Preservation:** After every update or change, ALWAYS commit and push to the `gemini` branch to ensure that subsequent sessions have the latest project state.
- **Workflow:** Use the following command sequence to persist changes:
  ```bash
  git add .
  git commit -m "Descriptive message"
  git push origin gemini
  ```

## UI Standards
- **Font Style:** The main "VESSELX" header uses the 'Quicksand' font for a soft, professional appearance.
- **Chat Interface:** Both DM (`Messages.jsx`) and Group Chat (`GroupChat.jsx`) must maintain a Discord-inspired UI:
  - Mobile navbar is hidden on these routes.
  - Messages are grouped with timestamps shown on hover.
  - Input field is rounded with a plus icon and an emoji picker that acts as a keyboard replacement.
