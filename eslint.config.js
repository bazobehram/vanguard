import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            '.vanguard_temp/**',
            '.vanguard_sim/**',
            'vanguard-cache/**',
            'test/fixtures/**',
        ],
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
            semi: ['error', 'always'],
            quotes: ['error', 'single'],
        },
    },
    {
        ignores: ['node_modules/', 'dist/', '.vanguard_sim/', 'test/**'],
    },
];
