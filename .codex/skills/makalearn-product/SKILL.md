---
name: makalearn-product
description: Use this skill when deciding MakaLearn product behavior, MVP scope, page contents, roles, learner flows, content library behavior, gesture practice behavior, activities, and progress tracking.
---

# MakaLearn Product Skill

Use this skill to keep the app aligned with the planned MVP.

## MVP identity

MakaLearn is a teacher-guided web app for supporting Makaton learning workflows.

It should feel like a semi-working school/classroom system, not just a static mockup.

## Users

Roles:
- Admin
- Teacher

Learners are managed as profiles, not login accounts.

## Role behavior

After login:
- Teacher goes to Content Library.
- Admin goes to Admin Dashboard.

Admin:
- Sees all relevant data.
- Can manage teacher accounts.
- Can access Admin Panel.

Teacher:
- Sees assigned learners.
- Can create learners.
- Can create content.
- Can run activities and gesture practice.

## Pages

Required pages:
- Landing page
- Login
- Dashboard
- Learners
- Content Library
- Gesture Practice
- Activities
- Progress
- Settings
- Help / Guide
- Admin Panel

Admin Panel should only show for admin users.

## Content Library

Tabs:
- Learning Items
- Lessons
- Categories
- Media Library

Learning items use a card grid and include:
- Word/label
- Category
- Description/instruction
- Symbol image upload
- Gesture image/video upload
- Audio upload
- Tags
- Created by
- Last updated

No difficulty level.

Lessons:
- Auto-generated from a learning item
- Manually created from multiple learning items

Auto-generated lessons:
- Create a draft lesson.
- Let teacher review/edit before saving.

## Learners

Fields:
- Learner name
- Age
- Grade/level
- Communication needs/notes
- Preferred learning mode
- Assigned teacher
- Profile photo
- Active/inactive status

Do not add extra sensitive fields unless requested.

## Gesture practice

Use:
- Real webcam preview
- Fake/simulated recognition controls
- Rule-based placeholder feedback
- Optional learner assignment before saving

Do not visually label the model as disconnected in the UI. Use code comments only.

## Activities

Include:
- Match word to symbol
- Choose correct symbol
- Fill in the blank
- Drag and drop symbol cards
- Gesture practice activity
- Simple quiz

Activities should be fully working with scoring.

## Progress

Calculate progress from:
- Activity results
- Gesture practice attempts

Show:
- Learner overview
- Individual report
- Charts
- Activity results
- Practice attempts
- PDF export action

## Removed feature

Teacher Notes were removed from the MVP. Do not create a Teacher Notes page, table, or sidebar item.
