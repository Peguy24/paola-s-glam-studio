
# Add Glamour Images to Booking Page

## Overview
Enhance the appointments/booking page with your stunning professional glamour photos to create a more luxurious, visually appealing booking experience that aligns with your brand aesthetic.

## Design Approach
Add a visually striking hero/banner section with your images that appears before the booking calendar, creating an immersive beauty experience for clients.

## What Will Be Added

### 1. Copy Images to Project
- Save the 3 glamour photos to `src/assets/booking/` folder:
  - `glamour-1.jpg` (gold bodysuit duo image)
  - `glamour-2.jpg` (pink bodysuit single image)  
  - `glamour-3.jpg` (pink bodysuit four poses image)

### 2. Create Hero Banner Section
Add a beautiful hero section at the top of the Appointments page featuring:
- **Desktop view**: Image carousel or grid showcasing all 3 photos with smooth transitions
- **Mobile view**: Single featured image or compact carousel
- Elegant overlay with gradient effect matching your brand colors
- Optional decorative sparkle elements for glamour effect

### 3. Enhanced Page Layout
The new appointments page structure:
```
+------------------------------------------+
|           Navigation Bar                  |
+------------------------------------------+
|                                          |
|     [GLAMOUR HERO BANNER/CAROUSEL]       |
|     - Stunning brand imagery             |
|     - "Book Your Transformation"         |
|                                          |
+------------------------------------------+
|                                          |
|     Page Title: "Book an Appointment"    |
|     Subtitle: "Schedule your beauty..."  |
|                                          |
|     [BOOKING CALENDAR COMPONENT]         |
|                                          |
+------------------------------------------+
```

### 4. Visual Styling
- Soft gradient overlays using your brand colors (primary/secondary/accent)
- Subtle blur effects for depth
- Smooth hover animations on desktop
- Mobile-optimized responsive design

## Technical Details

### Files to Modify
- `src/pages/Appointments.tsx` - Add hero banner section with images
- Create new folder: `src/assets/booking/` for glamour images

### Implementation Details
- Import images as ES6 modules for proper bundling
- Use Tailwind CSS for responsive design
- Optional: Add Embla carousel (already installed) for image slideshow
- Maintain existing booking functionality unchanged
