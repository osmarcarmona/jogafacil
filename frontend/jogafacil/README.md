# JogaFacil Frontend

React application for managing sports activities.

## Environment Configuration

The app uses different API endpoints based on the environment:

### Development (Local)
Uses the dev API endpoint by default:
```
VITE_API_URL=https://63ip2hddn8.execute-api.us-west-1.amazonaws.com/dev
```

To use a local backend instead, create `.env.local`:
```bash
echo "VITE_API_URL=http://localhost:3000" > .env.local
```

### Production
The API URL is automatically set during deployment based on the backend stack.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Usage

Import the API services in your components:

```javascript
import { studentsApi, coachesApi, teamsApi } from './services/api';

// Get all students
const students = await studentsApi.getAll();

// Create a student
await studentsApi.create({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '123-456-7890'
});

// Update a student
await studentsApi.update('student-id', {
  name: 'Jane Doe'
});

// Delete a student
await studentsApi.delete('student-id');
```

## Available API Services

- `studentsApi` - Student management
- `coachesApi` - Coach management
- `teamsApi` - Team management
- `placesApi` - Place/venue management
- `scheduleApi` - Schedule management
- `paymentsApi` - Payment management

Each service provides:
- `getAll()` - List all items
- `getById(id)` - Get single item
- `create(data)` - Create new item
- `update(id, data)` - Update item
- `delete(id)` - Delete item

## Deployment

The frontend is automatically deployed when running:

```bash
# From project root
./deploy-frontend.sh dev
```

This will:
1. Get the API endpoint from the backend stack
2. Build the React app with the correct API URL
3. Upload to S3
4. Display the frontend URL

## Environment Files

- `.env.development` - Used during `npm run dev` (points to dev API)
- `.env.production` - Generated during deployment (points to deployed API)
- `.env.local` - Optional, for local overrides (not committed to git)
