import type { isAuthenticated, data } from "blade-common";
import { derived, Readable, readable, writable, Writable } from "svelte/store";
import { delay, sendServer } from "../misc/helper";

export class GlobalData {

    private readonly result = writable<isAuthenticated | undefined>(undefined);
    public readonly _groups = writable<data.Group[]>([]);


    public readonly name = derived(this.result, x => x?.userName);
    public readonly isAuthenticated = derived(this.result, x => x?.isAuthenticated);

    public readonly groups = derived(this._groups, x => x);


    private static _instance: GlobalData | undefined;
    public static get instance(): GlobalData {
        if (!GlobalData._instance) {
            GlobalData._instance = new GlobalData();
            GlobalData._instance.updateState();
        }
        return GlobalData._instance;
    }

    private constructor() {

    }

    /**
     * updateState
     */
    public async updateState() {
        try {
            console.log('get Data')
            const result = await sendServer(
                "/auth/isAuthenticated->get", undefined
            );
            if (!result.successs) {
                console.error(`Could not get authentication data${JSON.stringify(result)}`);
                return;
            }
            GlobalData._instance.result.set(result);
            if (result.isAuthenticated) {
                const groups = await sendServer('/groups/my->get', undefined);
                console.log(groups)
                if (groups.successs)
                    this._groups.set(groups);
            }

        } catch (e) {
            console.error(e)
        }

    }


}