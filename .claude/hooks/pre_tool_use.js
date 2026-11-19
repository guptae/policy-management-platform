// .claude/hooks/pre_tool_use.js — Policy Management Platform
// Blocks writes outside backend/, frontend/, output/ and the .claude/ build files.
// Bash: checks redirect targets (> and >>) only — a guardrail, not a sandbox.
const path = require('path');
const ALLOWED_DIRS = ['backend', 'frontend', 'output'];
const BUILD_PATHS = ['.claude', 'CLAUDE.md', 'README.md', 'docker-compose.yml', '.gitignore'];
// Project root is fixed, even when Claude changes into a subfolder
const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function isAllowed(p, base) {
    const rel = path.relative(ROOT, path.resolve(base, p)).split(path.sep).join('/');
    const inside = d => rel === d || rel.startsWith(d + '/');
    return ALLOWED_DIRS.some(inside) || BUILD_PATHS.some(inside);
}
function block(msg) {
    console.error('HOOK BLOCKED: ' + msg);
    process.exit(2);
}

let raw = '';
process.stdin.on('data', chunk => raw += chunk);
process.stdin.on('end', () => {
    let event;
    try {
        event = JSON.parse(raw);
    } catch {
        block('could not read hook input.');
    }
    const input = event.tool_input || {};
    const base = event.cwd || ROOT; // relative paths resolve from Claude's current folder
    if(event.tool_name === 'Bash') {
        const cmd = input.command || '';
        const targets = [...cmd.matchAll(/>{1,2}\s*([^\s;&|]+)/g)].map(m => m[1]);
        const bad = targets.filter(t => !t.startsWith('/dev/') && t.toUpperCase() !== 'NULL' && !isAllowed(t, base));
        if(bad.length) block('shell redirect outside allowed folders: ' + bad.join(', '));
        process.exit(0);
    }

    if(input.file_path && !isAllowed(input.file_path, base)) {
        block('writes only allowed in backend/, frontend/, output/. Attempted write to: ' + input.file_path);
    }
    process.exit(0);
});
