# Learning Progress Tracker

A comprehensive application for tracking learning progress using flashcards and spaced repetition.

## Features

- Create and manage flashcard decks
- Study flashcards using spaced repetition
- Track progress with statistics
- Add images to flashcards
- Search functionality
- Responsive design

## Image Support in Flashcards

The application now supports adding images to the back content of flashcards. This is useful for:

- Visual learning materials
- Diagrams and charts
- Mathematical equations
- Language learning with visual context

### How to Use Image Upload

1. When creating a new flashcard, click the "Add Images" button
2. Select one or more images from your device
3. The images will be uploaded and previewed
4. Create the flashcard with both text and images
5. When studying, the images will appear on the back of the card

## Technical Implementation

- Images are stored in Supabase Storage
- Each image has a unique identifier
- Images are embedded in the flashcard content using HTML
- Responsive design ensures images display properly on all devices

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables
4. Run the development server with `npm run dev`
