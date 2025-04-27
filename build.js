const { build } = require('esbuild');
const glob = require('glob');

(async () => {
    // Find all TypeScript files
    const entryPoints = glob.sync('src/**/*.ts');

    try {
        await build({
            entryPoints,
            outdir: 'dist',
            bundle: false,
            platform: 'node',
            target: 'node18',
            format: 'cjs',
            minify: process.env.NODE_ENV === 'production',
            sourcemap: process.env.NODE_ENV !== 'production',
        });
        console.log('Build complete');
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
})();
