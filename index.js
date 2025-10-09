import express from 'express';
import { getTestcases, executeCode } from './helper.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// /run endpoint
app.post('/run', async (req, res) => {
  let { code, language, problem } = req.body;

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

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Runner listening on ${PORT}`));
