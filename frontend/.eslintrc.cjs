module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // El spinner a mano dentro de `startIcon` era el patrón viejo, copiado en
    // ~26 sitios. Ya está todo migrado a <LoadingButton loading={...}>; esta
    // regla evita que vuelva a entrar por la puerta de atrás.
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "JSXAttribute[name.name='startIcon'] JSXIdentifier[name='CircularProgress']",
        message:
          'No metas el spinner a mano en startIcon: usa <LoadingButton loading={mutation.isPending}>.',
      },
    ],
  },
}
