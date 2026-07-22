# Changelog

## Unreleased

- Fixed a bug where `lang()` returned invalid language tags verbatim, causing `date()`, `number()`, and `relativeTime()` to throw an unhandled `RangeError`; invalid tags now fall back to the default translation's language or `en`
- Underscore-separated tags such as `en_US` are normalized to hyphens, e.g. `en-us`

## 3.0.1

- Fixed a bug that caused an error to be logged in the console when `lang` was set to an invalid value
- Fixed a type error in `update()`

## 3.0.0

- `term()` now catches errors thrown by translation functions and logs a warning instead of letting them bubble up
- Fixed an incorrect import path in the Lit example in the README
- Switched `clean` script to `rimraf` and added a `check-updates` script
- Added `cspell` config

## 2.0.0

- [breaking] Improved translation file format so args are named instead of order-based

## 1.1.0

- Added support for SSR environments

## 1.0.0

- Initial fork
