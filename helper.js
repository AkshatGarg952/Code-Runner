import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const TEMP_ROOT = process.env.CODE_RUN_TEMP_DIR || path.join(os.tmpdir(), 'code_run_workdir');
fs.ensureDirSync(TEMP_ROOT);

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

const languageConfig = {
  cpp: {
    fileName: 'main.cpp',
    compileCmd: 'g++ -std=c++17 main.cpp -O2 -o main',
    runCmd: './main',
    image: 'code-runner:latest'
  },
  python: {
    fileName: 'main.py',
    compileCmd: null,
    runCmd: 'python3 main.py',
    image: 'code-runner:latest'
  },
  java: {
    fileName: 'Main.java',
    compileCmd: 'javac Main.java',
    runCmd: 'java Main',
    image: 'code-runner:latest'
  }
};

export async function executeCode(code, language, tests, timeLimit = 2, memoryLimit = 300) {
  if (!languageConfig[language]) throw new Error('Unsupported language');
  if (!code || typeof code !== 'string') throw new Error('Code must be a non-empty string');
  if (!Array.isArray(tests) || tests.length === 0) throw new Error('Tests must be a non-empty array');

  const effectiveTimeLimit = Math.min(timeLimit, 10);
  const effectiveMemoryLimit = Math.min(memoryLimit, 1024);

  const id = uuidv4();
  const workdir = path.join(TEMP_ROOT, id);
  let docker = null;

  try {
    await fs.ensureDir(workdir);

    const cfg = languageConfig[language];
    const codePath = path.join(workdir, cfg.fileName);
    await fs.writeFile(codePath, code, 'utf8');

    // write testcases
    for (let i = 0; i < tests.length; i++) {
      await fs.writeFile(path.join(workdir, `input${i + 1}.txt`), tests[i].input, 'utf8');
      await fs.writeFile(path.join(workdir, `expected${i + 1}.txt`), tests[i].expected, 'utf8');
    }

    const compileCmd = cfg.compileCmd ? `${cfg.compileCmd} 2> compile.err` : 'true';
    const runLines = tests
      .map(
        (_, i) =>
          `/usr/bin/timeout ${effectiveTimeLimit}s bash -c "${cfg.runCmd} < input${i + 1}.txt > output${i + 1}.txt 2> run${i + 1}.err" || true`
      )
      .join(' && ');

    const fullCmd = `${compileCmd} && ${runLines}`;

    const dockerArgs = [
      'run', '--rm',
      '--network', 'none',
      '--memory', `${effectiveMemoryLimit}m`,
      '--cpus', '0.5',
      '--pids-limit', '64',
      '-v', `${workdir}:/work:rw`,
      '-w', '/work',
      '--cgroupns=host',
      cfg.image,
      'bash', '-lc', fullCmd
    ];

    // Verify Docker image exists
    try {
      await new Promise((resolve, reject) => {
        const check = spawn('docker', ['image', 'inspect', cfg.image]);
        check.on('close', code => (code === 0 ? resolve() : reject(new Error(`Docker image ${cfg.image} not found`))));
        check.on('error', reject);
      });
    } catch (err) {
      throw new Error(`Failed to verify Docker image: ${err.message}`);
    }

    docker = spawn('docker', dockerArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';

    docker.stdout.on('data', d => (stdout += d.toString()));
    docker.stderr.on('data', d => (stderr += d.toString()));

    await new Promise(resolve => {
      docker.on('close', resolve);
      docker.on('error', err => {
        stderr += `Docker error: ${err.message}\n`;
        resolve(1);
      });
    });

    // ----- Check for compilation error -----
    let compileErr = null;
    if (cfg.compileCmd) {
      const compileErrPath = path.join(workdir, 'compile.err');
      if (await fs.pathExists(compileErrPath)) {
        const c = (await fs.readFile(compileErrPath, 'utf8')).trim();
        if (c.length) {
          compileErr = c;
          return {
            isError: true,
            errorType: 'Compilation Error',
            message: 'Compilation failed due to syntax or semantic error',
          };
        }
      }
    }

    // ----- Run test results -----
    for (let i = 0; i < tests.length; i++) {
      const outPath = path.join(workdir, `output${i + 1}.txt`);
      const runErrPath = path.join(workdir, `run${i + 1}.err`);
      const expectedPath = path.join(workdir, `expected${i + 1}.txt`);
      const inputPath = path.join(workdir, `input${i + 1}.txt`);

      const produced = (await fs.pathExists(outPath)) ? (await fs.readFile(outPath, 'utf8')) : '';
      const runErr = (await fs.pathExists(runErrPath)) ? (await fs.readFile(runErrPath, 'utf8')) : '';
      const expected = await fs.readFile(expectedPath, 'utf8');
      const input = await fs.readFile(inputPath, 'utf8');

      const normalize = (s) =>
        s.replace(/\r\n/g, '\n')
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
          .trimEnd();

      const timeoutOccurred = runErr.includes('Command terminated') || runErr.includes('timeout');
      const memoryExceeded = runErr.toLowerCase().includes('killed') || runErr.toLowerCase().includes('oom');
      const runtimeError = runErr.toLowerCase().includes('segmentation') ||
                           runErr.toLowerCase().includes('abort') ||
                           runErr.toLowerCase().includes('runtime');

      const passed = normalize(produced) === normalize(expected);

      // Check error types and stop immediately
      if (timeoutOccurred) {
        return {
          isError: true,
          errorType: 'Time Limit Exceeded',
          message: 'Execution exceeded the time limit',
          result: { input }
        };
      }

      if (memoryExceeded) {
        return {
          isError: true,
          errorType: 'Memory Limit Exceeded',
          message: 'Process exceeded allowed memory limit',
          result: { input }
        };
      }

      if (runtimeError) {
        return {
          isError: true,
          errorType: 'Runtime Error',
          message: 'Runtime error occurred during execution',
          result: { input }
        };
      }

      if (!passed) {
        return {
          isError: true,
          errorType: 'Wrong Answer',
          message: 'Output did not match expected result',
          result: { input }
        };
      }
    }

    // If reached here => All passed
    return {
      isError: false,
      message: 'All test cases passed successfully'
    };

  } catch (err) {
    return {
      isError: true,
      errorType: 'System Error',
      message: `Execution failed: ${err.message}`
    };
  } finally {
    if (!process.env.DEBUG_CODE_RUN) {
      try {
        await fs.remove(workdir);
      } catch (e) {
        console.error(`Failed to clean up workdir ${workdir}:`, e);
      }
    }
  }
}

