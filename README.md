# Squeak

Squeak is a tiny, zero-dependency library that provides localization tools for custom elements and web applications. It includes a [Reactive Controller](https://lit.dev/docs/composition/controllers/) for Lit components, as well as a standalone class for use in any JavaScript context. It localizes terms, dates, numbers, and currency with a minimal footprint. It _does not_ aim to replicate a full-blown localization tool.

Reactive Controllers are supported by Lit out of the box, but they're designed to be generic so other libraries can elect to support them either natively or through an adapter. If your favorite custom element authoring library doesn't support Reactive Controllers yet, consider asking the maintainers to add support for them!

## Overview

Here's an example of how Squeak can be used to create a localized custom element with Lit.

```ts
import { LocalizeReactiveController, registerTranslation } from '@quietui/squeak';

// Note: translations can also be lazy loaded (see "Registering Translations" below)
import en from '../translations/en';
import es from '../translations/es';

registerTranslation(en, es);

@customElement('my-element')
export class MyElement extends LitElement {
  private localize = new LocalizeReactiveController(this).localize;

  @property() lang: string;

  render() {
    return html`
      <h1>${this.localize.term('hello_world')}</h1>
    `;
  }
}
```

To set the page locale, apply the desired `lang` attribute to the `<html>` element.

```html
<html lang="es">
  ...
</html>
```

Changes to `<html lang>` will trigger an update to all localized components automatically.

## Why use Squeak instead of a proper i18n library?

It's not uncommon for a custom element to require localization, but implementing it at the component level is challenging. For example, how should we provide a translation for this close button that exists in a custom element's shadow root?

```html
#shadow-root
  <button type="button" aria-label="Close">
    <svg>...</svg>
  </button>
```

Typically, custom element authors dance around the problem by exposing attributes or properties for such purposes.

```html
<my-element close-label="${t('close')}">
  ...
</my-element>
```

But this approach offloads the problem to the user so they have to provide every term, every time. It also doesn't scale with more complex components that have more than a handful of terms to be translated.

This is the use case this library is solving for. It is not intended to solve localization at the framework level. There are much better tools for that.

## How it works

To achieve this goal, we lean on HTML's [`lang`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang) attribute to determine what language should be used. The default locale is specified by `<html lang="...">`, but any localized element can be scoped to a locale by setting its `lang` attribute. This means you can have more than one language per page, if desired.

```html
<html lang="en">
<body>
  <my-element>This element will be English</my-element>
  <my-element lang="es">This element will be Spanish</my-element>
  <my-element lang="fr">This element will be French</my-element>
</body>
</html>
```

This library provides a set of tools to localize dates, currencies, numbers, and terms in your custom element library with a minimal footprint. Reactivity is achieved with a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) that listens for `lang` changes on `<html>`.

By design, `lang` attributes on ancestor elements are ignored. This is for performance reasons, as there isn't an efficient way to detect the "current language" of an arbitrary element. I consider this a gap in the platform and [I've proposed properties](https://github.com/whatwg/html/issues/7039) to make this lookup less expensive.

Fortunately, the majority of use cases appear to favor a single language per page. However, multiple languages per page are also supported, but you'll need to explicitly set the `lang` attribute on all components whose language differs from the one set in `<html lang>`.

## Usage

First, install the library.

```bash
npm install @quietui/squeak
```

Next, follow these steps to localize your components.

1. Create a translation
2. Register the translation
3. Localize your components

### Creating a translation

All translations must extend the `Translation` type and implement the required meta properties (denoted by a `$` prefix). Additional terms can be implemented as show below.

```ts
// en.ts
import type { Translation } from '@quietui/squeak';

const translation: Translation = {
  $code: 'en',
  $name: 'English',
  $dir: 'ltr',

  // Simple terms
  upload: 'Upload',

  // Terms with placeholders
  greetUser: (name: string) => `Hello, ${name}!`,

  // Plurals
  numFilesSelected: (count: number) => {
    if (count === 0) return 'No files selected';
    if (count === 1) return '1 file selected';
    return `${count} files selected`;
  }
};

export default translation;
```

### Registering translations

Once you've created a translation, you need to register it before use. The first translation you register should be the default translation. The default translation acts as a fallback in case a term can't be found in another translation. As such, the default translation should be assumed to be complete at all times.

```ts
import { registerDefaultTranslation } from '@quietui/squeak';
import en from './en.js';

registerDefaultTranslation(en);
```

To register additional translations, call the `registerTranslation()` method. This example imports and register two more translations up front.

```ts
import { registerTranslation } from '@quietui/squeak';
import es from './es.js';
import ru from './ru.js';

registerTranslation(es, ru);
```

Translations registered with country codes such as `en-gb` are also supported. For example, if the user's language is set to _German (Austria)_, or `de-at`, the localizer will first look for a translation registered as `de-at` and then fall back to `de`. Thus, it's a good idea to register a base translation (e.g. `de`) to accompany those with country codes (e.g. `de-*`). This ensures users of unsupported regions will still receive a comprehensible translation.

#### Dynamic registrations

It's important to note that translations _do not_ have to be registered up front. You can register them on demand as the language changes in your app. Upon registration, localized components will update automatically.

Here's a sample function that dynamically loads a translation.

```ts
import { registerTranslation } from '@quietui/squeak';

async function changeLanguage(lang) {
  const availableTranslations = ['en', 'es', 'fr', 'de'];

  if (availableTranslations.includes(lang)) {
    const translation = await import(`/path/to/translations/${lang}.js`);
    registerTranslation(translation);
  }
}
```

### Localizing components

Squeak provides two ways to localize your components:

1. **`LocalizeReactiveController`** - A Reactive Controller for use with Lit and other libraries that support the pattern

2. **`Localize`** - A standalone class for use in any custom element or JavaScript context

#### Using the Reactive Controller (Lit)

You can use Squeak with any library that supports [Lit's Reactive Controller pattern](https://lit.dev/docs/composition/controllers/). In Lit, a localized custom element will look something like this.

```ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LocalizeReactiveController } from '@quietui/squeak';

@customElement('my-element')
export class MyElement extends LitElement {
  private localize = new LocalizeReactiveController(this).localize;

  // Make sure to make `dir` and `lang` reactive so the component will respond to changes to its own attributes
  @property() dir: string;
  @property() lang: string;

  render() {
    return html`
      <!-- Terms -->
      ${this.localize.term('hello')}

      <!-- Numbers/currency -->
      ${this.localize.number(1000, { style: 'currency', currency: 'USD'})}

      <!-- Dates -->
      ${this.localize.date('2021-09-15 14:00:00 ET', { month: 'long', day: 'numeric', year: 'numeric' })}

      <!-- Relative times -->
      ${this.localize.relativeTime(2, 'day', { style: 'short' })}

      <!-- Determining language -->
      ${this.localize.lang()}

      <!-- Determining directionality, e.g. 'ltr' or 'rtl' -->
      ${this.localize.dir()}
    `;
  }
}
```

The Reactive Controller automatically manages updates when the locale changes.

#### Using the standalone Localize class

If you're not using Lit or prefer manual control, you can use the `Localize` class directly. This is useful for vanilla JavaScript applications, third-party integrations, or any other context.

```ts
import { Localize } from '@quietui/squeak';

// Create a localize instance (passing <html> or any element with lang/dir attributes)
const localize = new Localize(document.documentElement);

// Output a term
console.log(localize.term('hello')); // Hello

// Output a date
console.log(localize.date(new Date(), { dateStyle: 'long' })); // November 9, 2025

// Output a number
console.log(localize.number(1000, { style: 'currency', currency: 'USD' })); // $1,000.00

// Output a relative time
console.log(localize.relativeTime(-2, 'day')); // 2 days ago
```

### Other methods

- `this.localize.exists()` - Determines if the specified term exists, optionally checking the default translation.

### Events

When the document's language or direction changes, or when a new translation is registered, the `squeak-locale-change` event will be dispatched from the `<html>` element (accessible in JavaScript via `document.documentElement`). You can use this to respond to locale changes from third-party integrations or when using the standalone `Localize` class.

```ts
document.documentElement.addEventListener('squeak-locale-change', () => {
  // Update your UI here
});
```

## Typed translations and arguments

Because translations are defined by the user, there's no way for TypeScript to automatically know about the terms you've defined. This means you won't get strongly typed arguments when calling `this.localize.term()`. However, you can solve this by extending `Translation` and `LocalizeReactiveController`.

In a separate file, e.g. `my-localize.ts`, add the following code.

```ts
import { LocalizeReactiveController } from '@quietui/squeak';
import type { Translation } from '@quietui/squeak';

// Extend the default controller with your custom translation
export class LocalizeController extends LocalizeReactiveController<MyTranslation> {}

// Export helper functions so you can import everything from this file
export { registerDefaultTranslation, registerTranslation } from '@quietui/squeak';

// Define your translation terms here
export interface MyTranslation extends Translation {
  myTerm: string;
  myOtherTerm: string;
  myTermWithArgs: (count: number) => string;
}
```

Now you can import `LocalizeController` from your custom file and get strongly typed translations when you use `this.localize.term()`!

## Advantages

- Lightweight
- Zero dependencies
- Supports simple terms, plurals, and complex translations
- Supports dates, numbers, and currencies using built-in [`Intl` APIs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- Good DX for custom element authors and consumers
  - Intuitive API for custom element authors
  - Consumers only need to load the translations they want and set the `lang` attribute
- Flexible integration options for non-Lit users
- Translations can be loaded up front or on demand
