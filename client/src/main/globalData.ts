import type { isAuthenticated } from "blade-common";
import { derived, Readable, readable, writable, Writable } from "svelte/store";
import { delay, sendServer } from "../misc/helper";

export class GlobalData {

    private readonly result = writable<isAuthenticated | undefined>(undefined);


    public readonly name = derived(this.result, x => x?.userName);
    public readonly isAuthenticated = derived(this.result, x => x?.isAuthenticated);



    private static _instance: GlobalData | undefined;
    public static get instance(): GlobalData {
        if (!GlobalData._instance) {
            GlobalData._instance = new GlobalData();
            (async () => {
                try {
                    console.log('get Data')
                    const result = await sendServer(
                        "/auth/isAuthenticated->get", undefined
                    );
                    if (result.successs)
                        GlobalData._instance.result.set(result);
                    else
                        console.error(`Could not get authentication data${JSON.stringify(result)}`);

                } catch (e) {
                    console.error(e)
                }
            })();
        }
        return GlobalData._instance;
    }




    private constructor() {

    }
}