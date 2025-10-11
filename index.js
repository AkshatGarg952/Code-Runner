import express from 'express';
import { getTestcases, executeCode, executeSingleTest, executeCustomTests} from './helper.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// /run endpoint
app.post('/run', async (req, res) => {
  let { code, language, problem } = req.body;
  console.log('run', body)
  if (!code || !language || !problem) {
    return res.status(400).json({ error: 'Missing code/language/problem' });
  }

  const testcases = getTestcases(problem, false);
  const timeLimit = problem.timeLimit;
  const memoryLimit = problem.memoryLimit;

  try {
    const execResult = await executeCode(code, language, testcases, timeLimit, memoryLimit);

    if (!execResult.isError) {
      return res.json({
        isError: false,
        message: execResult.message
      });
    } else {
      return res.json({
        isError: true,
        errorType: execResult.errorType,
        message: execResult.message,
        result: execResult.result || null
      });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// /submit endpoint (same logic, includes hidden test cases)
app.post('/submit', async (req, res) => {
  let { code, language, problem } = req.body;
  console.log('submit', body)
  if (!code || !language || !problem) {
    return res.status(400).json({ error: 'Missing code/language/problem' });
  }

  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit;
  const memoryLimit = problem.memoryLimit;

  try {
    const execResult = await executeCode(code, language, testcases, timeLimit, memoryLimit);

    if (!execResult.isError) {
      return res.json({
        isError: false,
        message: execResult.message
      });
    } else {
      return res.json({
        isError: true,
        errorType: execResult.errorType,
        message: execResult.message,
        result: execResult.result || null
      });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/run-all', async (req, res) => {
  console.log('run-all', body)
  const { code, language, problem } = req.body;

  if (!code || !language || !problem) {
    return res.status(400).json({ error: 'Missing code/language/problem' });
  }

  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit;
  const memoryLimit = problem.memoryLimit;

  try {
    // Create an array of promises for all test cases
    const testPromises = testcases.map(test =>
      executeSingleTest(code, language, test.input, test.expected, timeLimit, memoryLimit)
    );

    // Wait for all to complete
    const results = await Promise.all(testPromises);

    // Count passed test cases
    const passedCount = results.filter(r => r === true).length;

    res.json({
      total: testcases.length,
      passed: passedCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/run-custom-tests', async (req, res) => {
  console.log('run-custom-tests', body)
  const { code, language, testcases, timeLimit, memoryLimit } = req.body;
  if (!code || !language || !Array.isArray(testcases)) {
    return res.status(400).json({ error: 'Missing code/language/testcases' });
  }

  try {
    const results = await executeCustomTests(code, language, testcases, timeLimit, memoryLimit);
    res.json({ results });
  } catch (err) {
    console.error('Error running custom tests:', err);
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Runner listening on ${PORT}`));





