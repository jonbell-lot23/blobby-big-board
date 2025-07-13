# Blobby Big Board - Cloud Edition

A fun, gooey project tracker with cloud sync, built with Next.js, Framer Motion, Supabase, and Clerk authentication.

## Features

- 🔐 **User Authentication** - Google OAuth via Clerk
- ☁️ **Cloud Storage** - PostgreSQL database via Supabase
- 🔄 **Real-time Sync** - Access your boards from any device
- 🏠 **Home/Work Contexts** - Separate boards for different areas
- 📱 **Responsive Design** - Works on desktop and mobile
- 🚀 **Automatic Migration** - Import existing localStorage data

## Quick Setup

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Supabase Setup
- Create a new Supabase project
- Copy the PostgreSQL connection strings to your `.env.local`
- The database schema will be created automatically

### 4. Clerk Authentication Setup
- Create a Clerk application
- Enable Google OAuth provider
- Copy the Clerk keys to your `.env.local`

### 5. Database Setup
```bash
bunx prisma generate
bunx prisma db push
```

### 6. Run Development Server
```bash
bun run dev
```

## Database Schema

```prisma
model User {
  id        String   @id // Clerk user ID
  username  String   @unique
  email     String   @unique
  boards    Board[]
}

model Board {
  id     String @id @default(cuid())
  userId String
  name   String // "Home" or "Work"
  user   User   @relation(fields: [userId], references: [id])
  tasks  Task[]
}

model Task {
  id      String @id @default(cuid())
  boardId String
  label   String
  x       Float
  y       Float
  size    Float  @default(100)
  board   Board  @relation(fields: [boardId], references: [id])
}
```

## Migration from Local Storage

If you have existing tasks in localStorage, the app will automatically prompt you to migrate them to cloud storage on first login.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Clerk + Google OAuth
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Runtime**: Bun

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Database operations
bunx prisma studio      # Database browser
bunx prisma db push     # Push schema changes
bunx prisma generate    # Generate Prisma client
```