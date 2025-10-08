// helper.js
import axios from 'axios';

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

// Map languages to Judge0 language IDs
const languageMap = {
  cpp: 54,       // C++17
  python: 71,    // Python 3
  java: 62       // Java OpenJDK 17
};

// Judge0 CE API endpoint
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const JUDGE0_HEADERS = {
  'content-type': 'application/json',
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || ''
};

// Wait for result with polling
async function pollSubmission(token) {
  const url = `${JUDGE0_URL}/${token}?base64_encoded=false`;
  for (let i = 0; i < 30; i++) { // max 30 polls (~30s)
    const resp = await axios.get(url, { headers: JUDGE0_HEADERS });
    const result = resp.data;
    if (result.status.id >= 3) return result; // 3 = Accepted, >=3 = finished
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Judge0 request timed out');
}

export async function executeCode(code, language, tests, timeLimit = 2, memoryLimit = 300) {
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

      // Submit code asynchronously
      const payload = {
        language_id: languageMap[language],
        source_code: code,
        stdin: test.input,
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit * 1024 // KB
      };

      const submitResp = await axios.post(`${JUDGE0_URL}?base64_encoded=false`, payload, {
        headers: JUDGE0_HEADERS
      });

      const token = submitResp.data.token;
      const result = await pollSubmission(token);

      // Check for errors
      if (result.status.id !== 3) {
        let errorType = 'Runtime Error';
        if (result.status.id === 6) errorType = 'Compilation Error';
        if (result.status.id === 5) errorType = 'Time Limit Exceeded';
        if (result.status.id === 7) errorType = 'Memory Limit Exceeded';

        return {
          isError: true,
          errorType,
          message: result.stderr || result.compile_output || result.status.description,
          result: { input: test.input, expected: test.expected, output: result.stdout || '' }
        };
      }

      // Compare output
      const normalize = s => (s || '').replace(/\r\n/g, '\n').trim();
      if (normalize(result.stdout) !== normalize(test.expected)) {
        return {
          isError: true,
          errorType: 'Wrong Answer',
          message: 'Output did not match expected result',
          result: { input: test.input, expected: test.expected, output: result.stdout }
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
