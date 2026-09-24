<script lang="ts" setup>
import type { SelectMenuItem, TableColumn } from "@nuxt/ui"
import UBadge from "@nuxt/ui/components/Badge.vue"
import UButton from "@nuxt/ui/components/Button.vue"
import UPopover from "@nuxt/ui/components/Popover.vue"
import { h, reactive, ref, computed } from "vue"

import JobCard from "@/components/JobCard.vue"
import { formInfoData, defaultFormData, useConf } from "@/composables/conf"
import { parseFiltering } from "@/composables/useApplying/utils"
import { useHelper } from "@/composables/useHelper"
import type { JobData } from "@/composables/useHelper"
import { useModel } from "@/composables/useModel"
import type { Prompt } from "@/types/formData"
import { logger } from "@/utils/logger"

const props = defineProps<{
  data: "aiGreeting" | "aiFiltering" | "aiReply"
}>()

const toast = useToast()
const helper = useHelper()
const conf = useConf()
const model = useModel()
const show = defineModel<boolean>({ required: true })

const currentModel = ref(conf.formData[props.data].model)
const currentModelData = computed(() =>
  model.modelData.value.find((v) => v.key === currentModel.value),
)
const modelItems = computed(() =>
  model.modelData.value.map(
    (v) => ({ ...v, avatar: { src: v.data?.avatar ?? "", loading: "lazy" } }) as SelectMenuItem,
  ),
)

// 模式切换: simple (直观设置) / advanced (专家 Prompt)
const activeTab = ref<"simple" | "advanced">("simple")

// 过滤及格分数
const score = ref(props.data === "aiFiltering" ? (conf.formData[props.data].score ?? 10) : 10)

// 原始 message 提示词
const message = ref<Prompt>(jsonClone(conf.formData[props.data].prompt ?? []))

// 直观模式 - AI 筛选加分与扣分规则
const positiveRules = ref("- 加分: 双休, 早九晚五, 技术栈匹配, 年轻团队, 五险一金 (每个加分项 10分)")
const negativeRules = ref("- 扣分: 单休, 大小周, 外包驻场, 电话推销/销售, 频繁加班, 经常出差 (每个扣分项 10分)")

// 直观模式 - AI 打招呼设置
const greetingResume = ref("熟练掌握前端技术栈（Vue3 / React / TypeScript / Node.js），有独立负责完整业务系统的经验，代码规范良好。")
const greetingTone = ref("真诚礼貌且专业")
const greetingMaxWords = ref(80)

// 初始化解析现有 Prompt 到直观模式
if (props.data === "aiFiltering" && message.value.length > 0) {
  const sysMsg = message.value.find((m) => m.role === "system")?.content || ""
  if (sysMsg.includes("## 求职者需求")) {
    const parts = sysMsg.split("## 求职者需求")[1]
    if (parts) {
      const posMatch = parts.match(/- 加分:[^\r\n]+/g)
      const negMatch = parts.match(/- 扣分:[^\r\n]+/g)
      if (posMatch) positiveRules.value = posMatch.join("\n")
      if (negMatch) negativeRules.value = negMatch.join("\n")
    }
  }
}

// 快速添加标签
function addTag(type: "positive" | "negative", tag: string) {
  if (type === "positive") {
    if (!positiveRules.value.includes(tag)) {
      positiveRules.value = positiveRules.value.trim() ? `${positiveRules.value}, ${tag}` : `- 加分: ${tag}`
    }
  } else {
    if (!negativeRules.value.includes(tag)) {
      negativeRules.value = negativeRules.value.trim() ? `${negativeRules.value}, ${tag}` : `- 扣分: ${tag}`
    }
  }
}

// 常用变量插入
function insertVariable(vName: string) {
  const target = message.value.find((m) => m.role === "user") || message.value[0]
  if (target) {
    target.content += ` {{ ${vName} }} `
    toast.add({ title: `已插入变量: {{ ${vName} }}`, color: "success" })
  }
}

// 组合构建 Prompt
function buildPromptFromSimple() {
  if (props.data === "aiFiltering") {
    return [
      {
        role: "system",
        content: `## 角色
求职评委

最终返回下面格式的JSON字符串,不要有任何其他字符

interface aiFilteringItem {
  reason: string; // 扣分或加分的理由
  score: number ; // 分数变化 正整数 不需要+-正负符号
}

interface aiFiltering {
  negative: aiFilteringItem[]; // 扣分项
  positive: aiFilteringItem[] ; // 加分项
}

## 求职者需求
${positiveRules.value}
${negativeRules.value}
`,
      },
      {
        role: "user",
        content: `## 待处理的岗位信息:
<岗位信息>
岗位名:{{ jobData.jobName }}   薪资: {{ jobData.salary }}
学历要求: {{ jobData.degreeName }}    工作经验要求: {{ jobData.experienceName }}
福利列表: {{ jobData.welfareList }}
技能要求: {{ jobData.skills }}
岗位标签:{{ jobData.jobLabels }}
  <岗位描述>
  {{ jobData.jobDescription }}
  <岗位描述/>
</岗位信息>`,
      },
    ]
  } else if (props.data === "aiGreeting") {
    return [
      {
        role: "system",
        content: `## 角色
求职者打招呼助手

## 求职者个人亮点/背景
${greetingResume.value}

## 要求
1. 语气风格: ${greetingTone.value}
2. 根据目标岗位信息，生成一段简洁自然的沟通开场白。
3. 字数控制在 ${greetingMaxWords.value} 字以内，直奔主题，突出契合点。
4. 无书信格式、无客套废话、无前缀，适合即时聊天。
`,
      },
      {
        role: "user",
        content: `### 目标岗位信息:
岗位名: {{ jobData.jobName }}
薪资: {{ jobData.salary }}
技能要求: {{ jobData.skills }}
岗位描述: {{ jobData.jobDescription }}
`,
      },
    ]
  }
  return message.value
}

function resetToDefault() {
  message.value = jsonClone(defaultFormData[props.data].prompt)
  toast.add({ title: "已重置为默认提示词", color: "info" })
}

// 测试抽屉相关
const testDialog = ref(false)

interface TestData {
  key: string
  job: JobData
  checked: boolean | string | number
  loading: boolean
}
interface TestContent {
  time: string
  reasoning_content?: string | null
  content?: string
}

const testData = reactive<Array<TestData>>([])
const testExpanded = ref<Record<string, boolean>>({})
const testDataContent = reactive<Record<string, TestContent[]>>({})

const testTableColumns: TableColumn<TestData>[] = [
  {
    id: "expand",
    header: "",
    cell: ({ row }) =>
      h(UButton, {
        color: "neutral",
        variant: "ghost",
        icon: "i-lucide-chevron-down",
        square: true,
        size: "xs",
        "aria-label": "Expand",
        ui: {
          leadingIcon: [
            "transition-transform",
            row.getIsExpanded() ? "duration-200 rotate-180" : "",
          ],
        },
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          row.toggleExpanded()
        },
      }),
  },
  {
    id: "jobName",
    header: "岗位名",
    accessorFn: (row) => row.job.jobName,
    cell: ({ row }) =>
      h(
        UPopover,
        {
          mode: "hover",
          portal: testModelRef.value?.parentElement ?? false,
        },
        {
          default: () =>
            h("div", { class: "flex items-center gap-1" }, [
              row.original.loading
                ? h(UBadge, {
                    trailingIcon: "i-line-md-loading-twotone-loop",
                    variant: "soft",
                    color: "neutral",
                  })
                : null,
              h("span", row.original.job.jobName),
            ]),
          content: () => h(JobCard, { job: row.original.job, hover: false, style: "width: 300px" }),
        },
      ),
  },
  {
    id: "jobDescription",
    header: "内容",
    accessorFn: (row) => row.job.jobDescription,
    cell: ({ row }) =>
      h(
        "div",
        {
          class: "truncate",
          title: row.original.job.jobDescription,
        },
        row.original.job.jobDescription,
      ),
  },
]

const testJobLoading = ref(false)
const testJobStop = ref(true)

async function addTestJob(n: number) {
  testJobLoading.value = true
  try {
    let count = 0
    for (let item of helper.jobList.value) {
      if (testData.some((v) => v.job.key === item.key)) {
        continue
      }
      await helper.onJobCardClick(item.key)
      const data = helper.jobMaps.get(item.key)
      if (data) {
        item = data.jobData
      }
      testData.push({ key: item.key, job: item, checked: false, loading: false })
      testDataContent[item.key] = []
      count++
      if (count >= n) {
        break
      }
    }
  } finally {
    testJobLoading.value = false
  }
}

async function testJob() {
  if (!testJobStop.value) {
    testJobStop.value = true
    return
  }
  const md = model.modelData.value.find((v) => currentModel.value === v.key)
  if (!currentModel.value || !md) {
    toast.add({
      title: "请在上级弹窗右上角选择模型",
      color: "warning",
    })
    return
  }

  const promptToTest = activeTab.value === "simple" ? buildPromptFromSimple() : message.value

  testJobLoading.value = true
  testJobStop.value = false
  try {
    if (
      !helper.chatModel.createAgent(
        {
          prompt: promptToTest,
          model: currentModel.value,
          enable: true,
        },
        props.data === "aiFiltering" ? "filtering" : "greetings",
        {
          json: props.data === "aiFiltering",
        },
      )
    ) {
      throw new Error("AI模型未配置, 初始化失败")
    }
    const handle = async (item: TestData) => {
      if (testJobStop.value) {
        return
      }

      try {
        const content = await helper.chatModel
          .chat(
            props.data === "aiFiltering" ? "filtering" : "greetings",
            {
              jobData: item.job,
              rawData: null,
              state: {},
            },
            {
              disableMessages: true,
            },
          )
          .then((r) => Promise.all([r.text, r.finalStep.then((x) => x.reasoningText)]))
        if (props.data === "aiFiltering" && content[0]) {
          const { message } = parseFiltering(content[0])
          content[0] = message ?? content[0]
        }
        testDataContent[item.key]?.push({
          time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
          reasoning_content: content[1],
          content: content[0],
        })
      } catch (err) {
        const errMsg = errorHandle(err)
        logger.error("TestJobError", err)
        toast.add({
          title: errMsg,
          color: "error",
        })
      } finally {
        item.loading = false
      }
    }

    for (let i = 0; i < testData.length; i += 4) {
      const batch = testData.slice(i, i + 4)
      await Promise.all(batch.map(handle))
    }
  } catch (err: any) {
    logger.error("TestJobError", err)
    toast.add({
      title: err.message,
      color: "error",
    })
  } finally {
    testJobLoading.value = false
    testJobStop.value = true
  }
}

async function savePrompt() {
  if (currentModel.value == null) {
    toast.add({
      title: "请在右上角选择使用的模型",
      color: "warning",
    })
    return
  }

  const finalPrompt = activeTab.value === "simple" ? buildPromptFromSimple() : message.value

  conf.formData[props.data].model = currentModel.value
  conf.formData[props.data].prompt = finalPrompt

  if (props.data === "aiFiltering") {
    conf.formData[props.data].score = score.value
  }
  await conf.confSaving()
  toast.add({ title: "配置已保存", color: "success" })
  show.value = false
}

const promptModelRef = useTemplateRef("promptModel")
const testModelRef = useTemplateRef("testModel")
</script>

<template>
  <UModal
    v-model:open="show"
    :title="data === 'aiFiltering' ? 'AI 岗位智能筛选配置' : 'AI 智能打招呼配置'"
    :ui="{ content: 'sm:max-w-[760px]', body: 'flex flex-col gap-4' }"
    :dismissible="false"
  >
    <template #body>
      <!-- 头部控制栏：模型选择 + 模式切换 -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700" ref="promptModel">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">配置模式:</span>
          <div class="inline-flex rounded-md p-0.5 bg-neutral-200 dark:bg-neutral-700">
            <button
              type="button"
              class="px-3 py-1 text-xs rounded-md font-medium transition-all"
              :class="activeTab === 'simple' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'"
              @click="activeTab = 'simple'"
            >
              🎯 常用偏好设置（推荐）
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs rounded-md font-medium transition-all"
              :class="activeTab === 'advanced' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'"
              @click="activeTab = 'advanced'"
            >
              ⚙️ 高级 Prompt
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-neutral-500">调用模型:</span>
          <USelectMenu
            v-model="currentModel"
            :items="modelItems"
            labelKey="name"
            valueKey="key"
            placeholder="请选择模型"
            :portal="promptModelRef?.parentElement ?? false"
            :avatar="{
              src: currentModelData?.data?.avatar,
              loading: 'lazy',
            }"
            class="min-w-[140px]"
          />
        </div>
      </div>

      <!-- AI 筛选功能界面 -->
      <template v-if="data === 'aiFiltering'">
        <!-- 及格分设置 -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div>
            <div class="font-medium text-sm text-neutral-800 dark:text-neutral-100">通过及格分数</div>
            <div class="text-xs text-neutral-500">最终得分 = 加分项总分 - 扣分项总分。达到及格分才执行投递。</div>
          </div>
          <UInputNumber v-model="score" :min="-100" :max="100" size="sm" class="w-24 text-center font-bold" />
        </div>

        <!-- 模式1: 直观偏好设置 -->
        <div v-if="activeTab === 'simple'" class="space-y-4">
          <!-- 加分要求 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                🟢 加分项 / 期望待遇（命中则增加分数）
              </label>
              <div class="text-[11px] text-neutral-400">点击标签快捷添加</div>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-1.5">
              <button
                v-for="t in ['双休', '早九晚五', '五险一金', '年终奖', '弹性打卡', '新技术栈', '年轻团队']"
                :key="t"
                type="button"
                class="text-[11px] px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                @click="addTag('positive', t)"
              >
                + {{ t }}
              </button>
            </div>
            <UTextarea v-model="positiveRules" :rows="2" autoresize placeholder="例如: - 加分: 双休, 早九晚五, 技术栈匹配 (每个加分项 10分)" class="w-full text-xs font-mono" />
          </div>

          <!-- 扣分要求 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                🔴 扣分项 / 避坑条件（命中则扣减分数）
              </label>
              <div class="text-[11px] text-neutral-400">点击标签快捷添加</div>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-1.5">
              <button
                v-for="t in ['单休/大小周', '外包/驻场', '频繁加班', '电话推销/地推', '经常出差', '无社保', '纯提成制']"
                :key="t"
                type="button"
                class="text-[11px] px-2 py-0.5 rounded border border-rose-500/20 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                @click="addTag('negative', t)"
              >
                + {{ t }}
              </button>
            </div>
            <UTextarea v-model="negativeRules" :rows="2" autoresize placeholder="例如: - 扣分: 单休, 外包驻场, 电话推销, 频繁加班 (每个扣分项 10分)" class="w-full text-xs font-mono" />
          </div>
        </div>

        <!-- 模式2: 高级 Prompt 编辑 -->
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between text-xs text-neutral-500">
            <span>快捷插入岗位动态变量:</span>
            <UButton size="xs" color="neutral" variant="ghost" @click="resetToDefault">重置默认 Prompt</UButton>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(label, key) in { 'jobName': '岗位名', 'salary': '薪资', 'jobDescription': '职位描述', 'skills': '技能要求', 'welfareList': '福利列表', 'degreeName': '学历', 'experienceName': '经验' }"
              :key="key"
              type="button"
              class="text-[11px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-primary/20 hover:text-primary transition-colors border border-neutral-300 dark:border-neutral-700"
              @click="insertVariable(`jobData.${key}`)"
            >
              + {{ label }}
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(item, index) in message" :key="index" class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>消息 {{ index + 1 }} (角色: {{ item.role }})</span>
              </div>
              <UTextarea v-model="item.content" autoresize :rows="3" class="w-full font-mono text-xs" />
            </div>
          </div>
        </div>
      </template>

      <!-- AI 打招呼设置界面 -->
      <template v-else-if="data === 'aiGreeting'">
        <div class="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
          📌 提示：如果使用固定开场白，直接在「配置 -> 自定义招呼语」填写即可。此处配置由 AI 为每个岗位量身定制开场白。
        </div>

        <div v-if="activeTab === 'simple'" class="space-y-3">
          <div class="space-y-1">
            <label class="text-xs font-semibold">求职者核心亮点与背景介绍</label>
            <UTextarea v-model="greetingResume" :rows="3" autoresize placeholder="写下你的关键优势、擅长技术栈、代表项目等..." class="w-full text-xs" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-semibold">期望语气风格</label>
              <UTextarea v-model="greetingTone" :rows="1" autoresize placeholder="例如: 真诚礼貌、简洁专业、突出技术实力" class="w-full text-xs" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-semibold">生成字数上限 (字)</label>
              <UInputNumber v-model="greetingMaxWords" :min="30" :max="200" size="sm" class="w-full" />
            </div>
          </div>
        </div>

        <div v-else class="space-y-2">
          <div v-for="(item, index) in message" :key="index" class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 space-y-1.5">
            <div class="text-xs font-medium text-neutral-500">消息 {{ index + 1 }} ({{ item.role }})</div>
            <UTextarea v-model="item.content" autoresize :rows="3" class="w-full font-mono text-xs" />
          </div>
        </div>
      </template>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton color="neutral" variant="outline" @click="show = false">
          关闭
        </UButton>
        <div class="flex gap-2">
          <UButton color="neutral" variant="soft" icon="i-lucide-flask-conical" @click="testDialog = true">
            从页面测试效果
          </UButton>
          <UButton color="primary" icon="i-lucide-check" @click="savePrompt">
            保存配置
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 测试效果抽屉 -->
  <USlideover v-model:open="testDialog" title="AI 岗位测试预览" :ui="{ content: 'max-w-lg' }">
    <template #body>
      <div class="text-xs text-neutral-500 mb-3">
        从当前 Boss直聘 列表中读取真实岗位，在不向 HR 发送消息的情况下测试 AI 的评分或打招呼效果。
      </div>
      <div class="flex gap-2 mb-4" ref="testModel">
        <UButton size="xs" :loading="testJobLoading" @click="addTestJob(1)" color="neutral">
          + 抓取 1 个岗位
        </UButton>
        <UButton size="xs" :loading="testJobLoading" @click="addTestJob(4)" color="neutral">
          + 抓取 4 个岗位
        </UButton>
      </div>
      <div class="overflow-auto">
        <UTable
          v-model:expanded="testExpanded"
          :data="testData"
          :get-row-id="(row: TestData) => row.key"
          :columns="testTableColumns"
          :ui="{ tr: 'data-[expanded=true]:bg-elevated/40' }"
        >
          <template #expanded="{ row }">
            <div class="test-content-wrapper p-2 bg-neutral-50 dark:bg-neutral-900 rounded text-xs">
              <div v-for="(item, index) in (testDataContent[row.original.key] ?? []).slice(-3)" :key="index" class="space-y-1">
                <div class="text-[10px] text-neutral-400">{{ item.time }}</div>
                <div v-if="item.reasoning_content" class="p-1.5 rounded bg-neutral-200/50 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <span class="font-bold">思考过程: </span>{{ item.reasoning_content }}
                </div>
                <div class="font-mono text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap">
                  {{ item.content }}
                </div>
              </div>
            </div>
          </template>
        </UTable>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-between w-full">
        <UButton color="neutral" variant="outline" @click="close"> 关闭 </UButton>
        <UButton color="primary" :loading="testJobLoading" @click="testJob">
          {{ testJobStop ? '开始运行测试' : '停止测试' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
