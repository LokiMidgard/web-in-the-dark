
export interface Dictionary<T> {
    [index: string]: T | undefined;
}

export function itterate<T>(dic: Dictionary<T>): [key: string, value: T][] {
    const result: [key: string, value: T][] = []
    for (const key in dic) {
        if (Object.prototype.hasOwnProperty.call(dic, key)) {
            const element = dic[key];
            if (element) {
                result.push([key, element]);
            }
        }
    }
    return result;
}

export function map<T, U>(dic: Dictionary<T>, callbackfn: (value: T, key: string) => U): Dictionary<U> {
    const result: Dictionary<U> = {};
    for (const key in dic) {
        if (Object.prototype.hasOwnProperty.call(dic, key)) {
            const element = dic[key];
            if (element) {
                result[key] = callbackfn(element, key);
            }
        }
    }
    return result;
}

export function dictionary<T>(dic: T[], callbackfn: (value: T) => string): Dictionary<T>;
export function dictionary<T, U>(dic: T[], callbackfn: (value: T) => string, callbackValue?: (value: T) => U): Dictionary<U>;
export function dictionary<T, U = T>(dic: T[], callbackfn: (value: T) => string, callbackValue?: (value: T) => U): Dictionary<U> {
    const result = dic.reduce((old, current) => {
        if (callbackValue) {
            old[callbackfn(current)] = callbackValue(current);
        } else {

            old[callbackfn(current)] = current as any as U;
        }

        return old;
    }, {} as Dictionary<U>);

    return result;
}

export function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    })
}

export async function sendServer<T, TOut>(url: string, method: "post" | "patch" | "get", data?: T) {
    const response = await fetch(url, {
        method: method,
        body: data ? JSON.stringify(data) : undefined,
        headers: data ? {
            "Content-Type": "application/json",
        } : undefined,
    });
    if (response.ok)
        return (await response.json()) as TOut;
    console.error(url, response.statusText)
    throw response.body;

}