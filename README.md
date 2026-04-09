# YelpCamp

> **Discover and share the best restaurants in your city.**

YelpCamp is a full-stack restaurant discovery application built with **React + TypeScript** on the frontend and **AWS Amplify + AppSync (GraphQL)** on the backend. Users can browse listings, search by name or city, view locations on an interactive map, and add new restaurants — all with real-time sync across all users.

---

## ✨ Features

- 🔍 **Real-time search** – Debounced search by restaurant name or city
- 🗺️ **Interactive map view** – Toggle between card grid and Leaflet map
- ➕ **Add restaurants** – Authenticated users can submit new places
- ⭐ **Star ratings & reviews** – Community-driven ratings
- 🔄 **Live updates** – New entries appear instantly via GraphQL subscriptions
- 📄 **Pagination** – Load more with cursor-based pagination
- 🔐 **Authentication** – AWS Cognito via `withAuthenticator`

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 16, TypeScript, React-Bootstrap |
| Backend | AWS Amplify, AWS AppSync (GraphQL) |
| Database | Amazon DynamoDB (via AppSync) |
| Auth | Amazon Cognito |
| Maps | Leaflet.js + OpenStreetMap |
| Deployment | AWS Amplify Hosting |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ (16 recommended)
- npm 6+
- An AWS account with Amplify CLI configured

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd my_yield
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure AWS Amplify

The `src/aws-exports.js` file is **not committed** to Git (it contains sensitive credentials). You must either:

**Option A – Pull from Amplify:**
```bash
amplify pull --appId <your-app-id> --envName master
```

**Option B – Create manually:**
```js
// src/aws-exports.js
const awsmobile = {
  aws_project_region: "us-east-1",
  aws_appsync_graphqlEndpoint: "https://<your-endpoint>.appsync-api.us-east-1.amazonaws.com/graphql",
  aws_appsync_region: "us-east-1",
  aws_appsync_authenticationType: "API_KEY",
  aws_appsync_apiKey: "da2-<your-api-key>",
};
export default awsmobile;
```

### 4. Run Locally

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000).

---

## 🏗 Build for Production

```bash
npm run build
```

Output is placed in the `build/` folder.

---

## ☁️ Deploy to AWS Amplify

This project is configured for AWS Amplify Hosting. The `amplify.yml` in the root defines the build pipeline:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
```

**To deploy:**
1. Push your code to GitHub
2. Connect the repository in the [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
3. Set the following environment variables in the Amplify Console:
   - `SKIP_PREFLIGHT_CHECK=true`
   - `NODE_OPTIONS=--openssl-legacy-provider`
   - `DISABLE_ESLINT_PLUGIN=true`

---

## 📁 Project Structure

```
my_yield/
├── public/
│   └── index.html          # HTML template with SEO meta tags
├── src/
│   ├── components/
│   │   ├── Header.jsx       # Navbar with search bar
│   │   ├── RestaurantCard.jsx
│   │   ├── StarRating.jsx
│   │   ├── ReviewList.jsx
│   │   └── LocationMap.jsx  # Leaflet map component
│   ├── graphql/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── subscriptions.ts
│   ├── App.tsx              # Main application component
│   ├── App.css              # Global styles & design system
│   ├── API.ts               # Auto-generated Amplify types
│   └── aws-exports.js       # AWS config (NOT in Git)
├── amplify.yml              # Amplify build config
└── package.json
```

---

## 🔒 Security Notes

- `src/aws-exports.js` is listed in `.gitignore` — **never commit it**
- API keys for local dev should be stored in `.env` or fetched via `amplify pull`
- Authentication is enforced app-wide via AWS Cognito

---

## 📝 License

MIT
