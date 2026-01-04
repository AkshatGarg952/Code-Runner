const supportedLanguages = ['python', 'cpp', 'java', 'javascript', 'c', 'csharp', 'ruby', 'go', 'rust'];

export function validateRunRequest(req, res, next) {
    const { code, language, problem } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid "code" field (must be a non-empty string)'
        });
    }

    if (!language || !supportedLanguages.includes(language.toLowerCase())) {
        return res.status(400).json({
            success: false,
            error: `Invalid or unsupported language. Supported: ${supportedLanguages.join(', ')}`
        });
    }

    if (!problem || typeof problem !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid "problem" field (must be an object)'
        });
    }

    next();
}

export function validateCustomTestRequest(req, res, next) {
    const { code, language, testcases } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid "code" field (must be a non-empty string)'
        });
    }

    if (!language || !supportedLanguages.includes(language.toLowerCase())) {
        return res.status(400).json({
            success: false,
            error: `Invalid or unsupported language. Supported: ${supportedLanguages.join(', ')}`
        });
    }

    if (!Array.isArray(testcases) || testcases.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid "testcases" field (must be a non-empty array)'
        });
    }

    for (let i = 0; i < testcases.length; i++) {
        if (typeof testcases[i] !== 'string') {
            return res.status(400).json({
                success: false,
                error: `Invalid testcase at index ${i} (must be a string)`
            });
        }
    }

    next();
}
