---
description: Automatically increments OTA_VERSION and updates CHANGELOG before building
---

# Pre-Build Automation Workflow

Currently, we maintain a hardcoded `CHANGELOG` and `OTA_VERSION` in `src/utils/Constants.tsx` to display a "What's New" modal to users after an update.
Before running `eas update` or `eas build`, you should run this workflow to ensure the version is incremented and the latest changes are reflected.

## Steps
1. **Analyze Recent Changes**: The agent should review the recent conversation history or git diff to understand what feature was just built or what bugs were fixed.
2. **Read Constants.tsx**: Use `view_file` on `src/utils/Constants.tsx`.
3. **Increment OTA_VERSION**: Find `export const OTA_VERSION = X;` and increment `X` by 1.
4. **Update CHANGELOG**: 
   - Ensure a `CHANGELOG` array exists in `Constants.tsx` (it maps `version` to an array of `features`).
   - Add a new entry to the *beginning* of the `CHANGELOG` array with the new `OTA_VERSION` and the summarized list of changes.
   - Example format: `{ version: 4, features: ['Added Unique Property Names validation', 'Fixed Android Autofill issue on Inputs'] }`.
   - The app UI is designed to only show the *latest* update (the first item in the array or the one matching the current version), but keeping a small history is good practice. To keep it clean, you can also just replace the content of the `CHANGELOG` with the single latest update.
5. **Verify**: Ensure the syntax in `Constants.tsx` is correct.
6. **Proceed to Build**: You are now ready to run `eas update` or `eas build`.
