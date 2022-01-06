<script lang="ts">
    export let lable: string | undefined = undefined;
    export let color: string = "#fff";
    export let colorHover: string = "#e45635";
    export let size: string = "100px";
    export let fontSize: string = "10px";
</script>

<div
    class="loading-container"
    style="--size: {size}; --color: {color}; --color-hover: {colorHover}; --font-size: {fontSize};"
>
    <div class="loading" />
    <div id="loading-text">{lable ?? "loading"}</div>
</div>

<style>
    /** BEGIN CSS **/
    @keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @-moz-keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @-webkit-keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @-o-keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @-moz-keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @-webkit-keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @-o-keyframes rotate-loading {
        0% {
            transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
        }
    }

    @keyframes loading-text-opacity {
        0% {
            opacity: 0;
        }
        20% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @-moz-keyframes loading-text-opacity {
        0% {
            opacity: 0;
        }
        20% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @-webkit-keyframes loading-text-opacity {
        0% {
            opacity: 0;
        }
        20% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @-o-keyframes loading-text-opacity {
        0% {
            opacity: 0;
        }
        20% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
    div.loading-container,
    div.loading {
        height: var(--size);
        position: relative;
        width: var(--size);
        border-radius: 100%;
    }

    /* div.loading-container {
        margin: 40px auto;
    } */

    div.loading {
        border: 2px solid transparent;
        border-color: transparent var(--color) transparent var(--color);
        -moz-animation: rotate-loading 1.5s linear 0s infinite normal;
        -moz-transform-origin: 50% 50%;
        -o-animation: rotate-loading 1.5s linear 0s infinite normal;
        -o-transform-origin: 50% 50%;
        -webkit-animation: rotate-loading 1.5s linear 0s infinite normal;
        -webkit-transform-origin: 50% 50%;
        animation: rotate-loading 1.5s linear 0s infinite normal;
        transform-origin: 50% 50%;
    }

    div.loading-container:hover div.loading {
        border-color: transparent var(--color-hover) transparent
            var(--color-hover);
    }
    div.loading-container:hover div.loading,
    div.loading-container div.loading {
        -webkit-transition: all 0.5s ease-in-out;
        -moz-transition: all 0.5s ease-in-out;
        -ms-transition: all 0.5s ease-in-out;
        -o-transition: all 0.5s ease-in-out;
        transition: all 0.5s ease-in-out;
    }

    #loading-text {
        -moz-animation: loading-text-opacity 2s linear 0s infinite normal;
        -o-animation: loading-text-opacity 2s linear 0s infinite normal;
        -webkit-animation: loading-text-opacity 2s linear 0s infinite normal;
        animation: loading-text-opacity 2s linear 0s infinite normal;
        color: var(--color);
        font-family: "Helvetica Neue, " Helvetica ", " "arial";
        font-size: var(--font-size);
        font-weight: bold;
        margin-top: calc((var(--size) - var(--font-size)/2) / 2);
        opacity: 0;
        position: absolute;
        text-align: center;
        text-transform: uppercase;
        top: 0;
        width: calc(4px + var(--size));
        margin-left: auto;
        margin-right: auto;
        overflow: hidden;
    }
</style>
