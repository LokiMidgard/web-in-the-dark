import { validate_each_argument } from "svelte/internal";
import { get, readable, Readable, Writable, writable } from "svelte/store";

export type NoStore<T> = T extends Readable<infer T2>
    ? NoStoreParameter<T2>
    : T extends any[]
    ? NoStore<T[number]>[]
    : T extends {}
    ? NoStoreParameter<T>
    : T;



type ExtractType<TProperty, TType, TExtends> = TType extends TExtends ? TProperty : never;
type ExcludeType<TProperty, TType, TExtends> = TType extends TExtends ? never : TProperty;

type NoStoreParameter<T> =
    {
        -readonly [Property in keyof T as ExtractType<Property, T[Property], Writable<any>>]: T[Property] extends Writable<infer Args>
        ? NoStore<Args>
        : never // should not happen
    }
    &
    {
        readonly [Property in keyof T as ExcludeType<Property, T[Property], Writable<any>>]: T[Property] extends Function
        ? T[Property]
        : T[Property] extends Readable<infer Args>
        ? NoStore<Args>
        : T[Property] extends any[]
        ? T[Property]
        : NoStore<T[Property]>
    }

export function flatStore<T>(source: T): Readable<NoStore<T>> {

    return readable({} as NoStore<T>, function start(set) {
        let destroyCallback: (() => void)[] = [];

        const updated: () => void = () => {
            destroyCallback.forEach(x => x());
            const newDestroyCallback: (() => void)[] = [];
            const newValue = mapStoreInternal(source, { update: updated, onDestroy: newDestroyCallback })
            destroyCallback = newDestroyCallback;
            set(newValue)
        };
        const startValue = mapStoreInternal(source, { update: updated, onDestroy: destroyCallback })
        set(startValue);
        return function stop() {
            destroyCallback.forEach(x => x());
        }
    });

}
function mapStoreInternal<T>(source: T, callbacks?: { update: () => void, onDestroy: (() => void)[] }): NoStore<T> {

    if (isStore(source)) {
        const value = get(source);
        if (callbacks) {

            const unsubscribe = source.subscribe(x => {
                if (value !== x) {
                    callbacks.update();
                }
            })
            callbacks.onDestroy.push(unsubscribe);
        }
        return mapStoreInternal(value, callbacks) as NoStore<T>;

    } else if (Array.isArray(source)) {
        const result: any[] = []
        for (let index = 0; index < source.length; index++) {
            const element = source[index];
            result.push(mapStoreInternal(element, callbacks));
        }
        return result as any;
    } else if (typeof source === "object") {
        const result: any = {}
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const element = source[key];
                const newValue = mapStoreInternal(element, callbacks);
                if (isWritableStore(element)) {
                    Object.defineProperty(result, key, {
                        get: function () {
                            return newValue;
                        },
                        set: function (v: any) {
                            element.set(v);
                        }
                    });
                } else {
                    Object.defineProperty(result, key, {
                        get: function () {
                            return newValue;
                        }
                    });
                }

            }

        }

        for (const f of getAllFuncs(source)) {
            result[f] = ((...args: any) => source[f](...args)) as any;
        }

        return result;
    }
    else {

        // only stuff like string and bigint
        return source as any;
    }
}

function getAllFuncs(toCheck) {
    const props: string[] = [];
    if (!toCheck)
        return props;
    let obj = toCheck;
    do {
        props.push(...Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    return props.sort().filter((e, i, arr) => {
        if (e != arr[i + 1] && typeof toCheck[e] == 'function') return true;
    });
}

function isStore(value: any): value is Readable<any> {
    if (value)
        return typeof value.subscribe == "function";
    return false;
}
function isWritableStore(value: any): value is Writable<any> {
    if (value)
        return typeof value.set == "function" && typeof value.update == "function";
    return false;
}