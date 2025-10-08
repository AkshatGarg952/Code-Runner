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


const languageMap = {
  cpp: 54,       
  python: 71,    
  java: 62       
};

// Judge0 endpoint (use rapidapi if you want a free quota, or self-host)
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
const JUDGE0_HEADERS = {
  'content-type': 'application/json',
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || ''
};

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

      const payload = {
        language_id: languageMap[language],
        source_code: code,
        stdin: test.input,
        cpu_time_limit: timeLimit,      // seconds
        memory_limit: memoryLimit * 1024, // KB
      };

      const resp = await axios.post(JUDGE0_URL, payload, { headers: JUDGE0_HEADERS });
      const result = resp.data;

      // Check for runtime / compile errors
      if (result.status.id !== 3) { // 3 = Accepted
        let errorType = 'Runtime Error';
        if (result.status.id === 6) errorType = 'Compilation Error'; // Compilation Error
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
