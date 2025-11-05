import _ from 'lodash'
/* eslint-disable @typescript-eslint/no-explicit-any */

type SnakeToCamelCase<S extends string> =
    S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
    :   S

type CamelToSnakeCase<S extends string> =
    S extends `${infer First}${infer Rest}` ?
        `${First extends Lowercase<First> ? First : `_${Lowercase<First>}`}${CamelToSnakeCase<Rest>}`
    :   S

type CamelCaseKeys<T extends object> = {
    [K in keyof T as K extends string ? SnakeToCamelCase<K> : K]: T[K]
}

type SnakeCaseKeys<T extends object> = {
    [K in keyof T as K extends string ? CamelToSnakeCase<K> : K]: T[K]
}

export const toSnakeCase = <T extends object>(obj: T) =>
    _.transform(obj, (result: SnakeCaseKeys<T>, value: any, key) => {
        const snakeKey = _.snakeCase(String(key)) as keyof SnakeCaseKeys<T>
        result[snakeKey] =
            _.isObject(value) && !_.isArray(value) ? toSnakeCase(value) : value
    })

export const toCamelCase = <T extends object>(obj: T) =>
    _.transform(obj, (result: CamelCaseKeys<T>, value: any, key) => {
        const camelKey = _.camelCase(String(key)) as keyof CamelCaseKeys<T>
        result[camelKey] =
            _.isObject(value) && !_.isArray(value) ? toCamelCase(value) : value
    })
