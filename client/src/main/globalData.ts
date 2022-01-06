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
                    const result = await sendServer<void, isAuthenticated>(
                        "/auth/isAuthenticated",
                        "get"
                    );
                    GlobalData._instance.result.set(result);
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