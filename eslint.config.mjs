import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Enforce kebab-case for TS/TSX files and folders
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'check-file': checkFile,
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/**/*.{ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true, // allows *.test.ts
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          // kebab-case for all folders, excluding Next.js dynamic [id] and route groups (frontend)
          'src/**/!(*[*]*|*(*)*)/': 'KEBAB_CASE',
        },
      ],
    },
  },
  // Enforce kebab-case for SCSS files (uses processor since ESLint can't parse SCSS)
  {
    files: ['src/**/*.scss'],
    processor: 'check-file/eslint-processor-check-file',
    plugins: {
      'check-file': checkFile,
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/**/*.scss': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true, // allows *.module.scss
        },
      ],
    },
  },
]);

export default eslintConfig;
