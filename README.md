# Dr. Ashraf Content Planner

A polished React Native/Expo monthly social-media planner inspired by the pink, white, and gold colors in the Dr. Ashraf Metwally Cosmetic Surgery Center logo.

## Included features

- Monthly calendar arranged **Saturday through Friday**.
- A **+ button on every date** and a floating add button.
- Three content types: **Story**, **Reel**, and **Educational Video**.
- Monthly target cards for:
  - 8 reels.
  - One story every day.
  - 4 educational videos.
- Add and edit the publishing date, title, notes, and status.
- Statuses: Planned, In progress, and Posted.
- Mark a task as posted directly from the selected-day agenda.
- Delete or edit existing tasks.
- Local automatic saving with AsyncStorage.
- Animated screen entrance, animated progress bars, spring button feedback, an animated bottom sheet, layout transitions, and native haptic feedback.
- Responsive layout for phones and tablets.

## Run the project

### Requirements

- Node.js 22.13 or newer.
- Android Studio/emulator, an iPhone simulator on macOS, or the Expo Go app on a physical phone.

### Commands

```bash
npm install
npx expo install --fix
npx expo start
```

Then scan the QR code with Expo Go, or press:

- `a` for Android.
- `i` for iOS on macOS.

## Main files

- `App.tsx` — main planner screen and task logic.
- `src/components/CalendarGrid.tsx` — monthly calendar.
- `src/components/TaskSheet.tsx` — animated add/edit form.
- `src/storage/taskStorage.ts` — local persistence.
- `src/theme.ts` — brand palette and content-type styling.
- `assets/logo.png` — supplied clinic logo.

## Storage note

This version stores tasks locally on the device. It does not yet sync the schedule between multiple team members or devices. A shared database can replace the storage module later without redesigning the interface.
