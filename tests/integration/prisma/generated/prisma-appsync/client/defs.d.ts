import { PrismaClient } from '@prisma/client';
/**
 *
 * TYPES
 *
 */
export declare type PrismaAppSyncOptions = {
    generatedConfig?: any;
    connectionString?: string;
    sanitize?: boolean;
    debug?: boolean;
    defaultPagination?: number | false;
    maxDepth?: number;
};
export declare type Action = typeof Actions[keyof typeof Actions] | string;
export declare type ActionsAlias = keyof typeof ActionsAliases;
export declare type Operation = `${Action}${Capitalize<Model>}`;
export declare type Context = {
    action: Action;
    alias: Action | 'custom';
    model: Model | null;
};
export declare type QueryParams = {
    type: GraphQLType;
    operation: Operation | string;
    context: Context;
    fields: string[];
    paths: string[];
    args: any;
    prismaArgs: PrismaArgs;
    authorization: Authorization;
    identity: Identity;
};
export declare type Authorization = typeof Authorizations[keyof typeof Authorizations];
export declare type QueryParamsCustom = QueryParams & {
    prismaClient: PrismaClient;
};
export declare type QueryParamsBefore = QueryParams & {
    prismaClient: PrismaClient;
};
export declare type QueryParamsAfter = QueryParams & {
    prismaClient: PrismaClient;
    result: any | any[];
};
export declare type Shield = {
    [matcher: string]: {
        rule: boolean | object;
        reason?: string | Function;
    } | boolean;
};
export interface HooksProps {
    before: QueryParamsBefore;
    after: QueryParamsAfter;
}
export declare type HookPath<CustomResolvers> = `${Lowercase<ActionsAlias>}/${Lowercase<Model>}` | CustomResolvers;
export declare type HooksParameter<HookType extends 'before' | 'after', CustomResolvers extends string | null> = `${HookType}:${HookPath<CustomResolvers>}`;
export declare type HooksParameters<HookType extends 'before' | 'after', CustomResolvers extends string | null> = {
    [matcher in HooksParameter<HookType, CustomResolvers>]?: (props: HooksProps[HookType]) => Promise<any>;
};
export declare type Hooks<CustomResolvers extends string | null> = HooksParameters<'before', CustomResolvers> | HooksParameters<'after', CustomResolvers>;
export declare type ShieldAuthorization = {
    canAccess: boolean;
    reason: string | Function;
    prismaFilter: object;
    matcher: string;
};
export declare type ResolveParams<CustomResolvers extends string | null> = {
    event: AppsyncEvent;
    resolvers?: {
        [resolver in CustomResolvers]: ((props: QueryParamsCustom) => Promise<any>) | boolean;
    };
    shield?: (props: QueryParams) => Shield;
    hooks?: () => Hooks<CustomResolvers>;
};
export { PrismaClient };
export declare type Model = typeof Models[keyof typeof Models];
export declare type PrismaArgs = {
    where?: any;
    data?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
    skipDuplicates?: boolean;
    select?: any;
};
export declare type AppsyncEvent = {
    arguments: any;
    source: any;
    identity: AppSyncIdentity;
    request: any;
    info: {
        fieldName: string;
        parentTypeName: string;
        variables: any;
        selectionSetList: string[];
        selectionSetGraphQL: string;
    };
    prev: {
        result: any;
    };
    stash: any;
};
export declare type GraphQLType = 'Query' | 'Mutation' | 'Subscription';
export declare type API_KEY = null;
export declare type AWS_LAMBDA = {
    resolverContext: any;
};
export declare type AWS_IAM = {
    accountId: string;
    cognitoIdentityPoolId: string;
    cognitoIdentityId: string;
    sourceIp: string[];
    username: string;
    userArn: string;
    cognitoIdentityAuthType: string;
    cognitoIdentityAuthProvider: string;
};
export declare type AMAZON_COGNITO_USER_POOLS = {
    sub: string;
    issuer: string;
    username: string;
    claims: any;
    sourceIp: string[];
    defaultAuthStrategy: string;
    groups: string[];
};
export declare type AWS_OIDC = {
    claims: {
        sub: string;
        aud: string;
        azp: string;
        iss: string;
        exp: number;
        iat: number;
        gty: string;
    };
    sourceIp: string[];
    issuer: string;
    sub: string;
};
export declare type AppSyncIdentity = API_KEY | AWS_LAMBDA | AWS_IAM | AMAZON_COGNITO_USER_POOLS | AWS_OIDC;
export declare type Identity = AppSyncIdentity & {
    [key: string]: any;
};
/**
 *
 * CONSTS
 *
 */
export declare const Models: {
    User: "User";
    hiddenModel: "hiddenModel";
    Post: "Post";
};
export declare const ReservedPrismaKeys: string[];
export declare const Actions: {
    readonly get: "get";
    readonly list: "list";
    readonly count: "count";
    readonly createMany: "createMany";
    readonly updateMany: "updateMany";
    readonly deleteMany: "deleteMany";
    readonly create: "create";
    readonly update: "update";
    readonly upsert: "upsert";
    readonly delete: "delete";
    readonly onCreatedMany: "onCreatedMany";
    readonly onUpdatedMany: "onUpdatedMany";
    readonly onDeletedMany: "onDeletedMany";
    readonly onMutatedMany: "onMutatedMany";
    readonly onCreated: "onCreated";
    readonly onUpdated: "onUpdated";
    readonly onUpserted: "onUpserted";
    readonly onDeleted: "onDeleted";
    readonly onMutated: "onMutated";
};
export declare const ActionsAliases: {
    readonly access: "access";
    readonly batchAccess: "batchAccess";
    readonly create: "create";
    readonly batchCreate: "batchCreate";
    readonly delete: "delete";
    readonly batchDelete: "batchDelete";
    readonly modify: "modify";
    readonly batchModify: "modify";
    readonly subscribe: "subscribe";
    readonly batchSubscribe: "subscribe";
};
export declare const ActionsAliasesList: {
    readonly access: readonly ["get", "list", "count"];
    readonly batchAccess: readonly ["list", "count"];
    readonly create: readonly ["create", "createMany"];
    readonly batchCreate: readonly ["createMany"];
    readonly modify: readonly ["upsert", "update", "updateMany", "delete", "deleteMany"];
    readonly batchModify: readonly ["updateMany", "deleteMany"];
    readonly delete: readonly ["delete", "deleteMany"];
    readonly batchDelete: readonly ["deleteMany"];
    readonly subscribe: readonly ["onCreatedMany", "onUpdatedMany", "onDeletedMany", "onMutatedMany", "onCreated", "onUpdated", "onUpserted", "onDeleted", "onMutated"];
    readonly batchSubscribe: readonly ["onCreatedMany", "onUpdatedMany", "onDeletedMany", "onMutatedMany"];
};
export declare const ActionsList: string[];
export declare const BatchActionsList: string[];
export declare const Authorizations: {
    readonly API_KEY: "API_KEY";
    readonly AWS_IAM: "AWS_IAM";
    readonly AMAZON_COGNITO_USER_POOLS: "AMAZON_COGNITO_USER_POOLS";
    readonly AWS_LAMBDA: "AWS_LAMBDA";
    readonly AWS_OIDC: "AWS_OIDC";
};
