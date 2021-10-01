import { dot } from 'dot-object'
import { isMatch } from 'micromatch'
import deepmerge from 'deepmerge'
import { decode as decodeHtml, encode as encodeHtml } from 'html-entities'
import xss from 'xss'

/**
 * Deep merge objects (without mutating the target object).
 * @param sources object[]
 * @returns object
 */
export function merge(...sources: object[]): any {
    return deepmerge.all(sources)
}

/**
 * Deep clone object.
 * @param source object
 * @returns object
 */
export function clone(source: object): any {
    return deepmerge({}, source)
}

/**
 * Returns decoded text, replacing HTML special characters
 * @example decode('&lt; &gt; &quot; &apos; &amp; &#169; &#8710;')
 * // returns '< > " \' & © ∆'
 * @param {any} input - input
 * @returns {boolean} `true` or `false`
 */
export function decode(str: string): string {
    return decodeHtml(str)
}

/**
 * Returns encoded text, version of string.
 * @example encode('<script>alert("xss");</scr' + "ipt>")
 * @param {any} input - input
 * @returns {boolean} `true` or `false`
 */
export function encode(str: string): string {
    return encodeHtml(str)
}

/**
 * Transform an object to a dotted-key/value pair
 * @param source object
 * @returns object
 */
export function dotate(source: object): any {
    return dot(source)
}

/**
 * Returns true if specified path matches any of the glob patterns.
 * @param path string
 * @param globPatterns string|string[]
 * @returns boolean
 */
export function isMatchingGlob(path: string, globPatterns: string | string[]): boolean {
    return isMatch(path, globPatterns)
}

/**
 * Sanitize untrusted HTML to prevent XSS.
 * @param str string
 * @returns string
 */
export function filterXSS(str: string): string {
    return xss(str)
}

/**
 * Return true if element is Empty
 * @param element any
 * @returns boolean
 */
export function isEmpty(element: any): boolean {
    switch (element) {
        case null:
        case undefined:
        case typeof element === 'undefined':
        case typeof element === 'string' && element.trim() === '':
        case Array.isArray(element) && element.length === 0:
        case Object.getPrototypeOf(element) === Object.prototype && Object.keys(element).length === 0:
            return true
        default:
            return false
    }
}
