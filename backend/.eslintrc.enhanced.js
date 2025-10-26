/**
 * Enhanced ESLint Configuration for Production-Ready Backend
 * Prevents common issues and enforces industry best practices
 */

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    // ===== PREVENT CONSOLE USAGE =====
    'no-console': [
      'error',
      {
        allow: [] // No console allowed - use logger instead
      }
    ],

    // ===== PREVENT REQUIRE() USAGE =====
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-var-requires': 'error',

    // ===== PREVENT UNSAFE TYPES =====
    '@typescript-eslint/no-unsafe-function-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn', // Warn first, then error
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    // ===== REQUIRE EXPLICIT TYPES =====
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions': true,
        allowHigherOrderFunctions: true,
      }
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',

    // ===== REMOVE UNUSED CODE =====
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }
    ],
    'no-unused-expressions': 'error',

    // ===== TYPE SAFETY =====
    '@typescript-eslint/strict-boolean-expressions': [
      'warn',
      {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
      }
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // ===== CODE QUALITY =====
    'no-duplicate-imports': 'error',
    'no-useless-return': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-arrow-callback': 'warn',

    // ===== SECURITY =====
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // ===== BEST PRACTICES =====
    'eqeqeq': ['error', 'always'],
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',

    // ===== MAINTAINABILITY =====
    'complexity': ['warn', 15],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', {max: 150, skipBlankLines: true, skipComments: true}],
    'max-nested-callbacks': ['warn', 3],

    // ===== ASYNC/AWAIT =====
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'warn',

    // ===== ERROR HANDLING =====
    'no-throw-literal': 'error',
    '@typescript-eslint/no-throw-literal': 'error',

    // ===== IMPORTS =====
    'sort-imports': [
      'warn',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
      }
    ],
  },
  overrides: [
    {
      // Test files can have more relaxed rules
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
      }
    },
    {
      // Migration files can use require()
      files: ['**/migrations/**/*.ts'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      }
    }
  ]
};

