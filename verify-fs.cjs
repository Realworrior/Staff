const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   VERCEL FS DEBUGGER');
console.log('================================================================');
console.log('CWD:', process.cwd());

try {
    console.log('\n--- Directory Structure (src) ---');
    if (fs.existsSync('src')) {
        // Recursive walk (compatible with older Node versions)
        // recursive option requires Node 20+, fallback for older node
        // Simple recursive function
        function walk(dir, level) {
            if (level > 4) return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                console.log('  '.repeat(level) + item + (stats.isDirectory() ? '/' : ''));
                if (stats.isDirectory()) {
                    walk(fullPath, level + 1);
                }
            }
        }
        walk('src', 0);
    } else {
        console.error('!!! SRC DIRECTORY DOES NOT EXIST !!!');
        const rootItems = fs.readdirSync('.');
        console.log('Root items:', rootItems);
    }

    console.log('\n--- tsconfig.app.json Content ---');
    if (fs.existsSync('tsconfig.app.json')) {
        console.log(fs.readFileSync('tsconfig.app.json', 'utf8'));
    } else {
        console.error('tsconfig.app.json missing!');
    }

} catch (err) {
    console.error('Debug script error:', err);
}

console.log('================================================================');
