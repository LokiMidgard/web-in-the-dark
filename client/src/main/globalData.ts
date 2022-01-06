import type { isAuthenticated } from "blade-common";
import { derived, Readable, readable } from "svelte/store";
import { delay, sendServer } from "./helper";

export class GlobalData {

    private readonly result: Readable<undefined | isAuthenticated>;


    public readonly name: Readable<undefined | string>;
    public readonly isAuthenticated: Readable<undefined | boolean>;




    private static _instance: GlobalData | undefined;
    public static get instance(): GlobalData {
        if (!GlobalData._instance) {
            GlobalData._instance = new GlobalData(readable<isAuthenticated>(undefined, (set) => {
                (async () => {
                    try {
                        const result = await sendServer<void, isAuthenticated>(
                            "/auth/isAuthenticated",
                            "get"
                        );
                        set(result);
                    } catch (e) {
                        console.error(e)
                    }
                })();
                return function stop() {
                    ;
                };
            }));
        }
        return GlobalData._instance;
    }




    private constructor(name: Readable<undefined | isAuthenticated>) {
        this.result = name;
        this.name = derived(this.result, x => x?.userName);
        this.isAuthenticated = derived(this.result, x => x?.isAuthenticated);

    }
}