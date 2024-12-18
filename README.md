# GTHR - Event Management Platform

A modern event management platform built with Next.js that allows users to create, manage, and share events with ease.

## Features

- 🔐 **User Authentication**: Secure login and registration powered by Supabase
- 📅 **Event Creation**: Create and manage events with rich details
- 📍 **Location Mapping**: Interactive location selection with Mapbox integration
- 📧 **Invitations**: Send email invites to guests with unique access codes
- 📱 **Responsive Design**: Works seamlessly across desktop and mobile devices
- 🌙 **Dark Mode**: Automatic theme switching based on system preferences

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **Maps**: Mapbox GL JS
- **Email**: Resend
- **State Management**: React Query

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/your-username/gthr.git
cd gthr
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env.local` file with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
RESEND_API_KEY=your_resend_api_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Setup

### Supabase
1. Create a new Supabase project
2. Set up authentication providers
3. Create necessary database tables for events and invitations

### Mapbox
1. Create a Mapbox account
2. Generate an access token with required permissions
3. Enable necessary APIs (Geocoding, Maps)

### Resend
1. Sign up for a Resend account
2. Generate an API key
3. Verify your domain for sending emails

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
