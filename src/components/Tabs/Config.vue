<script lang="ts" setup>
import Alert from "@/components/Alert.vue"
import { formInfoData, useConf } from "@/composables/conf"
import { getCacheManager } from "@/composables/useApplying"
import { useHelper } from "@/composables/useHelper"
import Appearance from "./ConfigItem/Appearance.vue"
import CustomGreeting from "./ConfigItem/CustomGreeting.vue"

const helper = useHelper()
const conf = useConf()
</script>

<template>
  <div class="flex flex-col gap-4">
    <UTheme
      :ui="{
        formField: {
          root: 'flex max-sm:flex-col justify-between gap-4 items-center',
          container: 'flex-1',
        },
        input: { root: 'w-full' },
        inputMenu: { root: 'w-full' },
        inputTags: { root: 'w-full' },
      }"
    >
      <UForm :disabled="helper.workflowRunning.value || conf.isLoading.value" class="space-y-4">
        <!-- 1. 打招呼语话术设置 -->
        <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3">
          <div class="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-700/60">
            <div class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
              <UIcon name="i-lucide-message-circle" class="text-primary size-4" />
              <span>自定义打招呼语 (固定开场白话术)</span>
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              @click="() => window.open('https://www.zhipin.com/web/geek/notify-set?type=greetSet', '_blank')"
            >
              禁用 Boss 官方自带招呼语
            </UButton>
          </div>

          <CustomGreeting />
        </div>

        <!-- 2. 防风控与延迟设置 -->
        <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3">
          <div class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60">
            <UIcon name="i-lucide-timer" class="text-primary size-4" />
            <span>模拟人工防风控延迟设置</span>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-neutral-500 font-medium">
                <span>投递开始等待 (秒)</span>
              </div>
              <UInputNumber
                v-model="conf.formData.delayDeliveryStarts"
                :min="1"
                :max="999"
                size="sm"
                class="w-full"
              />
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs text-neutral-500 font-medium">
                <span>岗位投递间隔 (秒)</span>
              </div>
              <UInputNumber
                v-model="conf.formData.delayDeliveryInterval"
                :min="1"
                :max="999"
                size="sm"
                class="w-full"
              />
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs text-neutral-500 font-medium">
                <span>翻页等待时间 (秒)</span>
              </div>
              <UInputNumber
                v-model="conf.formData.delayDeliveryPageNext"
                :min="5"
                :max="999"
                size="sm"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- 3. 外观与界面显示 -->
        <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3">
          <div class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60">
            <UIcon name="i-lucide-palette" class="text-primary size-4" />
            <span>外观与界面显示设置</span>
          </div>
          <Appearance />
        </div>

        <!-- 4. 运行参数与上限 -->
        <div class="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-2" :data-help="formInfoData.configLevel['data-help']">
              <span class="text-xs text-neutral-500 font-medium">显示级别:</span>
              <USelectMenu
                v-model="conf.formData.configLevel"
                :items="formInfoData.configLevel.options"
                value-key="value"
                label-key="label"
                size="xs"
                :search-input="false"
                class="w-24"
              />
            </div>

            <div v-if="conf.configLevel.intermediate" class="flex items-center gap-2" data-help="达到上限后会自动暂停，默认120次, Boss限制单日最高约150">
              <span class="text-xs text-neutral-500 font-medium">单日投递上限:</span>
              <UInputNumber
                v-model="conf.formData.deliveryLimit.value"
                :min="1"
                :max="155"
                :step="10"
                size="xs"
                class="w-24 font-bold"
              />
            </div>

            <div data-help="投递完成或触发验证码时发送系统桌面通知">
              <UCheckbox label="发送通知" v-model="conf.formData.notification.value" size="sm" />
            </div>

            <div v-if="conf.configLevel.expert || conf.formData.useCache.value" data-help="缓存投递记录以避免重复投递">
              <UCheckbox label="启用缓存" v-model="conf.formData.useCache.value" size="sm" />
            </div>
          </div>

          <div v-if="conf.formData.useCache.value">
            <UButton size="xs" color="warning" variant="soft" @click="() => getCacheManager().clearCache()">
              清空缓存
            </UButton>
          </div>
        </div>
      </UForm>

      <!-- 底部操作按钮栏 -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div class="flex items-center gap-2">
          <UButton color="primary" icon="i-lucide-save" @click="conf.confSaving" data-help="保存当前所有设置">
            保存配置
          </UButton>
          <UButton color="neutral" variant="soft" icon="i-lucide-rotate-ccw" @click="conf.confReload" data-help="重新加载已保存的配置">
            重载配置
          </UButton>
          <UButton color="neutral" variant="ghost" @click="conf.confRecommend" data-help="一键应用推荐参数">
            推荐预设
          </UButton>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5" data-help="切换或新建配置预设方案">
            <span class="text-xs text-neutral-400">预设方案:</span>
            <UInputMenu
              v-model="conf.formDataPreset.value"
              :items="conf.formDataPresets.value"
              value-key="value"
              size="xs"
              create-item
              class="w-32"
              @create="conf.createPreset"
              @update:model-value="(v) => conf.switchPreset(v)"
            />
          </div>
          <UButton
            v-if="conf.configLevel.intermediate"
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-download"
            @click="conf.confExport"
            data-help="导出当前配置为 JSON"
          >
            导出
          </UButton>
          <UButton
            v-if="conf.configLevel.intermediate"
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-upload"
            @click="conf.confImport"
            data-help="从 JSON 导入配置"
          >
            导入
          </UButton>
        </div>
      </div>
    </UTheme>
  </div>
</template>
