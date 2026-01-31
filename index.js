import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { getTestcases, executeCode, executeCustomTests } from './helper.js';
import { validateRunRequest } from './middleware/validator.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post('/run', validateRunRequest, async (req, res) => {
  let { code, language, problem } = req.body;
  console.log('run', { language, problemId: problem.id || 'unknown' });

  const testcases = getTestcases(problem, false);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

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

app.post('/submit', validateRunRequest, async (req, res) => {
  let { code, language, problem } = req.body;
  console.log('submit', { language, problemId: problem.id || 'unknown' });

  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

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
  let { code, language, problem } = req.body;
  // problem can be an object or a string (though existing usage in decideWinner suggests it passes the full problem object)
  // If problem is just ID, we might need to fetch it? 
  // Looking at decideWinner.js, it passes the full `problem` object (which is retrieved from DB before calling).

  if (!code || !language || !problem) {
    return res.status(400).json({ error: 'Missing required fields: code, language, or problem' });
  }

  console.log('run-all', { language, problemId: problem.id || problem.problemId || 'unknown' });

  // executeAllTests expects tests array. getTestcases extracts them.
  // We want to run ALL tests (sample + hidden) so includeHidden = true
  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

  try {
    const passedCount = await import('./helper.js').then(m => m.executeAllTests(code, language, testcases, timeLimit, memoryLimit));

    // Response format expected by decideWinner line 14: response.data.passed
    res.json({
      success: true,
      passed: passedCount,
      total: testcases.length
    });

  } catch (err) {
    console.error('Error in /run-all:', err);
    res.status(500).json({ error: err.message });
  }
});


app.post('/execute', async (req, res) => {
  // Support both formats:
  // 1. { code, language, inputs: [...] }  (Original Code-Runner format)
  // 2. { code, language, problem: { testCases: [...] } } (Admin Controller format)

  let { code, language, inputs, problem, timeLimit = 2, memoryLimit = 256000 } = req.body;

  // Extract inputs if problem.testCases is provided
  if (!inputs && problem && problem.testCases && Array.isArray(problem.testCases)) {
    // Admin controller sends testCases as array of objects { input: "..." } or strings?
    // Looking at admin.controller.js line 28: hiddenTestTestInputs = testInputsResponse.data.hiddenTestCases
    // hiddenTestCases is result['valid_test_cases'] from python.
    // In HiddenForces valid_test_cases seems to be list of strings (input).
    // Let's verify if they are strings or objects. 
    // In admin.controller.js line 52: input: testInput.input || testInput
    // So it expects they might be objects or strings.
    // We should normalize them to strings for executeCustomTests which expects array of input strings.

    inputs = problem.testCases.map(tc => (typeof tc === 'object' && tc !== null && tc.input) ? tc.input : tc);
  }

  if (!code || !language || !inputs || !Array.isArray(inputs)) {
    return res.status(400).json({
      error: 'Missing required fields: code, language, and inputs (array) or problem.testCases'
    });
  }

  console.log('execute', { language, testCount: inputs.length });

  try {
    const results = await executeCustomTests(code, language, inputs, timeLimit, memoryLimit);
    res.json({ outputs: results.map(r => r.output || '') }); // Code-Runner originally returned detailed objects?
    // Wait, let's check original /execute implementation in Step 14.
    // It returned res.json({ outputs: results }); 
    // And results was array of { input, output, error? }.
    // admin.controller.js line 48: const outputs = hiddenTestsWithOutputs.data.outputs || [];
    // admin.controller.js line 53: output: outputs[index] || '' 
    // If outputs is array of objects, outputs[index] would be an object, not string.
    // So admin.controller EXPECTS outputs to be array of STRINGS (or at least used as such).
    // Let's check admin.controller.js line 53 again.
    // output: outputs[index] || ''
    // If outputs[index] is { output: "value" }, then output becomes [Object object] stringified if used directly.
    // BUT typically if it's assigned to output property of hiddenTests item.
    // Let's assume admin.controller expects array of output strings.
    // However, existing /execute endpoint returned array of objects: { input, output } (Lines 212-214 of helper.js).
    // If I change it to return strings only, I might break other consumers?
    // Only admin.controller seems to use it?
    // Let's preserve backward compatibility if possible, or fix admin controller if it's wrong.
    // Admin controller code: `output: outputs[index] || ''`.
    // If `outputs` is `[{output:'a'}, {output:'b'}]`, then `outputs[0]` is `{output:'a'}`.
    // `output: {output:'a'}`.
    // Then hiddenTests is `[{input:..., output: {output:'a'}}]`.
    // Then it is saved to DB.
    // Later used where?
    // Probably safer to map to strings here if the intention of admin controller is to get output string.
    // The admin controller logs "Generated X outputs".

    // I will modify the response to return what admin controller likely expects (strings) OR modify admin controller.
    // But I am supposed to align "request and response format".
    // Since admin controller is the CONSUMER, I should align to what IT expects?
    // Or assume IT expects the current format and handles it?
    // "output: outputs[index] || ''" suggests it treats it as a string or a value.
    // If it was expecting an object, it might do `outputs[index].output`.
    // So it seems admin controller expects `outputs` to be an array of STRINGS.
    // BUT current `executeCustomTests` returns objects.
    // So currently it is BROKEN (mismatch).
    // I should fix it to return array of strings OR fix admin controller.
    // User asked to "align request and response format ... so no error occurs".
    // I will modify this endpoint to return `outputs` as array of output strings, 
    // which aligns with `{ outputs: ["out1", "out2"] }`.

    const outputStrings = results.map(r => r.error ? `Error: ${r.error}` : r.output);
    res.json({ outputs: outputStrings });

  } catch (err) {
    console.error('Error executing code:', err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(config.port, () => {
  console.log(`Code Runner listening on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Rate limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`);
});
