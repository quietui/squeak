# Changelog

## 2.0.0

This version makes Squeak's localization capabilities more powerful. Previously, it only provided a Reactive Controller for use in Lit components. Now, it's flexible enough to integrate with third-party applications as a general tool for localization.

- 🚨 BREAKING: Renamed the `Localize` class to `LocalizeReactiveController` to make the Reactive Controller optional 
- Added a new `Localize` class that abstracts and exposes the library's core translation methods
- Added the `squeak-locale-change` event which gets dispatched from `<html>` when the document's language or direction changes and when a new translation is registered

## 1.1.0

- Added support for SSR environments

## 1.0.0

- Initial fork
