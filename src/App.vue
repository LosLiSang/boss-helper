<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui"
import { useRafFn } from "@vueuse/core"
import { computed, onMounted, ref, shallowRef, watch } from "vue"

import ChatBox from "@/components/ChatBox.vue"
import JobCards from "@/components/JobCards.vue"
import Version from "@/components/Menu/Version.vue"
import About from "@/components/Tabs/About.vue"
import Ai from "@/components/Tabs/AI.vue"
import Config from "@/components/Tabs/Config.vue"
import Filter from "@/components/Tabs/Filter.vue"
import Logs from "@/components/Tabs/Logs.vue"
import Statistics from "@/components/Tabs/Statistics.vue"
import { useConf, appearanceConf } from "@/composables/conf"
import { useModel } from "@/composables/useModel"

import { useHelper, VITE_VERSION } from "./composables/useHelper"

const model = useModel()
const helper = useHelper()
const { todayData } = helper.statistics
const conf = useConf()

const items = computed<TabsItem[]>(() => [
  { slot: "statistics", label: "数据统计", icon: "i-lucide-bar-chart-2", help: "查看今日投递与筛选数据统计" },
  { slot: "filter", label: "职位筛选", icon: "i-lucide-filter", help: "设置薪资、公司、经验等硬性过滤" },
  { slot: "config", label: "运行配置", icon: "i-lucide-settings-2", help: "配置自定义招呼语、延迟与运行上限" },
  { slot: "ai", label: "AI 智能", icon: "i-lucide-sparkles", help: "配置大模型 API 与智能筛选/打招呼" },
  { slot: "logs", label: "运行日志", icon: "i-lucide-file-text", help: "查看插件每一步实时执行日志" },
  { slot: "about", label: "关于项目", icon: "i-lucide-info", help: "项目信息与交流赞赏" },
])

const container = ref<HTMLElement>()
const isFeatureEnabled = ref(false)
const helpContent = ref("鼠标移到对应元素查看提示")
const anchor = ref({ x: 0, y: 0 })
const isHovering = ref(false)
const helpVisible = computed(() => isFeatureEnabled.value && isHovering.value)
let lastElement: HTMLElement | null = null
let lastRect = { left: 0, top: 0, width: 0, height: 0 }
let root: ShadowRoot | Document = document
const boxStyles = shallowRef({
  display: "none",
  width: "0px",
  height: "0px",
  transform: "translate(0, 0)",
})

watch(helpVisible, (visible) => {
  if (visible) {
    resume()
  } else {
    pause()
    lastElement = null
    boxStyles.value = { ...boxStyles.value, display: "none" }
  }
})

const reference = computed(() => ({
  getBoundingClientRect: () =>
    ({
      width: 0,
      height: 0,
      left: anchor.value.x,
      right: anchor.value.x,
      top: anchor.value.y,
      bottom: anchor.value.y,
    }) as DOMRect,
}))

const updateOverlay = () => {
  const target = root.elementFromPoint(anchor.value.x, anchor.value.y) as HTMLElement | null
  const el = target?.closest("[data-help]") as HTMLElement | null
  const help = el?.dataset.help || ""
  if (!el || help === "no-help") {
    if (boxStyles.value.display !== "none") {
      boxStyles.value = { ...boxStyles.value, display: "none" }
      lastElement = null
    }
    return
  }

  const rect = el.getBoundingClientRect()
  const hasMoved =
    Math.abs(rect.left - lastRect.left) > 0.5 ||
    Math.abs(rect.top - lastRect.top) > 0.5 ||
    rect.width !== lastRect.width

  if (el === lastElement && !hasMoved) return

  lastElement = el
  lastRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  helpContent.value = help

  boxStyles.value = {
    display: "block",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: `translate(${rect.left}px, ${rect.top}px)`,
  }
}

const { pause, resume } = useRafFn(updateOverlay, { immediate: false })

const chatOpen = ref(appearanceConf.value.defaultShowChatBox)

onMounted(() => {
  root = (container.value?.getRootNode() as ShadowRoot) ?? document
  void conf.confInit()
  void model.initModel()
  chatOpen.value = appearanceConf.value.defaultShowChatBox
})

function tagOpen(url: string) {
  window.open(url)
}

const isDot = computed(() => (helper.netConf.value?.version ?? "0") > VITE_VERSION)
const overlay = useOverlay()

function openStore() {
  overlay.create(Version, { destroyOnClose: true }).open()
}

function onPointerMove(ev: PointerEvent) {
  if (!helpVisible.value) {
    return
  }
  anchor.value.x = ev.clientX
  anchor.value.y = ev.clientY
}
</script>

<template>
  <div
    class="shadow-wrapper max-w-5xl w-full mx-auto my-6 px-4"
    :style="{
      marginRight:
        appearanceConf.leftChat && appearanceConf.contentOffset != 25
          ? `${appearanceConf.contentOffset}%`
          : undefined,
      marginLeft:
        !appearanceConf.leftChat && appearanceConf.contentOffset != 25
          ? `${appearanceConf.contentOffset}%`
          : undefined,
    }"
    ref="container"
  >
    <UApp :portal="container" :toaster="{ position: 'top-right', ui: { viewport: 'z-100000' } }">
      <div class="overlay-box" :style="boxStyles" />
      <UTooltip
        :open="helpVisible"
        :reference="reference"
        :content="{
          side: 'top',
          sideOffset: 20,
          updatePositionStrategy: 'always',
        }"
        :text="helpContent"
        :ui="{
          content:
            'z-1000 flex items-center gap-1 bg-default text-highlighte shadow-xl rounded-md ring-1 ring-default h-auto px-3 py-2 text-[17px] leading-snug select-none pointer-events-auto backdrop-blur-none opacity-100 wrap-break-word',
          text: 'whitespace-normal',
        }"
      />
      <div
        @pointermove.passive="onPointerMove"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <div class="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden flex flex-col p-5">
          <!-- 顶部状态栏 -->
          <div class="flex gap-3 items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div class="flex items-center gap-3">
              <span class="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                {{ !appearanceConf.hideHeader ? 'Boss-Helper' : 'Helper' }}
              </span>
              <UChip :show="isDot">
                <UButton color="primary" variant="subtle" @click="openStore" size="xs">
                  v{{ VITE_VERSION }} {{ isDot ? ' (有更新)' : '' }}
                </UButton>
              </UChip>
              <span v-if="todayData.total > 0" class="text-xs font-medium text-neutral-600 dark:text-neutral-300 pl-2 border-l border-neutral-200 dark:border-neutral-700">
                今日投递: <b class="font-mono text-emerald-600">{{ todayData.success }}</b>/{{ conf.formData.deliveryLimit.value }}
              </span>
              <span v-if="helper.workflow && helper.workflow.total.value > 0" class="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                当前页面处理: <b class="font-mono text-cyan-600">{{ helper.workflow.current.value }}</b>/{{ helper.workflow.total.value }}
              </span>
            </div>

            <!-- 右侧辅助操作 -->
            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                color="primary"
                icon="i-lucide-message-square"
                @click.stop="chatOpen = !chatOpen"
                data-help="显示对话框，方便查询 AI 输出并调整招呼语"
              >
                对话
              </UButton>
              <UButton
                v-if="helper.netConf.value?.feedback"
                size="xs"
                color="info"
                variant="soft"
                icon="i-lucide-help-circle"
                @click.stop="tagOpen(helper.netConf.value.feedback)"
                data-help="反馈 Bug 或建议"
              >
                反馈
              </UButton>
              <UCheckbox
                size="sm"
                color="primary"
                v-model="isFeatureEnabled"
                label="帮助"
              />
            </div>
          </div>

          <div v-if="helper.netConf.value && helper.netConf.value.notification" class="netAlerts my-2">
            <template
              v-for="item in helper.netConf.value.notification.filter(
                (item) => item.type === 'alert',
              )"
              :key="item.key ?? item.data.title"
            >
              <Alert :id="`netConf-${item.key}`" v-bind="item.data" />
            </template>
          </div>

          <!-- 导航 Tabs -->
          <UTabs
            data-help="no-help"
            :items="items"
            :ui="{
              list: 'p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl my-3 gap-1 items-center',
              indicator: 'hidden',
              trigger: 'text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-primary data-[state=active]:shadow-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
            }"
            :unmount-on-hide="false"
          >
            <template #statistics>
              <Statistics />
            </template>
            <template #filter>
              <Filter />
            </template>
            <template #config>
              <Config />
            </template>
            <template #ai>
              <Ai />
            </template>
            <template #logs>
              <Logs />
            </template>
            <template #about>
              <About />
            </template>
          </UTabs>
        </div>
      </div>
      <JobCards />
      <ChatBox v-model:open="chatOpen" />
    </UApp>
  </div>
</template>