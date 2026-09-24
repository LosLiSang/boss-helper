<script lang="ts" setup>
import { streamText } from "ai"
import { reactive, ref, computed, watch } from "vue"

import type { ModelConf } from "@/composables/useModel"
import { openai } from "@/composables/useModel/openai"
import type { OpenaiLLMConf } from "@/composables/useModel/openai"
import { jsonClone } from "@/utils/deepmerge"
import { logger } from "@/utils/logger"

const props = defineProps<{
  model?: ModelConf
}>()
const emit = defineEmits<{ (e: "create", data: ModelConf): void }>()

const toast = useToast()
const show = defineModel<boolean>({ required: true })

// 预设服务商模板
const providers = [
  {
    name: "DeepSeek",
    desc: "官方接口 (极速 Flash / 超低成本)",
    color: "#4f46e5",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-v4-flash", "deepseek-flash", "deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-v4-flash",
  },
  {
    name: "OpenAI",
    desc: "官方标准接口 (GPT-6 系列)",
    color: "#10b981",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-6-luna", "gpt-6-sol", "gpt-6-astra", "gpt-5.6-sol"],
    defaultModel: "gpt-6-luna",
  },
  {
    name: "Kimi (月之暗面)",
    desc: "Moonshot 官方接口",
    color: "#06b6d4",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["kimi-k2.6", "kimi-k2.5", "moonshot-v1-8k"],
    defaultModel: "kimi-k2.6",
  },
  {
    name: "硅基流动",
    desc: "SiliconFlow 聚合高速",
    color: "#8b5cf6",
    baseUrl: "https://api.siliconflow.cn/v1",
    models: ["deepseek-ai/DeepSeek-V4-Flash", "deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen3.5-72B-Instruct"],
    defaultModel: "deepseek-ai/DeepSeek-V4-Flash",
  },
  {
    name: "通义千问 (阿里)",
    desc: "DashScope 百炼兼容",
    color: "#ea580c",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen3.5-max", "qwen3.5-plus", "qwen2.5-72b-instruct"],
    defaultModel: "qwen3.5-plus",
  },
  {
    name: "OpenRouter",
    desc: "全球多模型聚合网关",
    color: "#f59e0b",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["deepseek/deepseek-v4-flash", "openai/gpt-6-luna", "openai/gpt-6-sol", "anthropic/claude-sonnet-4.6"],
    defaultModel: "deepseek/deepseek-v4-flash",
  },
  {
    name: "Ollama (本地)",
    desc: "本地私有化部署运行",
    color: "#64748b",
    baseUrl: "http://localhost:11434/v1",
    models: ["deepseek-v4:7b", "qwen3.5:7b", "llama4:8b"],
    defaultModel: "deepseek-v4:7b",
  },
]

// 基础信息
const createName = ref(props.model?.name || "DeepSeek-官方")
const createColor = ref(props.model?.color || "#4f46e5")
const showPassword = ref(false)
const showAdvanced = ref(false)

// 表单数据绑定
const form = reactive({
  base_url: props.model?.data?.base_url || "https://api.deepseek.com",
  api_key: props.model?.data?.api_key || "",
  model: props.model?.data?.model || "deepseek-chat",
  temperature: props.model?.data?.advanced?.temperature ?? 0.3,
  top_p: props.model?.data?.advanced?.top_p ?? 1,
  timeout: props.model?.data?.other?.timeout ?? 30,
})

// 一键应用厂商预设
function applyProvider(p: typeof providers[number]) {
  createName.value = p.name
  createColor.value = p.color
  form.base_url = p.baseUrl
  form.model = p.defaultModel
  toast.add({ title: `已切换为 ${p.name} 预设模板`, color: "info" })
}

// 快速填入模型名称
function selectModel(m: string) {
  form.model = m
}

// 快速填入推荐模型列表
const currentSuggestedModels = computed(() => {
  const match = providers.find((p) => form.base_url.includes(p.baseUrl) || p.baseUrl.includes(form.base_url))
  return match?.models || ["deepseek-v4-flash", "deepseek-flash", "gpt-6-luna", "deepseek-chat", "kimi-k2.6"]
})

// 测试连通性状态
const testing = ref(false)
const testResult = ref<{ status: "idle" | "success" | "error"; time: number; text: string; error?: string }>({
  status: "idle",
  time: 0,
  text: "",
})

async function runTest() {
  if (!form.base_url) {
    toast.add({ title: "请填写 API 接口地址 (Base URL)", color: "warning" })
    return
  }
  if (!form.api_key && !form.base_url.includes("localhost")) {
    toast.add({ title: "请填写 API Key", color: "warning" })
    return
  }
  if (!form.model) {
    toast.add({ title: "请填写模型名称 (Model)", color: "warning" })
    return
  }

  testing.value = true
  testResult.value = { status: "idle", time: 0, text: "" }
  const startTime = Date.now()

  try {
    const testConf: OpenaiLLMConf = {
      mode: "openai",
      avatar: "",
      base_url: form.base_url,
      api_key: form.api_key,
      model: form.model,
      other: { timeout: form.timeout },
      advanced: {
        temperature: form.temperature,
        top_p: form.top_p,
      },
    }

    const aiModel = openai.createModel(testConf)
    const result = streamText({
      model: aiModel,
      prompt: "请回复四个字：连接成功",
    })

    let responseText = ""
    for await (const part of result.stream) {
      if (part.type === "text-delta") {
        responseText += part.text
      } else if (part.type === "error") {
        throw new Error(String(part.error))
      }
    }

    testResult.value = {
      status: "success",
      time: Date.now() - startTime,
      text: responseText || "已收到模型响应",
    }
    toast.add({ title: "连通性测试成功！", color: "success" })
  } catch (err: any) {
    const errMsg = err?.message || String(err)
    testResult.value = {
      status: "error",
      time: Date.now() - startTime,
      text: "",
      error: errMsg,
    }
    logger.error("LLM Test Error", err)
    toast.add({ title: "测试失败: " + errMsg, color: "error" })
  } finally {
    testing.value = false
  }
}

function handleSave() {
  if (!createName.value.trim()) {
    toast.add({ title: "请输入模型名称", color: "warning" })
    return
  }
  if (!form.base_url.trim()) {
    toast.add({ title: "请输入接口地址", color: "warning" })
    return
  }
  if (!form.model.trim()) {
    toast.add({ title: "请输入模型名称", color: "warning" })
    return
  }

  const modelData: ModelConf["data"] = {
    mode: "openai",
    avatar: "",
    base_url: form.base_url.trim(),
    api_key: form.api_key.trim(),
    model: form.model.trim(),
    other: {
      timeout: form.timeout,
    },
    advanced: {
      temperature: form.temperature,
      top_p: form.top_p,
      json: true,
      stream: false,
    },
  }

  const data: ModelConf = {
    key: props.model?.key || new Date().getTime().toString(),
    name: createName.value.trim(),
    color: createColor.value,
    data: modelData,
  }

  emit("create", data)
  toast.add({ title: "模型配置已保存", color: "success" })
  show.value = false
}
</script>

<template>
  <UModal
    v-model:open="show"
    :title="props.model ? '编辑 AI 模型配置' : '添加新 AI 模型'"
    :ui="{ content: 'sm:max-w-[660px]', body: 'flex flex-col gap-4' }"
    :dismissible="false"
  >
    <template #body>
      <div class="space-y-4 max-h-[68vh] overflow-y-auto px-1">
        <!-- 1. 快捷服务商预设 -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <span>常用服务商一键填入 (点击快捷切换)</span>
            <span class="text-[11px] text-neutral-400">支持任意兼容 OpenAI 协议的接口</span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="p in providers"
              :key="p.name"
              type="button"
              class="flex flex-col items-start p-2 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              :class="form.base_url === p.baseUrl ? 'border-primary bg-primary/10 shadow-xs' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60'"
              @click="applyProvider(p)"
            >
              <div class="flex items-center gap-1.5 font-medium text-xs text-neutral-800 dark:text-neutral-100">
                <span class="size-2 rounded-full" :style="{ backgroundColor: p.color }"></span>
                {{ p.name }}
              </div>
              <div class="text-[10px] text-neutral-400 truncate w-full mt-0.5">{{ p.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 2. 核心参数表单 -->
        <div class="space-y-3.5 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <!-- 模型显示名称 -->
          <div class="space-y-1">
            <label class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
              <span>配置标识名称</span>
              <span class="text-rose-500">*</span>
            </label>
            <UInput v-model="createName" placeholder="例如: DeepSeek-官方、主力 GPT-4o" class="w-full" />
          </div>

          <!-- Base URL -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <span>API 接口地址 (Base URL)</span>
                <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] text-neutral-400">中转或代理地址亦可</span>
            </div>
            <UInput v-model="form.base_url" placeholder="https://api.deepseek.com 或 https://api.openai.com/v1" class="w-full font-mono text-xs" />
          </div>

          <!-- API Key -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <span>API 密钥 (API Key)</span>
                <span class="text-rose-500">*</span>
              </label>
              <button
                type="button"
                class="text-[11px] text-primary hover:underline"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "隐藏密钥" : "显示明文" }}
              </button>
            </div>
            <UInput
              v-model="form.api_key"
              :type="showPassword ? 'text' : 'password'"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              class="w-full font-mono text-xs"
            />
          </div>

          <!-- Model -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
              <span>模型名称 (Model)</span>
              <span class="text-rose-500">*</span>
            </label>
            <UInput v-model="form.model" placeholder="例如: deepseek-chat 或 gpt-4o-mini" class="w-full font-mono text-xs" />
            <!-- 推荐模型快捷标签 -->
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span class="text-[10px] text-neutral-400">推荐模型:</span>
              <button
                v-for="m in currentSuggestedModels"
                :key="m"
                type="button"
                class="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-neutral-700 hover:bg-primary/20 hover:text-primary transition-colors border border-neutral-200 dark:border-neutral-600 font-mono"
                :class="form.model === m ? 'text-primary border-primary bg-primary/5' : 'text-neutral-600 dark:text-neutral-300'"
                @click="selectModel(m)"
              >
                {{ m }}
              </button>
            </div>
          </div>
        </div>

        <!-- 3. 连通性即时测试面板 -->
        <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              <UIcon name="i-lucide-activity" class="text-primary" />
              <span>接口连通性验证</span>
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              :loading="testing"
              icon="i-lucide-zap"
              @click="runTest"
            >
              发送测试请求
            </UButton>
          </div>

          <!-- 测试反馈 -->
          <div v-if="testResult.status !== 'idle'" class="text-xs rounded p-2.5 space-y-1">
            <div v-if="testResult.status === 'success'" class="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <div class="flex items-center gap-1">
                <UIcon name="i-lucide-check-circle-2" />
                <span>连接正常，收到响应</span>
              </div>
              <UBadge color="success" variant="subtle" size="xs">{{ testResult.time }}ms</UBadge>
            </div>
            <div v-if="testResult.status === 'success'" class="text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900 p-2 rounded font-mono text-[11px]">
              {{ testResult.text }}
            </div>

            <div v-if="testResult.status === 'error'" class="text-rose-600 dark:text-rose-400 space-y-1">
              <div class="flex items-center gap-1 font-medium">
                <UIcon name="i-lucide-alert-triangle" />
                <span>连接失败</span>
              </div>
              <div class="text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2 rounded font-mono text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
                {{ testResult.error }}
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 高级参数 (折叠) -->
        <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between p-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            @click="showAdvanced = !showAdvanced"
          >
            <span>高级参数调节 (温度 / 超时 / 采样)</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="transition-transform duration-200"
              :class="{ 'rotate-180': showAdvanced }"
            />
          </button>

          <div v-if="showAdvanced" class="p-3 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>温度 (Temperature): {{ form.temperature }}</span>
                  <span class="text-[10px] text-neutral-400">低随机 ~ 高创意</span>
                </div>
                <USlider v-model="form.temperature" :min="0" :max="2" :step="0.05" class="w-full" />
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>核采样 (Top P): {{ form.top_p }}</span>
                </div>
                <USlider v-model="form.top_p" :min="0" :max="1" :step="0.05" class="w-full" />
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-xs text-neutral-600 dark:text-neutral-400">请求超时时间 (秒)</div>
              <UInputNumber v-model="form.timeout" :min="5" :max="120" size="sm" class="w-32" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full items-center">
        <UButton color="neutral" variant="outline" @click="show = false">
          取消
        </UButton>
        <div class="flex gap-2">
          <UButton color="primary" icon="i-lucide-check" @click="handleSave">
            保存配置
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
