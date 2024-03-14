import type { LitElement, ReactiveController, ReactiveControllerHost } from 'lit';

export type FunctionParams<T> = T extends (...args: infer U) => string ? U : [];

export interface Translation {
  $code: string; // e.g. en, en-GB
  $name: string; // e.g. English, Español
  $dir: 'ltr' | 'rtl';
}

export interface ExistsOptions {
  lang: string;
  includeDefault: boolean;
}

const connectedElements = new Set<HTMLElement>();
const documentElementObserver = new MutationObserver(update);
const translations: Map<string, Translation> = new Map();
let documentDirection = document.documentElement.dir || 'ltr';
let documentLanguage = document.documentElement.lang || navigator.language;
let defaultTranslation: Translation;

// Watch for changes on <html lang>
documentElementObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['dir', 'lang']
});

/** Registers the default (fallback) translation. */
export function registerDefaultTranslation(translation: Translation) {
  defaultTranslation = translation;
  update();
}

/** Registers one or more translations */
export function registerTranslation(...translation: Translation[]) {
  translation.map(t => {
    const code = t.$code.toLowerCase();

    if (translations.has(code)) {
      // Merge translations that share the same language code
      translations.set(code, { ...translations.get(code), ...t });
    } else {
      translations.set(code, t);
    }
  });

  update();
}

/** Updates all localized elements that are currently connected */
export function update() {
  documentDirection = document.documentElement.dir || 'ltr';
  documentLanguage = document.documentElement.lang || navigator.language;

  [...connectedElements.keys()].map((el: LitElement) => {
    if (typeof el.requestUpdate === 'function') {
      el.requestUpdate();
    }
  });
}

/**
 * Localize Reactive Controller for components built with Lit
 *
 * To use this controller, import the class and instantiate it in a custom element constructor:
 *
 * private localize = new Localize(this);
 *
 * This will add the element to the set and make it respond to changes to <html dir|lang> automatically. To make it
 * respond to changes to its own dir|lang properties, make it a property:
 *
 *   @property() dir: string;
 *   @property() lang: string;
 *
 * To use a translation method, call it like this:
 *
 *   ${this.localize.term('term_key_here')}
 *   ${this.localize.date('2021-12-03')}
 *   ${this.localize.number(1000000)}
 */
export class Localize<UserTranslation extends Translation> implements ReactiveController {
  host: ReactiveControllerHost & HTMLElement;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.host = host;
    this.host.addController(this);
  }

  hostConnected() {
    connectedElements.add(this.host);
  }

  hostDisconnected() {
    connectedElements.delete(this.host);
  }

  /**
   * Gets the host element's directionality as determined by the `dir` attribute. The return value is transformed to
   * lowercase.
   */
  dir() {
    return `${this.host.dir || documentDirection}`.toLowerCase();
  }

  /**
   * Gets the host element's language as determined by the `lang` attribute. The return value is transformed to
   * lowercase.
   */
  lang() {
    return `${this.host.lang || documentLanguage}`.toLowerCase();
  }

  private getTranslationData(lang: string) {
    // Convert "en_US" to "en-US". Note that both underscores and dashes are allowed per spec, but underscores result in
    // a RangeError by the call to `new Intl.Locale()`. See: https://unicode.org/reports/tr35/#unicode-locale-identifier
    const locale = new Intl.Locale(lang.replace(/_/g, '-'));
    const language = locale?.language.toLowerCase();
    const region = locale?.region?.toLowerCase() ?? '';
    const primary = <UserTranslation>translations.get(`${language}-${region}`);
    const secondary = <UserTranslation>translations.get(language);

    return { locale, language, region, primary, secondary };
  }

  /** Determines if the specified term exists, optionally checking the default translation. */
  exists<K extends keyof UserTranslation>(key: K, options: Partial<ExistsOptions>): boolean {
    const { primary, secondary } = this.getTranslationData(options.lang ?? this.lang());

    options = {
      includeDefault: false,
      ...options
    };

    if (
      (primary && primary[key]) ||
      (secondary && secondary[key]) ||
      (options.includeDefault && defaultTranslation && defaultTranslation[key as keyof Translation])
    ) {
      return true;
    }

    return false;
  }

  /** Outputs a translated term. */
  term<K extends keyof UserTranslation>(key: K, ...args: FunctionParams<UserTranslation[K]>): string {
    const { primary, secondary } = this.getTranslationData(this.lang());
    let term: any;

    // Look for a matching term using regionCode, code, then fallback to the default
    if (primary && primary[key]) {
      term = primary[key];
    } else if (secondary && secondary[key]) {
      term = secondary[key];
    } else if (defaultTranslation && defaultTranslation[key as keyof Translation]) {
      term = defaultTranslation[key as keyof Translation];
    } else {
      console.error(`No translation found for: ${String(key)}`);
      return String(key);
    }

    if (typeof term === 'function') {
      return term(...args) as string;
    }

    return term;
  }

  /** Outputs a localized date in the specified format. */
  date(dateToFormat: Date | string, options?: Intl.DateTimeFormatOptions): string {
    dateToFormat = new Date(dateToFormat);
    return new Intl.DateTimeFormat(this.lang(), options).format(dateToFormat);
  }

  /** Outputs a localized number in the specified format. */
  number(numberToFormat: number | string, options?: Intl.NumberFormatOptions): string {
    numberToFormat = Number(numberToFormat);
    return isNaN(numberToFormat) ? '' : new Intl.NumberFormat(this.lang(), options).format(numberToFormat);
  }

  /** Outputs a localized time in relative format. */
  relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string {
    return new Intl.RelativeTimeFormat(this.lang(), options).format(value, unit);
  }
}
