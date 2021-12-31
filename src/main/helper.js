export function itterate(dic) {
    const result = [];
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
export function map(dic, callbackfn) {
    const result = {};
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
export function dictionary(dic, callbackfn, callbackValue) {
    const result = dic.reduce((old, current) => {
        if (callbackValue) {
            old[callbackfn(current)] = callbackValue(current);
        }
        else {
            old[callbackfn(current)] = current;
        }
        return old;
    }, {});
    return result;
}
export function delay(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
//# sourceMappingURL=helper.js.map