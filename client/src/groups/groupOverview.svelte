<script lang="ts">
    import { GlobalData } from "../main/globalData";
    import { sendServer } from "./../misc/helper";
    import { flatStore } from "./../misc/flatstore";
    import Frame from "../misc/frame.svelte";

    const data = flatStore(GlobalData.instance);

    let groupName: string | undefined;
    async function createGroup() {
        const promise = sendServer("/groups->put", { name: groupName });
        groupName = undefined;
        await promise;
        await $data.updateState();
    }
    let selectedGroup: number | undefined;
</script>

<Frame bind:selectedGroup subtitle="Manage your Groups...">
    {#if selectedGroup}
        <article>
            <header>
                <hgroup>
                    <h3>Manage</h3>
                    <h4>
                        {$data.groups.filter((x) => x.id == selectedGroup)[0]
                            .name} (<small>{selectedGroup}</small>)
                    </h4>
                </hgroup>
            </header>
            <p>Invite new scundreals to your group. (TODO)</p>
            <label>
                User ID
                <input type="text" placeholder="What is the players User Id" />
            </label>
            <button disabled>Invite</button>
        </article>
    {/if}
    <article>
        <header>Groups</header>
        {#if $data.isAuthenticated}
            <div class="grid">
                <input type="text" bind:value={groupName} />
                <button disabled={!groupName} on:click={createGroup}
                    >Create Group</button
                >
            </div>

            {#if $data.groups.length > 0}
                <ul>
                    {#if $data.groups.some((x) => x.gm.id == $data.id)}
                        <li>
                            <strong>Groups you are the GM</strong>
                            <ul>
                                {#each $data.groups
                                    .filter((x) => x.gm.id == $data.id)
                                    .sort() as group}
                                    <li>
                                        {group.name} <small>({group.id})</small>
                                    </li>
                                {/each}
                            </ul>
                        </li>
                    {/if}
                    {#if $data.groups.some((x) => x.gm.id != $data.id)}
                        <li>
                            <h1>Groups you are the player</h1>
                            {#each $data.groups
                                .filter((x) => x.gm.id != $data.id)
                                .sort() as group}
                                <li>
                                    {group.name} <small>({group.id})</small>
                                </li>
                            {/each}
                        </li>
                    {/if}
                </ul>
            {:else}
                <p>You have no Groups yet.</p>
                >
            {/if}
        {/if}
    </article>
</Frame>
