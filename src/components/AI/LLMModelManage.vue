<script lang="ts" setup>
import { ref } from "vue"

import type { ModelConf } from "@/composables/useModel"
import { useModel } from "@/composables/useModel"
import deepmerge, { jsonClone } from "@/utils/deepmerge"
import { exportJson, importJson } from "@/utils/jsonImportExport"

import CreateLLM from "./LLMModelEdit.vue"

const modelStore = useModel()
const createBoxShow = ref(false)
const toast = useToast()
const open = ref(false)

function del(d: ModelConf) {
  modelStore.modelData.value = modelStore.modelData.value.filter((v) => d.key !== v.key)
  toast.add({ title: `已删除模型: ${d.name}`, color: "info" })
}

function copy(d: ModelConf) {
  const cloned = jsonClone(d)
  cloned.key = new Date().getTime().toString()
  cloned.name = `${cloned.name} (副本)`
  modelStore.modelData.value.push(cloned)
  toast.add({ title: "已创建模型副本", color: "success" })
}

const createModelData = ref<ModelConf | undefined>()

function edit(d: ModelConf) {
  createModelData.value = d
  createBoxShow.value = true
}

function newllm() {
  createModelData.value = undefined
  createBoxShow.value = true
}

function create(d: ModelConf) {
  if (d.key) {
    const old = modelStore.modelData.value.find((v) => v.key === d.key)
    if (old) {
      deepmerge(old, d, { clone: false })
    } else {
      d.key = new Date().getTime().toString()
      modelStore.modelData.value.push(d)
    }
  } else {
    d.key = new Date().getTime().toString()
    modelStore.modelData.value.push(d)
  }
  createBoxShow.value = false
}

function close() {
  modelStore.initModel()
  open.value = false
}

function saveAndClose() {
  modelStore.saveModel()
  toast.add({ title: "模型列表已保存", color: "success" })
  open.value = false
}

function exportllm() {
  exportJson(jsonClone(modelStore.modelData.value), "Ai模型配置")
  toast.add({ title: "已导出模型配置文件", color: "info" })
}

function importllm() {
  importJson<ModelConf[]>().then((data) => {
    if (Array.isArray(data)) {
      modelStore.modelData.value = data
      toast.add({
        title: "导入成功, 请点击右下角保存",
        color: "success",
      })
    }
  }).catch(() => {
    toast.add({ title: "导入失败，文件格式有误", color: "error" })
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="AI 模型管理"
    :ui="{ content: 'sm:max-w-[580px]', body: 'flex flex-col gap-3.5' }"
    ref="manageModelRef"
    :dismissible="false"
  >
    <slot />
    <template #body>
      <!-- 顶部快捷操作栏 -->
      <div class="flex items-center justify-between pb-1">
        <div class="text-xs text-neutral-500">
          已配置 <span class="font-bold text-primary">{{ modelStore.modelData.value.length }}</span> 个大模型接口
        </div>
        <div class="flex items-center gap-1.5">
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-download" @click="exportllm">
            导出
          </UButton>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-upload" @click="importllm">
            导入
          </UButton>
          <UButton size="xs" color="primary" icon="i-lucide-plus" @click="newllm">
            添加模型
          </UButton>
        </div>
      </div>

      <!-- 模型卡片列表 -->
      <div class="max-h-[50vh] overflow-y-auto space-y-2 pr-0.5">
        <!-- 列表有数据 -->
        <template v-if="modelStore.modelData.value.length > 0">
          <div
            v-for="item in modelStore.modelData.value"
            :key="item.key"
            class="group flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 hover:border-primary/40 hover:shadow-xs transition-all"
          >
            <!-- 左侧信息 -->
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="size-3 rounded-full shrink-0"
                :style="{ backgroundColor: item.color || '#4f46e5' }"
              ></span>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm text-neutral-800 dark:text-neutral-100 truncate">
                    {{ item.name }}
                  </span>
                  <UBadge
                    v-if="item.data?.model"
                    size="xs"
                    variant="subtle"
                    color="neutral"
                    class="font-mono text-[10px]"
                  >
                    {{ item.data.model }}
                  </UBadge>
                </div>
                <div class="text-xs text-neutral-400 font-mono truncate max-w-[280px]">
                  {{ item.data?.base_url || "未设置地址" }}
                </div>
              </div>
            </div>

            <!-- 右侧操作 -->
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy"
                title="复制"
                @click="copy(item)"
              />
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                icon="i-lucide-edit-3"
                @click="edit(item)"
              >
                编辑
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                title="删除"
                @click="del(item)"
              />
            </div>
          </div>
        </template>

        <!-- 空状态 (No Data) -->
        <template v-else>
          <div class="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center bg-neutral-50/50 dark:bg-neutral-800/30">
            <div class="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2.5">
              <UIcon name="i-lucide-bot" class="size-6" />
            </div>
            <div class="text-sm font-medium text-neutral-800 dark:text-neutral-200">暂无已配置的模型</div>
            <div class="text-xs text-neutral-400 max-w-xs mt-1 mb-4 leading-relaxed">
              添加 DeepSeek、OpenAI、Kimi 等服务商的 API 后，即可在 AI 筛选中自动评估职位
            </div>
            <UButton color="primary" icon="i-lucide-plus" size="sm" @click="newllm">
              立即新建模型
            </UButton>
          </div>
        </template>
      </div>

      <!-- 编辑/创建模型弹窗 -->
      <CreateLLM
        v-if="createBoxShow"
        v-model="createBoxShow"
        :model="createModelData"
        @create="create"
      />
    </template>

    <template #footer>
      <div class="flex justify-between w-full items-center">
        <UButton color="neutral" variant="outline" @click="close">
          关闭
        </UButton>
        <UButton color="primary" icon="i-lucide-check" @click="saveAndClose">
          保存并使用
        </UButton>
      </div>
    </template>
  </UModal>
</template>
