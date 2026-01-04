import axios from 'axios';
import { config } from './config.js';

export function getTestcases(problem, includeHidden = false) {
  let testcases = problem.examples || problem.sampleTests || [];
  if (includeHidden && problem.hiddenTests) {
    testcases = [...testcases, ...problem.hiddenTests];
  }

  return testcases.map(t => ({
    input: t.input || '',
    expected: t.output || ''
  }));
}

const languageMap = {
  cpp: 54,         // C++17
  python: 71,      // Python 3
  java: 62,        // Java OpenJDK 17
  javascript: 63,  // JavaScript (Node.js)
  c: 50,           // C (GCC)
  csharp: 51,      // C# (Mono)
  ruby: 72,        // Ruby
  go: 60,          // Go
  rust: 73         // Rust
};

const JUDGE0_URL = config.judge0.apiUrl;
const JUDGE0_HEADERS = {
  'content-type': 'application/json',
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  'X-RapidAPI-Key': config.judge0.apiKey
};

async function pollSubmission(token) {
  const url = `${JUDGE0_URL}/${token}?base64_encoded=false`;
  for (let i = 0; i < 30; i++) {
    const resp = await axios.get(url, { headers: JUDGE0_HEADERS });
    const result = resp.data;
    if (result.status.id >= 3) return result;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Judge0 request timed out');
}

function normalizeOutput(str) {
  return (str || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trimEnd();
}

export async function executeCode(code, language, tests, timeLimit = 2, memoryLimit = 256000) {
  if (!languageMap[language]) {
    return {
      isError: true,
      errorType: 'System Error',
      message: `Unsupported language: ${language}`
    };
  }

  try {
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];

      const payload = {
        language_id: languageMap[language],
        source_code: code,
        stdin: test.input,
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit
      };

      const submitResp = await axios.post(`${JUDGE0_URL}?base64_encoded=false`, payload, {
        headers: JUDGE0_HEADERS
      });

      const token = submitResp.data.token;
      const result = await pollSubmission(token);

      if (result.status.id !== 3) {
        let errorType = 'Runtime Error';
        let errorMessage = result.stderr || result.compile_output || result.status.description;

        switch (result.status.id) {
          case 4:
            errorType = 'Wrong Answer';
            errorMessage = 'Output did not match expected result';
            break;
          case 5:
            errorType = 'Time Limit Exceeded';
            errorMessage = `Execution time exceeded ${timeLimit}s limit`;
            break;
          case 6:
            errorType = 'Compilation Error';
            break;
          case 7:
          case 8:
          case 9:
          case 10:
            errorType = 'Memory Limit Exceeded';
            errorMessage = `Memory usage exceeded ${memoryLimit}KB limit`;
            break;
          case 11:
            errorType = 'Runtime Error (SIGSEGV)';
            errorMessage = 'Segmentation fault - Invalid memory access';
            break;
          case 12:
            errorType = 'Runtime Error (SIGXFSZ)';
            errorMessage = 'Output size limit exceeded';
            break;
          case 13:
            errorType = 'Runtime Error (SIGFPE)';
            errorMessage = 'Floating point exception (division by zero)';
            break;
          case 14:
            errorType = 'Runtime Error (SIGABRT)';
            errorMessage = 'Program aborted';
            break;
        }

        return {
          isError: true,
          errorType,
          message: errorMessage,
          result: { input: test.input }
        };
      }

      const produced = normalizeOutput(result.stdout);
      const expected = normalizeOutput(test.expected);

      if (produced !== expected) {
        return {
          isError: true,
          errorType: 'Wrong Answer',
          message: 'Output did not match expected result',
          result: { input: test.input }
        };
      }
    }

    return { isError: false, message: 'All test cases passed successfully' };

  } catch (err) {
    return {
      isError: true,
      errorType: 'System Error',
      message: err.message
    };
  }
}

export async function executeSingleTest(code, language, input, expected, timeLimit = 2, memoryLimit = 256000) {
  if (!languageMap[language]) throw new Error(`Unsupported language: ${language}`);

  const payload = {
    language_id: languageMap[language],
    source_code: code,
    stdin: input,
    cpu_time_limit: timeLimit,
    memory_limit: memoryLimit
  };

  const submitResp = await axios.post(`${JUDGE0_URL}?base64_encoded=false`, payload, { headers: JUDGE0_HEADERS });
  const token = submitResp.data.token;

  const result = await pollSubmission(token);

  if (result.status.id !== 3) return false;

  const produced = normalizeOutput(result.stdout);
  const expectedNorm = normalizeOutput(expected);

  return produced === expectedNorm;
}

export async function executeCustomTests(code, language, testcases, timeLimit = 2, memoryLimit = 256000) {
  if (!languageMap[language]) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const results = [];

    for (const input of testcases) {
      const payload = {
        language_id: languageMap[language],
        source_code: code,
        stdin: input,
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit
      };

      const submitResp = await axios.post(`${JUDGE0_URL}?base64_encoded=false`, payload, {
        headers: JUDGE0_HEADERS
      });

      const token = submitResp.data.token;
      const result = await pollSubmission(token);

      if (result.status.id !== 3) {
        results.push({
          input,
          output: null,
          error: result.stderr || result.compile_output || result.status.description
        });
      } else {
        results.push({
          input,
          output: (result.stdout || '').trim()
        });
      }
    }

    return results;

  } catch (err) {
    throw new Error(`Judge0 execution failed: ${err.message}`);
  }
}

export async function executeAllTests(code, language, tests, timeLimit = 2, memoryLimit = 256000) {
  if (!languageMap[language]) {
    throw new Error(`Unsupported language: ${language}`);
  }

  let passed = 0;
  
  // proces tests sequentially to avoid overwhelming Judge0
  for (const test of tests) {
    try {
      const isSuccess = await executeSingleTest(code, language, test.input, test.expected, timeLimit, memoryLimit);
      if (isSuccess) passed++;
    } catch (err) {
      console.error(`Test execution failed: ${err.message}`);
      // Continue to next test case even if one fails
    }
  }

  return passed;
}
