import lambdaRateLimiter from 'lambda-rate-limiter'
import type {
    Context,
    Options,
    PrismaClient,
    QueryParams,
    Shield,
    ShieldAuthorization,
    ShieldRule,
} from './defs'
import {
    ActionsList,
    BatchActionsList,
    DebugTestingKey,
} from './defs'
import { decode, encode, filterXSS, isEmpty, isMatchingGlob, merge, traverse, upperFirst } from './utils'
import { CustomError } from './inspector'

// https:// github.com/blackflux/lambda-rate-limiter
const limiter = lambdaRateLimiter({
    interval: 60 * 1000, // 60 seconds = 1 minute
})

/**
 * #### Sanitize data (parse xss + encode html).
 *
 * @param {any} data
 * @returns any
 */
export function sanitize(data: any): any {
    return traverse(data, ({ value, key }) => {
        let excludeChilds = false

        if (typeof key === 'string' && key === DebugTestingKey)
            excludeChilds = true

        if (typeof value === 'string')
            value = encode(filterXSS(value))

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
    return traverse(data, ({ value, key }) => {
        let excludeChilds = false

        if (typeof key === 'string' && key === DebugTestingKey)
            excludeChilds = true

        if (typeof value === 'string')
            value = decode(value)

        return { value, excludeChilds }
    })
}

/**
 * #### Returns an Shield authorization object for a given field.
 *
 * @param {any} options
 * @param {Shield} options.shield
 * @param {ShieldRule} options.shieldRule
 * @param {string} options.globPattern
 * @param {string} options.matcher
 * @param {Context} options.context
 * @returns Promise<ShieldAuthorization>
 */
async function getFieldAuthorization(
    { shield, shieldRule, globPattern, matcher, context }:
    {
        shield: Shield
        shieldRule: ShieldRule
        globPattern: string
        matcher: string
        context: Context
    },
): Promise<ShieldAuthorization> {
    const authorization: ShieldAuthorization = {
        canAccess: true,
        reason: String(),
        prismaFilter: {},
        matcher: String(),
        globPattern: String(),
    }

    if (typeof shieldRule === 'boolean') {
        authorization.canAccess = shield[matcher] as boolean
    }
    else {
        if (typeof shieldRule.rule === 'undefined')
            throw new Error('Badly formed shield rule.')

        if (typeof shieldRule.rule === 'boolean') {
            authorization.canAccess = shieldRule.rule
        }
        else if (typeof shieldRule.rule === 'function') {
            const ruleResult = shieldRule.rule(context)

            if (ruleResult instanceof Promise)
                authorization.canAccess = await ruleResult
            else if (typeof ruleResult === 'boolean')
                authorization.canAccess = ruleResult
            else
                throw new Error('Shield rule must return a boolean.')
        }
        else {
            authorization.canAccess = true
            if (!authorization.prismaFilter)
                authorization.prismaFilter = {}

            authorization.prismaFilter = merge(authorization.prismaFilter, shieldRule.rule)
        }
    }

    authorization.matcher = matcher
    authorization.globPattern = globPattern

    const isReasonDefined = typeof shieldRule !== 'boolean' && typeof shieldRule.reason !== 'undefined'
    let reason = `Matcher: ${authorization.matcher}`

    if (isReasonDefined && typeof shieldRule.reason === 'function')
        reason = shieldRule.reason(context)

    else if (isReasonDefined && typeof shieldRule.reason === 'string')
        reason = shieldRule.reason

    authorization.reason = reason

    return authorization
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
export async function getShieldAuthorization({
    shield,
    paths,
    context,
    options,
}: {
    shield: Shield
    paths: string[]
    context: Context
    options: Options
}): Promise<ShieldAuthorization> {
    const modelSingular = context.model ? upperFirst(context.model!) : String()

    let modelPlural = modelSingular

    if (options?.modelsMapping && modelSingular) {
        const models: any[] = Object.keys(options.modelsMapping)
        const modelPluralMatch = models.find((key: string) => {
            return options.modelsMapping[key] === modelSingular.toLowerCase() && key !== upperFirst(modelSingular)
        })
        if (modelPluralMatch)
            modelPlural = modelPluralMatch
    }

    const reqPaths = paths.map((path: string) => {
        if (context.model) {
            BatchActionsList.forEach((batchAction: string) => {
                path = path.replace(
                    `${batchAction}/${modelSingular.toLowerCase()}`,
                    `${batchAction}${upperFirst(modelPlural)}`,
                )
            })
            ActionsList.forEach((action: string) => {
                path = path.replace(`${action}/${modelSingular.toLowerCase()}`, `${action}${upperFirst(modelSingular)}`)
            })
        }
        return path
    })

    let authorization: ShieldAuthorization = {
        canAccess: true,
        reason: String(),
        prismaFilter: {},
        matcher: String(),
        globPattern: String(),
    }

    for (const matcher in shield) {
        const concurrentFieldsAuthCheck: Promise<any>[] = []

        let globPattern = matcher

        if (!globPattern.startsWith('/') && globPattern !== '**')
            globPattern = `/${globPattern}`

        for (let i = paths.length - 1; i >= 0; i--) {
            const reqPath: string = reqPaths[i]

            if (isMatchingGlob(reqPath, globPattern)) {
                const shieldRule = shield[matcher]

                concurrentFieldsAuthCheck.push(
                    getFieldAuthorization({ shield, shieldRule, globPattern, matcher, context }),
                )
            }
        }

        const fieldsAuthCheckResults = await Promise.allSettled(concurrentFieldsAuthCheck)

        for (let fieldIndex = 0; fieldIndex < fieldsAuthCheckResults.length; fieldIndex++) {
            const fieldAuthCheckResult = fieldsAuthCheckResults[fieldIndex]

            if (fieldAuthCheckResult.status === 'rejected') {
                throw new CustomError(fieldAuthCheckResult.reason, { type: 'INTERNAL_SERVER_ERROR' })
            }
            else {
                authorization = fieldAuthCheckResult.value

                if (!fieldAuthCheckResult.value.canAccess)
                    break
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
 * @param {any} options.fieldsMapping
 * @returns number
 */
export function getDepth(
    { paths, context, fieldsMapping }:
    { paths: string[]; context: Context; fieldsMapping: any },
): number {
    let depth = 0

    const stopPaths: string[] = []

    if (!isEmpty(fieldsMapping)) {
        for (const fieldMap in fieldsMapping) {
            if (fieldsMapping[fieldMap].type.toLowerCase() === 'json')
                stopPaths.push(String(fieldMap))
        }
    }

    paths.forEach((path: string) => {
        const stopPath = stopPaths.find((p: string) => path.includes(p))
        const stopLength = stopPath ? stopPath.split('/').length - 1 : undefined
        const parts = path.split('/').filter(Boolean).slice(2, stopLength ? stopLength + 2 : undefined)
        const pathDepth = parts.length

        if (pathDepth > depth)
            depth = pathDepth
    })

    if (context.model === null)
        depth += 1

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
        const hookParts = hookPath.split(':')
        const hookWhen = hookParts[0]
        const hookGlob = hookParts[1]
        const currentPath = QueryParams.operation

        return hookWhen === when && isMatchingGlob(currentPath, hookGlob)
    })

    let hookResponse = when === 'after'
        ? { ...QueryParams, result }
        : QueryParams

    if (matchingHooks.length > 0) {
        for (let index = 0; index < matchingHooks.length; index++) {
            const hookPath = matchingHooks[index]

            if (Object.prototype.hasOwnProperty.call(hooks, hookPath)) {
                hookResponse = await hooks[hookPath]({
                    ...QueryParams,
                    ...(typeof result !== 'undefined' && when === 'after' && { result }),
                    prismaClient,
                })
            }
        }
    }

    return hookResponse
}

export async function preventDOS({
    callerUuid,
    maxReqPerMinute,
}: {
    callerUuid: string
    maxReqPerMinute: number
}): Promise<{
    limitExceeded: boolean
    count: number
}> {
    let limitExceeded = false
    let count = -1

    try {
        count = await limiter.check(maxReqPerMinute, callerUuid)
    }
    catch (error) {
        limitExceeded = true
        count = maxReqPerMinute
    }

    return {
        limitExceeded,
        count,
    }
}
