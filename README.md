# Code Runner

A robust microservice built with Express.js and Judge0 for executing code in multiple programming languages. Perfect for coding platforms, online judges, and educational applications.

## Table of Contents

- [Features](#features)
- [Supported Languages](#supported-languages)
- [API Endpoints](#api-endpoints)
- [Installation](#installation)
- [Configuration](#configuration)
- [Docker Deployment](#docker-deployment)
- [Usage Examples](#usage-examples)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Security Considerations](#security-considerations)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Multi-language Support**: Execute code in Python, C++, and Java
- **Flexible Testing**: Run sample tests, full test suites, or custom test cases
- **Judge0 Integration**: Reliable code execution with sandboxed environment
- **RESTful API**: Clean and intuitive endpoint structure
- **Test Case Management**: Support for both sample and hidden test cases
- **Custom Test Execution**: Run code against user-defined inputs
- **Rate Limiting**: Built-in protection against abuse
- **Health Monitoring**: Health check endpoint for service monitoring
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Supported Languages

- **Python** (Judge0 ID: 71)
- **C++** (Judge0 ID: 54)
- **Java** (Judge0 ID: 62)

## API Endpoints

### 1. Health Check

Check if the service is running properly.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-31T14:18:12.000Z",
  "uptime": 3600.5
}
```

---

### 2. Run Sample Tests

Execute code against sample test cases for quick validation during development.

**Endpoint:** `POST /run`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "problem": {
    "id": "problem-id",
    "sampleTests": [
      {
        "input": "",
        "expected": "Hello World"
      }
    ],
    "timeLimit": 2,
    "memoryLimit": 256000
  }
}
```

**Response:**
```json
{
  "isError": false,
  "message": "All sample tests passed"
}
```

**Error Response:**
```json
{
  "isError": true,
  "errorType": "WRONG_ANSWER",
  "message": "Test case 1 failed",
  "result": {
    "testcase": 1,
    "passed": false,
    "output": "Hello",
    "expected": "Hello World"
  }
}
```

---

### 3. Submit Solution

Execute code against all test cases (both sample and hidden) for final submission.

**Endpoint:** `POST /submit`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "problem": {
    "id": "problem-id",
    "sampleTests": [...],
    "hiddenTests": [...],
    "timeLimit": 2,
    "memoryLimit": 256000
  }
}
```

**Response:**
```json
{
  "isError": false,
  "message": "All tests passed"
}
```

---

### 4. Run All Tests (Statistics)

Get the total number of test cases passed (including both sample and hidden) without detailed results.

**Endpoint:** `POST /run-all`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "problem": {
    "id": "problem-id",
    "sampleTests": [...],
    "hiddenTests": [...],
    "timeLimit": 2,
    "memoryLimit": 256000
  }
}
```

**Response:**
```json
{
  "success": true,
  "passed": 8,
  "total": 10
}
```

---

### 5. Execute Custom Tests

Execute code against custom test cases with only inputs (no expected outputs).

**Endpoint:** `POST /execute`

**Request Body (Format 1 - Direct inputs):**
```json
{
  "code": "name = input()\nprint(f'Hello {name}')",
  "language": "python",
  "inputs": ["Alice", "Bob"],
  "timeLimit": 2,
  "memoryLimit": 256000
}
```

**Request Body (Format 2 - Problem format):**
```json
{
  "code": "name = input()\nprint(f'Hello {name}')",
  "language": "python",
  "problem": {
    "testCases": [
      { "input": "Alice" },
      { "input": "Bob" }
    ]
  },
  "timeLimit": 2,
  "memoryLimit": 256000
}
```

**Response:**
```json
{
  "outputs": [
    "Hello Alice",
    "Hello Bob"
  ]
}
```

---

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Judge0 API access (RapidAPI or self-hosted)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/AkshatGarg952/Code-Runner.git
   cd Code-Runner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory (use `.env.example` as template):
   ```env
   PORT=9000
   NODE_ENV=development
   
   # Judge0 Configuration
   JUDGE0_API_KEY=your_rapidapi_key_here
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com/submissions
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:9000`

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 9000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `JUDGE0_API_KEY` | Judge0 API key from RapidAPI | - | **Yes** |
| `JUDGE0_API_URL` | Judge0 API endpoint | https://judge0-ce.p.rapidapi.com/submissions | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window in milliseconds | 60000 | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |

### Language IDs (Judge0)

The service maps languages to Judge0 language IDs:
- **Python**: 71
- **C++**: 54
- **Java**: 62

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Using Docker

```bash
# Build the image
docker build -t code-runner .

# Run the container
docker run -p 9000:9000 --env-file .env code-runner
```

## Usage Examples

### Using cURL

```bash
# Health check
curl http://localhost:9000/health

# Run sample tests
curl -X POST http://localhost:9000/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello World\")",
    "language": "python",
    "problem": {
      "id": "hello-world",
      "sampleTests": [{"input": "", "expected": "Hello World"}]
    }
  }'

# Execute custom tests
curl -X POST http://localhost:9000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "name = input()\nprint(f\"Hello {name}\")",
    "language": "python",
    "inputs": ["Alice", "Bob"]
  }'
```

### Using JavaScript (Fetch)

```javascript
const runCode = async () => {
  const response = await fetch('http://localhost:9000/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: 'print("Hello World")',
      language: 'python',
      problem: {
        id: 'hello-world',
        sampleTests: [{ input: '', expected: 'Hello World' }]
      }
    })
  });
  
  const result = await response.json();
  console.log(result);
};
```

### Using Python (Requests)

```python
import requests

url = 'http://localhost:9000/run'
payload = {
    'code': 'print("Hello World")',
    'language': 'python',
    'problem': {
        'id': 'hello-world',
        'sampleTests': [{'input': '', 'expected': 'Hello World'}]
    }
}

response = requests.post(url, json=payload)
print(response.json())
```

## Project Structure

```
Code-Runner/
├── index.js              # Main server file with all route handlers
├── helper.js             # Code execution logic and Judge0 integration
├── config.js             # Configuration and environment validation
├── middleware/
│   └── validator.js      # Request validation middleware
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment variables template
├── .gitignore
├── .dockerignore
├── Dockerfile            # Docker container configuration
├── docker-compose.yml    # Docker Compose configuration
├── package.json
└── README.md
```

## Tech Stack

- **Express.js** - Web framework
- **Judge0** - Code execution engine
- **Node.js** - Runtime environment
- **Axios** - HTTP client for Judge0 API calls
- **Morgan** - HTTP request logger
- **express-rate-limit** - Rate limiting middleware
- **dotenv** - Environment variable management
- **Docker** - Containerization

## Security Considerations

- **Rate limiting** implemented to prevent abuse (100 requests per minute by default)
- **Input validation** via middleware for all endpoints
- **CORS** enabled with configurable origins
- **Time and memory limits** enforced for code execution
- **Sandboxed execution** via Judge0
- **API Key Security**: Never expose Judge0 API keys in client-side code
- **Authentication**: Implement authentication for production use
- **HTTPS**: Use HTTPS in production environments

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `500` - Internal Server Error (Judge0 failure, timeout, etc.)

### Error Response Format

```json
{
  "isError": true,
  "errorType": "COMPILATION_ERROR | RUNTIME_ERROR | TIME_LIMIT_EXCEEDED | WRONG_ANSWER",
  "message": "Detailed error message",
  "result": {
    "testcase": 1,
    "passed": false,
    "output": "actual output",
    "expected": "expected output"
  }
}
```

## Troubleshooting

### Common Issues

**1. Judge0 API Key Error**
```
Error: Missing required environment variables: JUDGE0_API_KEY
```
**Solution**: Create a `.env` file with your Judge0 API key from [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce)

**2. Rate Limit Exceeded**
```json
{
  "success": false,
  "error": "Too many requests, please try again later."
}
```
**Solution**: Wait for the rate limit window to reset or increase `RATE_LIMIT_MAX_REQUESTS` in `.env`

**3. Connection Timeout**
```
Error: timeout of 30000ms exceeded
```
**Solution**: Check your internet connection and Judge0 API status. The service uses axios-retry with 3 retries.

**4. Invalid Language**
```
Error: Unsupported language
```
**Solution**: Ensure you're using one of the supported languages: `python`, `cpp`, or `java`

### Getting Judge0 API Key

1. Visit [RapidAPI Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Sign up for a free account
3. Subscribe to the Judge0 CE API (free tier available)
4. Copy your API key and add it to `.env`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Akshat Garg**

- GitHub: [@AkshatGarg952](https://github.com/AkshatGarg952)

## Acknowledgments

- [Judge0](https://judge0.com/) for the excellent code execution API
- [Express.js](https://expressjs.com/) for the web framework
- [RapidAPI](https://rapidapi.com/) for hosting Judge0 API

---

Star this repository if you find it helpful!
