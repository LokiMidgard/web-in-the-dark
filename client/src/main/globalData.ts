import type { isAuthenticated } from "blade-common";
import { derived, Readable, readable } from "svelte/store";
import { sendServer } from "./helper";

export class GlobalData {

    private readonly result: Readable<undefined | isAuthenticated>;


    public readonly name: Readable<undefined | string>;
    public readonly isAuthenticated: Readable<undefined | boolean>;




    private static _instance: GlobalData | undefined;
    public static get instance(): GlobalData {
        if (!this._instance) {
            this._instance = new GlobalData(readable(undefined, (set) => {
                (async () => {

                    const result = await sendServer<void, isAuthenticated>(
                        "/auth/isAuthenticated",
                        "get"
                    );
                    set(result);
                })()

            }));
        }
        return this._instance;
    }




    private constructor(name: Readable<undefined | isAuthenticated>) {
        this.result = name;
        this.name = derived(this.result, x => x?.userName);
        this.isAuthenticated = derived(this.result, x => x?.isAuthenticated);

    }
}