import axios from 'axios';

// Get test cases
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

// Map languages to Judge0 IDs
const languageMap = {
  cpp: 54,       // C++17
  python: 71,    // Python 3
  java: 62       // Java OpenJDK 17
};

// Judge0 CE API
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const JUDGE0_HEADERS = {
  'content-type': 'application/json',
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || ''
};

// Poll Judge0 for result
async function pollSubmission(token) {
  const url = `${JUDGE0_URL}/${token}?base64_encoded=false`;
  for (let i = 0; i < 30; i++) { // max ~30s
    const resp = await axios.get(url, { headers: JUDGE0_HEADERS });
    const result = resp.data;
    if (result.status.id >= 3) return result; // 3 = Accepted
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Judge0 request timed out');
}

// Normalize output for comparison
function normalizeOutput(str) {
  return (str || '')
    .replace(/\r\n/g, '\n')  // Windows -> Unix newlines
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trimEnd();
}

// Execute code for multiple test cases
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

      // Submit to Judge0
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

      // Handle errors
      if (result.status.id !== 3) {
        let errorType = 'Runtime Error';
        if (result.status.id === 6) errorType = 'Compilation Error';
        if (result.status.id === 5) errorType = 'Time Limit Exceeded';
        if (result.status.id === 7) errorType = 'Memory Limit Exceeded';

        return {
          isError: true,
          errorType,
          message: result.stderr || result.compile_output || result.status.description,
          result: { input: test.input }  // ✅ Only first failing test input
        };
      }

      // Compare output
      const produced = normalizeOutput(result.stdout);
      const expected = normalizeOutput(test.expected);

      if (produced !== expected) {
        return {
          isError: true,
          errorType: 'Wrong Answer',
          message: 'Output did not match expected result',
          result: { input: test.input }  // ✅ Only first failing test input
        };
      }
    }

    // ✅ All passed
    return { isError: false, message: 'All test cases passed successfully' };

  } catch (err) {
    return {
      isError: true,
      errorType: 'System Error',
      message: err.message
    };
  }
}

export async function executeSingleTest(code, language, input, expected, timeLimit = 2, memoryLimit = 300) {
  if (!languageMap[language]) throw new Error(`Unsupported language: ${language}`);

  const payload = {
    language_id: languageMap[language],
    source_code: code,
    stdin: input,
    cpu_time_limit: timeLimit,
    memory_limit: memoryLimit * 1024
  };

  const submitResp = await axios.post(`${JUDGE0_URL}?base64_encoded=false`, payload, { headers: JUDGE0_HEADERS });
  const token = submitResp.data.token;

  const result = await pollSubmission(token);

  if (result.status.id !== 3) return false;

  const produced = normalizeOutput(result.stdout);
  const expectedNorm = normalizeOutput(expected);

  return produced === expectedNorm;
}

export async function executeCustomTests(code, language, testcases, timeLimit = 2, memoryLimit = 300) {
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
        memory_limit: memoryLimit * 1024 // MB → KB
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




