import {
    merge,
    clone,
    decode,
    encode,
    dotate,
    isMatchingGlob,
    filterXSS,
    isEmpty,
    isUndefined,
    lowerFirst,
    isObject,
    traverse,
    traverseAsync,
    replaceAll,
} from './utils'
export { PrismaAppSync } from './core'
export { CustomError, log } from './inspector'
export {
    QueryParams,
    QueryParamsCustom,
    BeforeHookParams,
    AfterHookParams,
    Authorizations,
    Authorization,
    AppsyncEvent,
    Identity,
    API_KEY,
    AWS_IAM,
    AMAZON_COGNITO_USER_POOLS,
    AWS_LAMBDA,
    OPENID_CONNECT,
} from './defs'
declare const _: {
    queryBuilder: import('./defs').QueryBuilder
    merge: typeof merge
    clone: typeof clone
    decode: typeof decode
    encode: typeof encode
    dotate: typeof dotate
    isMatchingGlob: typeof isMatchingGlob
    filterXSS: typeof filterXSS
    isEmpty: typeof isEmpty
    isUndefined: typeof isUndefined
    lowerFirst: typeof lowerFirst
    isObject: typeof isObject
    traverse: typeof traverse
    traverseAsync: typeof traverseAsync
    replaceAll: typeof replaceAll
}
export { _ }
