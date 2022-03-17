import {
    PrismaClient,
    ShieldAuthorization,
    Shield,
    Context,
    ActionsAliasesList,
    QueryParams,
    DebugTestingKey,
} from './defs'
import { merge, encode, decode, filterXSS, isMatchingGlob, traverse } from './utils'
import { CustomError } from './inspector'

/**
 * #### Sanitize data (parse xss + encode html).
 *
 * @param {any} data
 * @returns any
 */
export function sanitize(data: any): any {
    return traverse(data, (value, key) => {
        let excludeChilds = false

        if (typeof key === 'string' && key === DebugTestingKey) {
            excludeChilds = true
        }
        if (typeof value === 'string') {
            value = encode(filterXSS(value))
        }

        return { value, excludeChilds }
    })
}

/**
 * #### Clarify data (decode html).
 *
 * @param {any} data
 * @returns any
 */
export function clarify(data: any): any {
    return traverse(data, (value, key) => {
        let excludeChilds = false

        if (typeof key === 'string' && key === DebugTestingKey) {
            excludeChilds = true
        }
        if (typeof value === 'string') {
            value = decode(value)
        }

        return { value, excludeChilds }
    })
}

/**
 * #### Returns an authorization object from a Shield configuration passed as input.
 *
 * @param {any} options
 * @param {Shield} options.shield
 * @param {string[]} options.paths
 * @param {Context} options.context
 * @returns ShieldAuthorization
 */
export function getShieldAuthorization({
    shield,
    paths,
    context,
}: {
    shield: Shield
    paths: string[]
    context: Context
}): ShieldAuthorization {
    const authorization: ShieldAuthorization = {
        canAccess: true,
        reason: String(),
        prismaFilter: {},
        matcher: String(),
        globPattern: String(),
    }

    for (let i = paths.length - 1; i >= 0; i--) {
        let path: string = paths[i]

        for (const matcher in shield) {
            let globPattern = matcher

            if (!globPattern.startsWith('/') && globPattern !== '**') globPattern = `/${globPattern}`

            for (const alias in ActionsAliasesList) {
                const actionsList = ActionsAliasesList[alias]
                globPattern = globPattern.replace(new RegExp(`${alias}/`, 'g'), `{${actionsList.join(',')}}/`)
            }

            if (isMatchingGlob(path, globPattern)) {
                const shieldRule = shield[matcher]

                if (typeof shieldRule === 'boolean') {
                    authorization.canAccess = shield[matcher] as boolean
                } else {
                    if (typeof shieldRule.rule === 'undefined') {
                        throw new CustomError(`Badly formed shield rule.`, { type: 'INTERNAL_SERVER_ERROR' })
                    }

                    if (typeof shieldRule.rule === 'boolean') {
                        authorization.canAccess = shieldRule.rule
                    } else {
                        authorization.canAccess = true
                        if (!authorization.prismaFilter) {
                            authorization.prismaFilter = {}
                        }
                        authorization.prismaFilter = merge(authorization.prismaFilter, shieldRule.rule)
                    }
                }

                authorization.matcher = matcher
                authorization.globPattern = globPattern

                const isReasonDefined = typeof shieldRule !== 'boolean' && typeof shieldRule.reason !== 'undefined'
                let reason = `Matcher: ${authorization.matcher}`

                if (isReasonDefined && typeof shieldRule.reason === 'function') {
                    reason = shieldRule.reason(context)
                } else if (isReasonDefined && typeof shieldRule.reason === 'string') {
                    reason = shieldRule.reason
                }

                authorization.reason = reason
            }
        }
    }

    return authorization
}

/**
 * #### Returns GraphQL query depth for any given Query.
 *
 * @param {any} options
 * @param {string[]} options.paths
 * @param {Context} options.context
 * @returns number
 */
export function getDepth({ paths, context }: { paths: string[]; context: Context }): number {
    let depth = 0

    paths.forEach((path: string) => {
        const pathDepth = path.split('/').length - 3
        if (pathDepth > depth) depth = pathDepth
    })

    if (context.model === null) depth += 1

    return depth
}

/**
 * #### Execute hooks that apply to a given Query.
 *
 * @param {any} options
 * @param {'before' | 'after'} options.when
 * @param {any} options.hooks
 * @param {PrismaClient} options.prismaClient
 * @param {QueryParams} options.QueryParams
 * @param {any | any[]} options.result
 * @returns Promise<void | any>
 */
export async function runHooks({
    when,
    hooks,
    prismaClient,
    QueryParams,
    result,
}: {
    when: 'before' | 'after'
    hooks: any
    prismaClient: PrismaClient
    QueryParams: QueryParams
    result?: any | any[]
}): Promise<void | any> {
    const matchingHooks = Object.keys(hooks).filter((hookPath: string) => {
        const hookWhen = hookPath.split(':')[0]
        const hookGlob = hookPath.split(':')[1]

        const currentPath =
            QueryParams.context.alias === 'custom'
                ? `${QueryParams.context.action}`
                : `${QueryParams.context.alias}/${QueryParams.context.model}`

        return hookWhen === when && isMatchingGlob(currentPath, hookGlob)
    })

    if (matchingHooks.length > 0) {
        for (let index = 0; index < matchingHooks.length; index++) {
            const hookPath = matchingHooks[index]

            if (Object.prototype.hasOwnProperty.call(hooks, hookPath)) {
                const hookResult = await hooks[hookPath]({
                    ...QueryParams,
                    ...(typeof result !== 'undefined' && when === 'after' && { result }),
                    prismaClient,
                })
                result = hookResult
            }
        }
    }

    return result
}
