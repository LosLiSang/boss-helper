<script lang="ts" setup>
import { ref } from "vue"
import LLMModelManage from "@/components/AI/LLMModelManage.vue"
import LLMPromptEdit from "@/components/AI/LLMPromptEdit.vue"
import FormSwitch from "@/components/Tabs/ConfigItem/Form/FormSwitch.vue"
import { formInfoData, useConf } from "@/composables/conf"
import { useHelper } from "@/composables/useHelper"
import type { FormDataAi } from "@/types/formData"

const helper = useHelper()
const conf = useConf()
const aiBoxShow = ref(false)
const aiConfBoxShow = ref(false)
const aiBox = ref<"aiGreeting" | "aiFiltering">("aiFiltering")

function change(v: Partial<FormDataAi>) {
  v.enable = !v.enable
  conf.confSaving()
}
</script>

<template>
  <div class="flex flex-col gap-4" data-help="AI 配置">
    <!-- 顶部说明条 -->
    <div class="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-neutral-700 dark:text-neutral-200">
      <div class="font-medium text-primary mb-1 flex items-center gap-1">
        💡 功能建议与说明
      </div>
      <div class="text-xs space-y-1 opacity-90 leading-relaxed">
        <p>• <b>AI 岗位筛选（核心推荐）</b>：由大模型阅读职位详情，根据你的加分/避坑条件自动打分，过滤不合格岗位，节省每日投递额度。</p>
        <p>• <b>打招呼方式</b>：如习惯使用个人固定的问候话术，建议在「配置」页开启「自定义招呼语」即可；若开启下方的「AI 招呼语」，则会由大模型针对每个岗位动态生成开场白。</p>
      </div>
    </div>

    <!-- AI 开关卡片 -->
    <div class="flex flex-wrap gap-4">
      <!-- 推荐的核心功能：AI 筛选 -->
      <FormSwitch
        :label="formInfoData.aiFiltering.label"
        :data-help="formInfoData.aiFiltering['data-help']"
        :data="conf.formData.aiFiltering"
        :lock="helper.workflow?.status.value === 'running'"
        @show="
          () => {
            aiBox = 'aiFiltering'
            aiBoxShow = true
          }
        "
        @change="change"
      />

      <!-- 可选功能：AI 招呼语 -->
      <FormSwitch
        :label="formInfoData.aiGreeting.label"
        :data-help="formInfoData.aiGreeting['data-help']"
        :data="conf.formData.aiGreeting"
        :lock="helper.workflow?.status.value === 'running'"
        @show="
          () => {
            aiBox = 'aiGreeting'
            aiBoxShow = true
          }
        "
        @change="change"
      />
    </div>

    <div>
      <LLMModelManage>
        <UButton
          color="primary"
          icon="i-lucide-settings"
          data-help="配置需要使用的LLM大模型"
          @click="
            () => {
              aiConfBoxShow = true
            }
          "
        >
          模型与 API 密钥管理
        </UButton>
      </LLMModelManage>
    </div>

    <LLMPromptEdit
      v-if="aiBoxShow"
      v-model="aiBoxShow"
      :data="aiBox"
    />
  </div>
</template>
