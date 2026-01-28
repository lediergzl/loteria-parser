import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig([
  // ESM bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/esm/bundle.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.esm.json'
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ],
    external: ['decimal.js', 'lodash.merge']
  },
  
  // CJS bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/cjs/bundle.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ],
    external: ['decimal.js', 'lodash.merge']
  },
  
  // Type definitions
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
]);