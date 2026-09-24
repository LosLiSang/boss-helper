import { resolve } from "path"

import ui from "@nuxt/ui/vite"
import vueJsx from "@vitejs/plugin-vue-jsx"
import tailwindShadowDOM from "vite-plugin-tailwind-shadowdom"
import { defineConfig } from "wxt"

import { version } from "./package.json"

const matches = ["*://zhipin.com/*", "*://*.zhipin.com/*"]

export default defineConfig({
  srcDir: "src",
  outDirTemplate: "{{browser}}-mv{{manifestVersion}}",
  modules: ["@wxt-dev/module-vue"],

  vite: () => ({
    resolve: {
      alias: {
        "devlog-ui": resolve(__dirname, "packages/devlog-ui/src"),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    ssr: {
      noExternal: [
        "@webext-core/storage",
        "@webext-core/messaging",
        "@webext-core/proxy-service",
        "@nuxt/ui",
        "@nuxt/icon",
      ],
    },
    plugins: [
      {
        name: "ignore-node-binary",
        resolveId(id) {
          if (id.endsWith(".node") || id.includes("@tailwindcss/oxide")) {
            return { id, external: true };
          }
        },
      },
      vueJsx(),
      ui({
        colorMode: false,
        router: false,
        prose: false,
        ui: {
          colors: {
            primary: "teal",
            neutral: "gray",
            warning: "orange",
            success: "emerald",
            error: "rose",
          },
          badge: {
            defaultVariants: {
              color: "neutral",
              variant: "subtle",
            },
          },
          alert: {
            slots: {
              root: "px-4 py-2",
            },
            defaultVariants: {
              orientation: "horizontal",
            },
          },
          button: {
            slots: {
              base: "cursor-pointer",
            },
          },
          tabs: {
            slots: {
              trigger: "cursor-pointer",
            },
          },
          link: {
            base: "no-underline hover:underline",
          },
          formField: {
            slots: {},
            defaultVariants: {
              orientation: "horizontal",
            },
          },
          modal: {
            slots: {
              overlay: "z-200",
              content: "z-220",
              footer: "justify-end",
            },
          },
          chatMessage: {
            variants: {
              side: {
                right: {
                  container: "flex-row-reverse justify-start",
                },
              },
            },
          },
          slideover: {
            slots: {
              content: "z-230",
            },
          },
        },
      }),
      tailwindShadowDOM(),
    ],
  }),
  dev: {},
  manifest: () => ({
    default_locale: "zh_CN",
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    permissions: ["storage", "notifications"],
    web_accessible_resources: [
      {
        resources: ["boss.js"],
        matches,
      },
    ],
    host_permissions: ["http://*/*", "https://*/*"],
  }),
  webExt: {
    disabled: true,
  },
})
