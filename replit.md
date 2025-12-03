# MDT Route Decoder

## Overview

This is a web application that decodes Mythic Dungeon Tools (MDT) route strings from World of Warcraft. The application allows users to paste encoded route strings and view detailed information about dungeon pulls, enemy positions, and coordinates. It's built as a single-page application with a React frontend and Express backend, designed to help World of Warcraft players analyze and understand their dungeon routes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)

**UI Component System**
- Shadcn/ui component library with Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom theme configuration
- Custom theme uses a dark, brutalist design with sharp edges and purple/green accent colors inspired by World of Warcraft aesthetics
- Framer Motion for animations and transitions

**State Management**
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod resolvers for form validation
- Custom hooks for UI state (mobile detection, toast notifications)

**Data Decoding**
- Custom MDT decoder implementation using pako for zlib decompression
- Handles LibDeflate encoding format used by the Mythic Dungeon Tools addon
- Processes Lua table serialization and resolves enemy coordinates from dungeon data
- Static dungeon data loaded from JSON files generated from MDT addon source

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server
- Node.js HTTP server for handling requests
- TypeScript for type safety across the stack
- Development mode uses Vite middleware for HMR

**API Structure**
- RESTful API with `/api` prefix for all routes
- Currently minimal backend - most logic happens client-side for route decoding
- Storage interface defined but uses in-memory implementation (MemStorage)
- Structured to support future database integration with existing storage interface

**Build & Deployment**
- esbuild for bundling server code with selective dependency bundling
- Client and server built separately with coordinated output directories
- Production mode serves pre-built static assets
- Development mode uses Vite dev server with middleware integration

### Data Storage Solutions

**Current Implementation**
- In-memory storage using Map data structures for user data
- No persistent database currently required - application is statically functional

**Database Schema (Prepared)**
- Drizzle ORM configured with PostgreSQL dialect
- Schema defines users table with UUID primary keys
- Schema located in shared directory for type sharing between client and server
- Ready for Neon/PostgreSQL integration when persistence is needed

**Static Assets**
- Mythic Dungeon Tools data stored in `attached_assets/MythicDungeonTools/`
- Dungeon definitions parsed from Lua files to JSON
- Enemy data includes coordinates, counts, and group assignments
- Parse script (`scripts/parse-mdt-dungeons.js`) extracts data from addon source

### External Dependencies

**Third-Party Services**
- Neon Database (@neondatabase/serverless) configured but not actively used
- Ready for PostgreSQL database provisioning when needed

**UI Libraries**
- Radix UI component primitives for accessibility
- Lucide React for iconography
- cmdk for command palette patterns
- date-fns for date manipulation

**Development Tools**
- Replit-specific plugins for development banner, runtime error overlay, and cartographer
- Custom Vite plugin for meta image URL updates based on Replit deployment domain

**Compression & Parsing**
- pako for zlib/deflate decompression of MDT strings
- Custom Lua table parser for processing addon data format

**Authentication (Prepared)**
- Passport.js and passport-local configured in dependencies
- express-session with connect-pg-simple for session store
- Not currently implemented in routes but infrastructure ready