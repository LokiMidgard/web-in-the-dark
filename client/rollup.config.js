import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import { defineConfig } from 'rollup';
import copy from 'rollup-plugin-copy'

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'startDev', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}


const COMMON = function (input, index) {

	const appName = typeof input === "string" ? input : input.name;
	const fileName = input.file == undefined ? appName : input.file;
	const appPath = input.path == undefined ? appName : input.path;



	return defineConfig({
		input: `src/${appName}.ts`,
		output: {
			sourcemap: true,
			format: 'iife',
			name: 'app',
			file: `../dist/public/build/${appPath}/bundle.js`
		},
		plugins: [
			svelte({
				preprocess: sveltePreprocess({ sourceMap: !production }),
				compilerOptions: {
					// enable run-time checks when not in production
					dev: !production
				}
			}),
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css({ output: 'bundle.css' }),

			// If you have external dependencies installed from
			// npm, you'll most likely need these plugins. In
			// some cases you'll need additional configuration -
			// consult the documentation for details:
			// https://github.com/rollup/plugins/tree/master/packages/commonjs
			resolve({
				browser: true,
				dedupe: ['svelte']
			}),
			commonjs(),
			typescript({
				sourceMap: !production,
				inlineSources: !production
			}),
			copy({
				targets: [{
					src: 'public/template.html',
					dest: `../dist/public/`,
					rename: `${fileName}.html`,
					transform: (content, filename) => content.toString().replaceAll('__Name__', appPath)
				}
				]
			}),

			index == 0 && copy({
				targets: [{
					src: ['public/**/*', '!**/template.html'],
					dest: `../dist/public/`
				}
				]
			}),
			// In dev mode, call `npm run start` once
			// the bundle has been generated
			// only use serve once
			index == 0 && !production && serve(),

			// Watch the `public` directory and refresh the
			// browser on changes when not in production
			!production && livereload('public'),

			// If we're building for production (npm run build
			// instead of npm run dev), minify
			production && terser()
		],
		watch: {
			clearScreen: false
		}
	});
}



const apps = [{ name: 'main', file: 'index' }, 'invite', 'login'];

export default apps.map(COMMON);