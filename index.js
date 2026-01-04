import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { getTestcases, executeCode, executeSingleTest, executeCustomTests } from './helper.js';
import { validateRunRequest, validateCustomTestRequest } from './middleware/validator.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
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

app.post('/run-all', validateRunRequest, async (req, res) => {
  console.log('run-all', { language: req.body.language, problemId: req.body.problem.id || 'unknown' });
  const { code, language, problem } = req.body;

  const testcases = getTestcases(problem, true);
  const timeLimit = problem.timeLimit || 2;
  const memoryLimit = problem.memoryLimit || 256000;

  try {
    const testPromises = testcases.map(test =>
      executeSingleTest(code, language, test.input, test.expected, timeLimit, memoryLimit)
    );

    const results = await Promise.all(testPromises);

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

app.post('/run-custom-tests', validateCustomTestRequest, async (req, res) => {
  console.log('run-custom-tests', { language: req.body.language, testCount: req.body.testcases?.length || 0 });
  const { code, language, testcases, timeLimit = 2, memoryLimit = 256000 } = req.body;

  try {
    const results = await executeCustomTests(code, language, testcases, timeLimit, memoryLimit);
    res.json({ results });
  } catch (err) {
    console.error('Error running custom tests:', err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(config.port, () => {
  console.log(`🚀 Code Runner listening on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`⏱️  Rate limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`);
});
