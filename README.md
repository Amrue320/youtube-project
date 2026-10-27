YourTube – Video Sharing Platform
YourTube is a full-stack video-sharing web application developed as an internship project with ElevanceSkills. It is designed to provide a YouTube-style experience for browsing videos and interacting with video content.
Live Demo
- Frontend: https://youtube-project-2-vw4i.onrender.com
- Backend: https://youtube-project-1-rqox.onrender.com
- GitHub Repository: https://github.com/Amrue320/youtube-project
Note: Availability of individual features depends on the current deployment and implementation. Video playback requires the relevant media files to exist on the deployed server or configured storage.

Features
The project contains frontend and backend functionality for:
- Video listing and metadata management
- Video upload and search
- Video playback support
- Likes and view-count updates
- User and channel-related functionality
- Watch history and Watch Later
- Comments
- Video downloads and subscription plans
- Playlists and notifications
- Video progress tracking and creator analytics
- Socket.IO setup for real-time functionality
Some features may require additional configuration or testing in the deployed environment.
Technology Stack
- Frontend: React / Next.js-based frontend (check the frontend package.json for the exact framework and version)
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Real-time communication: Socket.IO
- Version control: Git and GitHub
- Deployment: Render
Project Structure
The repository contains a frontend application and a backend server. The backend includes route, controller, and model files for video and user-related features.
youtube-project/
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── Modals/
│   ├── uploads/
│   ├── index.js
│   └── ...
├── (frontend application files)
└── README.md
The exact directory names may differ depending on the current repository structure.

Getting Started
Prerequisites
Install the following before running the project locally:
- Node.js and npm
- MongoDB connection (local MongoDB or MongoDB Atlas)
- Git
1. Clone the repository
git clone https://github.com/Amrue320/youtube-project.git
cd youtube-project
2. Install frontend dependencies
Open a terminal in the frontend directory—the directory containing the frontend package.json—and run:
npm install
Use the start command defined in that package's package.json. For example, common commands include:
npm run dev
3. Install backend dependencies
Open a separate terminal in the server directory:
cd server
npm install
4. Configure backend environment variables
Create a .env file inside server/ and configure the values required by the backend. Example:
PORT=5000
DB_URL=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
Replace the example values with your own configuration. Do not commit real database credentials, tokens, or other secrets to GitHub.

If your frontend runs on a different local port, update CLIENT_URL accordingly. For the deployed backend, configure BACKEND_URL with the backend's public URL.
5. Configure the frontend API URL
Set the frontend environment variable according to the framework used by the repository.

For Vite:
VITE_API_URL=http://localhost:5000
For Next.js:
NEXT_PUBLIC_API_URL=http://localhost:5000
Use the matching variable name in the frontend API/Axios configuration. Do not include secret credentials in frontend environment variables.
6. Start the application
Run the backend using the script defined in server/package.json, for example:
npm start
Then start the frontend using its configured development script in a separate terminal. Confirm the correct commands in each package.json.
API Overview
The backend includes route groups for functionality such as:
- /user
- /video
- /like
- /watch
- /history
- /comment
- /download
- /subscription
- /notification
- /playlist
- /progress
- /analytics
The exact endpoints and request formats are defined in the backend route files.
Deployment
The project is deployed using separate Render services for the frontend and backend.
1. Deploy the frontend and configure it to use the public backend URL.
2. Configure the backend environment variables in Render.
3. Ensure CORS permits requests from the deployed frontend.
4. Ensure MongoDB connectivity is configured securely.
5. Ensure video URLs point to accessible files.
Media storage note: A deployed service's local filesystem may be ephemeral. For reliable long-term uploads, use a persistent disk or external object storage and update the upload/serving logic accordingly. Committing sample media files to GitHub is not a substitute for durable upload storage.
Troubleshooting
Videos do not play
- Check the API response for a valid video URL.
- Open the URL directly to check whether the file is accessible.
- Check the browser Developer Tools → Network tab for failed media requests.
- Confirm the file exists in the deployed storage location.
- Verify that the frontend uses the correct video URL field.
Frontend cannot reach the backend
- Verify the frontend API base URL.
- Check backend service logs and browser Network errors.
- Confirm CORS allows the frontend origin.
- Check that required environment variables are configured.
Database connection fails
- Verify the MongoDB connection string in the backend environment.
- Confirm network access and database credentials.
- Never publish the connection string or password in the repository.
Security
- Keep .env files and credentials out of version control.
- Use strong database credentials and least-privilege access.
- Validate uploaded files and user input.
- Apply authentication and authorization checks to private user data and actions.
- Avoid exposing secrets in client-side environment variables.
Future Improvements
- Persistent cloud storage and CDN delivery for video files
- Adaptive streaming and video transcoding
- Automated backend and frontend tests
- Improved validation, rate limiting, and security
- Enhanced analytics and monitoring
- Accessibility and responsive UI improvements
Author
Amruthesh S P
