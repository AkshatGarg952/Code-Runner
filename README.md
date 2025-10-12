# Code Runner 🚀

A robust microservice built with Express.js and Judge0 for executing code in multiple programming languages. Perfect for coding platforms, online judges, and educational applications.

## 📋 Table of Contents

- [Features](#features)
- [Supported Languages](#supported-languages)
- [API Endpoints](#api-endpoints)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Multi-language Support**: Execute code in Python, C++, and Java
- **Flexible Testing**: Run sample tests, full test suites, or custom test cases
- **Judge0 Integration**: Reliable code execution with sandboxed environment
- **RESTful API**: Clean and intuitive endpoint structure
- **Test Case Management**: Support for both sample and hidden test cases
- **Custom Test Execution**: Run code against user-defined inputs

## 🔤 Supported Languages

- Python
- C++
- Java

## 🛣️ API Endpoints

### 1. Run Sample Tests

Execute code against sample test cases for quick validation during development.

**Endpoint:** `POST /run`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "problem": "problem-id-or-slug"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "testcase": 1,
      "passed": true,
      "output": "Hello World",
      "expected": "Hello World"
    }
  ]
}
```

---

### 2. Submit Solution

Execute code against all test cases (both sample and hidden) for final submission.

**Endpoint:** `POST /submit`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "problem": "problem-id-or-slug"
}
```

**Response:**
```json
{
  "success": true,
  "totalTests": 10,
  "passedTests": 10,
  "results": [...]
}
```

---

### 3. Run All Tests (Statistics)

Get the total number of test cases passed (including both sample and hidden).

**Endpoint:** `POST /run-all`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "problem": "problem-id-or-slug"
}
```

**Response:**
```json
{
  "success": true,
  "totalTests": 10,
  "passedTests": 8,
  "score": 80
}
```

---

### 4. Run Custom Tests

Execute code against custom test cases provided by the user.

**Endpoint:** `POST /run-custom-tests`

**Request Body:**
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "testcases": [
    {
      "input": "",
      "expected": "Hello World"
    },
    {
      "input": "John",
      "expected": "Hello John"
    }
  ],
  "timeLimit": 2,
  "memoryLimit": 256000
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "testcase": 1,
      "passed": true,
      "output": "Hello World",
      "executionTime": "0.021s"
    }
  ]
}
```

---

## 🚀 Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Judge0 API access (self-hosted or cloud)

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
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your_rapidapi_key_here
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3000`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `JUDGE0_API_URL` | Judge0 API endpoint | - |
| `JUDGE0_API_KEY` | Judge0 API key | - |
| `NODE_ENV` | Environment (development/production) | development |

### Language IDs (Judge0)

The service maps languages to Judge0 language IDs:
- Python: 71
- C++: 54
- Java: 62

## 📝 Usage Examples

### Using cURL

```bash
# Run sample tests
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello World\")",
    "language": "python",
    "problem": "hello-world"
  }'

# Submit solution
curl -X POST http://localhost:3000/submit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello World\")",
    "language": "python",
    "problem": "hello-world"
  }'
```

### Using JavaScript (Fetch)

```javascript
const runCode = async () => {
  const response = await fetch('http://localhost:3000/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: 'print("Hello World")',
      language: 'python',
      problem: 'hello-world'
    })
  });
  
  const result = await response.json();
  console.log(result);
};
```

### Using Python (Requests)

```python
import requests

url = 'http://localhost:3000/run'
payload = {
    'code': 'print("Hello World")',
    'language': 'python',
    'problem': 'hello-world'
}

response = requests.post(url, json=payload)
print(response.json())
```

## 🛠️ Tech Stack

- **Express.js** - Web framework
- **Judge0** - Code execution engine
- **Node.js** - Runtime environment
- **Axios** - HTTP client for Judge0 API calls

## 📂 Project Structure

```
Code-Runner/
├── src/
│   ├── routes/
│   │   └── codeRoutes.js
│   ├── controllers/
│   │   └── codeController.js
│   ├── services/
│   │   └── judge0Service.js
│   └── utils/
│       └── validator.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

## 🔒 Security Considerations

- Implement rate limiting to prevent abuse
- Validate and sanitize all user inputs
- Set appropriate time and memory limits for code execution
- Use CORS to restrict API access
- Never expose Judge0 API keys in client-side code
- Implement authentication for production use

## 🐛 Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing parameters)
- `500` - Internal Server Error (Judge0 failure, timeout, etc.)

Error Response Format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Akshat Garg**

- GitHub: [@AkshatGarg952](https://github.com/AkshatGarg952)

## 🙏 Acknowledgments

- [Judge0](https://judge0.com/) for the excellent code execution API
- [Express.js](https://expressjs.com/) for the web framework

---

⭐ Star this repository if you find it helpful!
