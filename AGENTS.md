# MakaLearn Coding Agent Instructions

## Project identity

This project is **MakaLearn**, a web app for teacher-guided Makaton learning support.

MakaLearn is intended to support:
- SPED teachers
- Admin users
- Learners who need communication support
- Classroom-based guided practice

This MVP is **not a mockup-only project**. It should become a semi-working web app with a real app structure, local placeholder data first, and a clean path toward Supabase authentication, database, storage, and role-based access.

## Final MVP direction

Build the planned app interface and local flows first, then prepare the codebase so Supabase can be connected afterward.

For the first build:
- Build the UI and local interactions.
- Use placeholder data.
- Create database-ready TypeScript types.
- Prepare auth screens and backend integration points.
- Prepare upload UI and file handling structure.
- Do not fully connect Supabase yet unless explicitly asked.

Later, Supabase will handle:
- Auth
- Profiles and roles
- Learners
- Learning items
- Lessons
- Categories
- Activities
- Storage uploads
- Row Level Security

## Tech stack

Use:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react

Prepare for later:
- Supabase Auth
- Supabase Database
- Supabase Storage

Use the Next.js App Router.

Prefer this structure:

```txt
src/
├─ app/
├─ components/
├─ data/
├─ features/
├─ lib/
├─ types/
└─ utils/
```

## Core pages

Create these pages:

- Public landing page
- Login page
- Learners
- Content Library
- Gesture Practice
- Activities
- Settings
- Help / Guide
- Admin Panel

Admin Panel should only appear for admin users.

## Sidebar and mobile navigation

Desktop navigation:
- Sidebar navigation

Mobile navigation:
- Bottom navigation or a clear mobile menu

Main navigation items:
- Learners
- Content Library
- Gesture Practice
- Activities
- Settings
- Help / Guide
- Admin Panel, admin only

## Roles

Use these roles:
- Admin
- Teacher

Learners do not have their own login in the MVP. Teachers select learner profiles during class.

After login:
- Teacher should go to Content Library.
- Admin should go to Admin Panel.

For the local-first build, simulate the role using local state, demo login buttons, or a simple local user object. Later this will be replaced by Supabase Auth and a `profiles` table.

## MVP data behavior

Use placeholder data first.

Use clear comments where data will later come from Supabase.

For local data, create mock records for:
- Admin user
- Teacher user
- Learners
- Categories
- Learning items
- Lessons
- Activities
- Uploaded media records

## Content policy for learning content

The project does not yet have official Makaton symbol, gesture, audio, or video data.

Therefore:
- Use placeholder educational content only.
- Do not claim placeholder media is official Makaton content.
- Use generic placeholder images/media.
- Add comments saying official/approved content will be added later.
- Use learning labels such as Hello, Eat, Drink, More, Help, Stop, Happy, Sad, Yes, No only as demo labels.

Do not include copyrighted official symbol sets unless explicitly provided by the user.

## Content Library

Content Library should contain tabs or sections:

- Learning Items
- Lessons
- Categories
- Media Library

Learning Items should use a card grid.

Each learning item should include:
- Word/label
- Category
- Description/instruction
- Symbol image upload field
- Gesture image/video upload field
- Audio upload field
- Tags
- Created by
- Last updated

Do not include difficulty level.

Categories:
- Teachers and admins can create/edit categories.
- Categories are visible to all teachers.

Lessons:
- Support auto-generated lessons from learning items.
- Support manually created lessons.
- Lessons are visible to all teachers.

Manual lesson fields:
- Lesson title
- Objective
- Selected learning items
- Instructions
- Activity type
- Estimated duration
- Notes

Auto-generated lesson flow:
- Teacher clicks Generate Lesson from a learning item card or detail page.
- The app creates a draft lesson from that item using a reusable lesson template.
- Teacher reviews/edits before saving.

Deleting learning items:
- Ask for confirmation.
- Ask whether to delete associated uploaded media.

## Learners

Learner profile fields:
- Learner name
- Age
- Grade/level
- Communication needs/notes
- Preferred learning mode
- Assigned teacher
- Profile photo
- Active/inactive status

Preferred learning modes:
- Visual
- Audio
- Gesture
- Mixed
- Teacher-guided

Learners page should include:
- Learner card grid
- Search/filter
- Add learner button
- Edit learner profile
- Archive learner
- Profile photo
- Active/inactive filter

If a teacher creates a learner, the learner should automatically be assigned to that teacher.
Admin can reassign learners.

## Gesture Practice

Use a split layout where camera, reference/sign information, and feedback are all visible.

Use real webcam preview for the UI, but keep recognition fake for now.

Flow:
- Select learning item
- Start practice
- Use webcam preview
- Simulate result

Gesture practice remains session-only in this MVP.

Fake controls:
- Simulate Correct
- Simulate Good Attempt
- Simulate Needs Practice
- Simulate No Hand Detected
- Reset attempt

Saved statuses:
- Correct
- Good attempt
- Needs practice
- No hand detected

Feedback:
- Use rule-based placeholder feedback.
- Implement feedback through a clearly named placeholder function, such as `generateFeedbackPlaceholder`.
- Add code comments explaining that this function will later be replaced by gesture recognition and/or AI feedback logic.
- Do not visibly show “model not connected” labels in the UI unless explicitly requested.

## Activities

Activity types:
- Match word to symbol
- Choose correct symbol
- Fill in the blank
- Drag and drop symbol cards
- Gesture practice activity
- Simple quiz

Activities should be fully working with scoring.

Activities page should include:
- Activity Library
- Activity Player
- Create/edit activities
- Auto-generate activities from learning items

Activity scoring is session-only in this MVP.

Activities:
- Teachers/admins can manually create activities.
- Activities can also be auto-generated from learning items.
- Teacher chooses whether an activity is shared/private.

## Admin Panel

Admin Panel should include:
- Teacher account management
- Role management
- System overview
- All learners table
- All uploads table
- Data seeding/dev tools section

Mark seeding/dev tools as development-only.

## Settings

Settings should include:
- Profile settings
- Accessibility settings
- Account/password section
- Theme/display preferences
- App information

Accessibility settings:
- Large text mode
- High contrast mode
- Reduce motion
- Audio guidance toggle

## Help / Guide

Help page should include:
- How to add learning items
- How to create lessons
- How to use gesture practice
- How to run activities
- How session-only activity scoring works
- Note explaining that official content/model data will be added later

## UI style

Use:
- Soft blue/white palette
- Professional teacher-facing style
- Friendly learner-facing areas
- Rounded cards
- Large buttons
- Clear labels
- Helpful empty states
- Loading states
- Toast notifications
- Inline form validation messages

Language:
- English only

Branding:
- MakaLearn only
- Do not show a visible thesis/research prototype label on the main UI unless explicitly requested.

## Mobile responsiveness

Mobile responsiveness is required.

Build every screen for:
- Desktop
- Tablet
- Mobile phones

Requirements:
- Sidebar on desktop
- Bottom navigation or mobile menu on phones
- Cards stack vertically on mobile
- Tables become cards or horizontally scroll
- Buttons remain large and touch-friendly
- Gesture practice layout stacks on small screens
- Activity screens use large tap targets
- Upload forms work on phones
- Avoid fixed-width desktop-only layouts

## Error, loading, and empty states

Use:
- Toast notifications
- Inline form messages
- Loading skeletons/spinners
- Helpful empty states

Form validation:
- Use moderate validation with friendly messages.

## Code quality and comments

The user is learning the codebase.

Use:
- Moderate comments explaining major files/components
- Clear component names
- Clear folder structure
- Simple readable code
- TypeScript types for important data models
- Reusable components

Avoid:
- Overly clever abstractions
- Giant files
- Hard-to-follow logic
- Unnecessary dependencies

Add comments at future integration points:
- Supabase Auth
- Supabase database queries
- Supabase Storage uploads
- Gesture recognition model
- Corrective feedback model
- AI feedback

## README

Create or update `README.md` with:
- Project overview
- Tech stack
- How to run the app
- Folder structure
- Main routes
- How local/demo data works
- Future Supabase setup plan
- Notes about placeholder learning content and placeholder model logic

## Commands

Use npm.

Common commands:
- `npm run dev`
- `npm run build`
- `npm run lint`

Do not start the dev server automatically. The user will run `npm run dev` manually when they want the app served locally.

After implementation, run build/lint checks and fix errors where possible.
