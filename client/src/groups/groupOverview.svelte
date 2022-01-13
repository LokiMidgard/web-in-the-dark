<script lang="ts">
    import { GlobalData } from "../main/globalData";
    import { delay, sendServer } from "./../misc/helper";
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
    let isSelectedGroupGm: boolean;
    $: isSelectedGroupGm =
        $data.groups.filter((x) => x.id == selectedGroup)[0]?.gm.id == $data.id;
    let inviteUserId: string | undefined;
    let isInviteIdValid: boolean = false;
    let inviteLoading: boolean = false;
    let inviteEroor: string | undefined;
    let inviteName: string | undefined;
    $: checkInviteId(inviteUserId);
    async function checkInviteId(id: string) {
        if (!id) {
            isInviteIdValid = false;
            inviteLoading = false;
            inviteEroor = undefined;
        } else {
            inviteEroor = undefined;
            inviteLoading = true;
            inviteName = undefined;

            if (inviteUserId == $data.id) {
                isInviteIdValid = false;
                inviteEroor = "You can't invite yourself";
            } else if (
                !/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/g.test(
                    inviteUserId
                )
            ) {
                isInviteIdValid = false;
                inviteEroor = "Not a valid user id";
            } else {
                await delay(1000);

                if (id != inviteUserId) return;

                const response = await sendServer(
                    "/users/:userId:string->get",
                    {
                        userId: id,
                    }
                );

                if (id != inviteUserId) return;

                if (response.successs) {
                    inviteName = response.name;
                    const response2 = await sendServer(
                        "/groups/:groupId:number/users->get",
                        {
                            groupId: selectedGroup,
                        }
                    );
                    if (response2.successs) {
                        const userInGroup = response2.filter(
                            (x) => x.id == id
                        )[0];
                        if (userInGroup) {
                            inviteEroor = `${userInGroup.name} is already part of your group`;
                            isInviteIdValid = false;
                        } else {
                            inviteEroor = `${response.name} can be invited`;
                            isInviteIdValid = true;
                        }
                    }
                } else if (response.status == 404) {
                    inviteEroor = `User with id ${id} not found.`;
                    isInviteIdValid = false;
                } else {
                    console.error(response);
                    inviteEroor = `An error occured.`;
                    isInviteIdValid = false;
                }
            }

            //this is not an an try finaly intentionaly
            inviteLoading = false;
        }
    }
</script>

<Frame bind:selectedGroup subtitle="Manage your Groups...">
    <article>
        <header><h3>My infos</h3></header>
        <p>{$data.name}</p>
        <p><small>Id: {$data.id}</small></p>
    </article>

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
            {#if isSelectedGroupGm}
                <p>Invite new scundreals to your group. (TODO)</p>
                <label>
                    User ID
                    <input
                        bind:value={inviteUserId}
                        type="text"
                        placeholder="What is the players User Id"
                    />
                </label>
                <small aria-busy={inviteLoading}
                    >{!inviteUserId
                        ? "Please select a User ID"
                        : inviteLoading
                        ? "Checking ID..."
                        : inviteEroor}</small
                >

                <button disabled={!isInviteIdValid || inviteLoading}
                    >Invite {inviteName ?? ""}</button
                >
            {/if}
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
