import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { getTestcases, executeAllTests, executeCode, executeCustomTests } from './helper.js';
import { validateRunRequest } from './middleware/validator.js';

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  skip: (req) => req.path === '/health',
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '2mb' }));

const executionQueue = [];
let activeExecutions = 0;

const drainExecutionQueue = () => {
  while (activeExecutions < config.execution.maxConcurrent && executionQueue.length > 0) {
    const { task, resolve, reject } = executionQueue.shift();
    activeExecutions += 1;

    Promise.resolve()
      .then(task)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeExecutions -= 1;
        drainExecutionQueue();
      });
  }
};

const scheduleExecution = (task) => new Promise((resolve, reject) => {
  const isQueueFull =
    activeExecutions >= config.execution.maxConcurrent &&
    executionQueue.length >= config.execution.maxQueueSize;

  if (isQueueFull) {
    const error = new Error('Execution queue is full. Please retry in a few seconds.');
    error.statusCode = 503;
    reject(error);
    return;
  }

  executionQueue.push({ task, resolve, reject });
  drainExecutionQueue();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeExecutions,
    queuedExecutions: executionQueue.length,
    maxConcurrentExecutions: config.execution.maxConcurrent
  });
});

app.post('/run', validateRunRequest, async (req, res) => {
  let { code, language, problem } = req.body;

  const testcases = getTestcases(problem, false);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

  try {
    const execResult = await scheduleExecution(() =>
      executeCode(code, language, testcases, timeLimit, memoryLimit)
    );

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
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/submit', validateRunRequest, async (req, res) => {
  let { code, language, problem } = req.body;

  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

  try {
    const execResult = await scheduleExecution(() =>
      executeCode(code, language, testcases, timeLimit, memoryLimit)
    );

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
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});



app.post('/run-all', async (req, res) => {
  let { code, language, problem } = req.body;

  if (!code || !language || !problem) {
    return res.status(400).json({ error: 'Missing required fields: code, language, or problem' });
  }

  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

  try {
    const passedCount = await scheduleExecution(() =>
      executeAllTests(code, language, testcases, timeLimit, memoryLimit)
    );

    res.json({
      success: true,
      passed: passedCount,
      total: testcases.length
    });

  } catch (err) {
    console.error('Error in /run-all:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});


app.post('/execute', async (req, res) => {
  let { code, language, inputs, problem, timeLimit = 2, memoryLimit = 256000 } = req.body;

  if (!inputs && problem && problem.testCases && Array.isArray(problem.testCases)) {
    inputs = problem.testCases.map(tc => (typeof tc === 'object' && tc !== null && tc.input) ? tc.input : tc);
  }

  if (!code || !language || !inputs || !Array.isArray(inputs)) {
    return res.status(400).json({
      error: 'Missing required fields: code, language, and inputs (array) or problem.testCases'
    });
  }

  try {
    const results = await scheduleExecution(() =>
      executeCustomTests(code, language, inputs, timeLimit, memoryLimit)
    );
    const outputStrings = results.map(r => r.error ? `Error: ${r.error}` : r.output);
    res.json({ outputs: outputStrings });

  } catch (err) {
    console.error('Error executing code:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});


app.listen(config.port, () => {
  console.log(`Code Runner listening on port ${config.port}`);
});
