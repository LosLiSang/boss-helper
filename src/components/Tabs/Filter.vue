<script lang="ts" setup>
import { computed } from 'vue'

import Alert from '@/components/Alert.vue'
import { formInfoData, useConf } from '@/composables/conf'
import { useHelper } from '@/composables/useHelper'

import Address from './ConfigItem/Address.vue'
import FormItem from './ConfigItem/Form/FormItem.vue'
import FormRange from './ConfigItem/Form/FormRange.vue'
import FormSelect from './ConfigItem/Form/FormSelect.vue'
import SalaryRange from './ConfigItem/SalaryRange.vue'

const helper = useHelper()
const conf = useConf()

const expireOptions = [
  { label: '不限', value: 0 },
  { label: '7天', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30天', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '90天', value: 90 * 24 * 60 * 60 * 1000 },
  { label: '180天', value: 180 * 24 * 60 * 60 * 1000 },
]

function getExpireLabel(expireMs: number) {
  const match = expireOptions.find((o) => o.value === expireMs)
  return match ? match.label : '不限'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 顶部说明提示 -->
    <Alert
      id="filter-alert-main"
      show-icon
      color="success"
      title="职位筛选中心"
      description="打钩开启对应项即可生效。所有关键词均支持点击【包含 / 排除】切换模式；修改后记得点击底部的【保存配置】。"
    />

    <UForm :disabled="helper.workflowRunning.value || conf.isLoading.value" class="space-y-4">
      <!-- 1. 关键词精准匹配区 -->
      <div
        class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3"
      >
        <div
          class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60"
        >
          <UIcon name="i-lucide-tags" class="text-primary size-4" />
          <span>关键词匹配规则 (公司 / 岗位 / 内容 / 职位)</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <!-- 公司名 -->
          <FormItem
            v-bind="formInfoData.company"
            v-model:enable="conf.formData.company.enable"
            v-model:include="conf.formData.company.include"
          >
            <FormSelect
              v-model:value="conf.formData.company.value"
              v-model:options="conf.formData.company.options"
            />
          </FormItem>

          <!-- 岗位名 -->
          <FormItem
            v-bind="formInfoData.jobTitle"
            v-model:enable="conf.formData.jobTitle.enable"
            v-model:include="conf.formData.jobTitle.include"
          >
            <FormSelect
              v-model:value="conf.formData.jobTitle.value"
              v-model:options="conf.formData.jobTitle.options"
            />
          </FormItem>

          <!-- 工作内容 -->
          <FormItem
            v-bind="formInfoData.jobContent"
            v-model:enable="conf.formData.jobContent.enable"
            v-model:include="conf.formData.jobContent.include"
          >
            <FormSelect
              v-model:value="conf.formData.jobContent.value"
              v-model:options="conf.formData.jobContent.options"
            />
          </FormItem>

          <!-- JD 倾向 -->
          <FormItem
            v-bind="formInfoData.jdPreference"
            v-model:enable="conf.formData.jdPreference.enable"
            v-model:include="conf.formData.jdPreference.include"
          >
            <FormSelect
              v-model:value="conf.formData.jdPreference.value"
              v-model:options="conf.formData.jdPreference.options"
            />
          </FormItem>

          <!-- HR 职位 -->
          <FormItem
            v-bind="formInfoData.hrPosition"
            v-model:enable="conf.formData.hrPosition.enable"
            v-model:include="conf.formData.hrPosition.include"
          >
            <FormSelect
              v-model:value="conf.formData.hrPosition.value"
              v-model:options="conf.formData.hrPosition.options"
            />
          </FormItem>

          <!-- 工作地址 -->
          <FormItem
            v-if="conf.configLevel.intermediate"
            v-bind="formInfoData.jobAddress"
            v-model:enable="conf.formData.jobAddress.enable"
            v-model:include="conf.formData.jobAddress.include"
            class="md:col-span-2"
          >
            <FormSelect
              v-model:value="conf.formData.jobAddress.value"
              v-model:options="conf.formData.jobAddress.options"
            />
          </FormItem>
        </div>
      </div>

      <!-- 卡片右键规则 -->
      <div
        class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3"
      >
        <div
          class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60"
        >
          <UIcon name="i-lucide-mouse-pointer-click" class="text-primary size-4" />
          <span>卡片右键规则</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <UFormField
            :data-help="formInfoData.blockedRules['data-help']"
            :title="formInfoData.blockedRules['data-help']"
            label="屏蔽公司"
          >
            <UInputTags
              v-model="conf.formData.blockedCompanies"
              placeholder="输入公司名"
              :disabled="helper.workflowRunning.value || conf.isLoading.value"
            />
          </UFormField>

          <UFormField
            :data-help="formInfoData.blockedRules['data-help']"
            :title="formInfoData.blockedRules['data-help']"
            label="屏蔽 HR"
          >
            <UInputTags
              v-model="conf.formData.blockedHrs"
              placeholder="输入 HR 姓名"
              :disabled="helper.workflowRunning.value || conf.isLoading.value"
            />
          </UFormField>
        </div>
      </div>

      <!-- 2. 薪资与公司规模范围 -->
      <div
        class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3"
      >
        <div
          class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60"
        >
          <UIcon name="i-lucide-badge-dollar-sign" class="text-primary size-4" />
          <span>薪资期望与企业规模</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SalaryRange />

          <FormItem
            label="公司规模范围"
            data-help="过滤企业员工人数，支持宽松与严格匹配"
            v-model:enable="conf.formData.companySizeRange.enable"
          >
            <FormRange
              :controls="false"
              :value="conf.formData.companySizeRange.value"
              unit="人"
              :show="true"
            />
          </FormItem>
        </div>
      </div>

      <!-- 3. 活跃度与防坑规则开关 -->
      <div
        class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-3"
      >
        <div
          class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60"
        >
          <UIcon name="i-lucide-shield-check" class="text-primary size-4" />
          <span>活跃度与防坑规则</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            class="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30"
            :title="formInfoData.activityFilter['data-help']"
          >
            <UCheckbox
              v-model="conf.formData.activityFilter.value"
              label="HR 活跃度过滤"
              size="sm"
            />
            <div class="text-[10px] text-neutral-400 pl-6 mt-0.5">仅投递近期活跃的岗位</div>
          </div>

          <div
            class="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30"
            :title="formInfoData.goldHunterFilter['data-help']"
          >
            <UCheckbox
              v-model="conf.formData.goldHunterFilter.value"
              label="过滤猎头岗位"
              size="sm"
            />
            <div class="text-[10px] text-neutral-400 pl-6 mt-0.5">排除猎头中介发布的岗位</div>
          </div>

          <div
            class="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30"
            :title="formInfoData.friendStatus['data-help']"
          >
            <UCheckbox v-model="conf.formData.friendStatus.value" label="已聊岗位过滤" size="sm" />
            <div class="text-[10px] text-neutral-400 pl-6 mt-0.5">排除已建立过对话的岗位</div>
          </div>

          <div
            class="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30"
            :title="formInfoData.bossGoldMedalHr['data-help']"
          >
            <UCheckbox
              v-model="conf.formData.bossGoldMedalHr.value"
              label="过滤金牌面试官"
              size="sm"
            />
            <div class="text-[10px] text-neutral-400 pl-6 mt-0.5">避免刷 KPI 账号</div>
          </div>

          <!-- 相同公司过滤 -->
          <div
            class="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between"
            :title="formInfoData.sameCompanyFilter['data-help']"
          >
            <div>
              <UCheckbox
                v-model="conf.formData.sameCompanyFilter.value"
                label="同公司过滤"
                size="sm"
              />
              <div class="text-[10px] text-neutral-400 pl-6 mt-0.5">不重复投递同公司</div>
            </div>
            <UDropdownMenu
              :items="
                expireOptions.map((o) => ({
                  label: o.label,
                  onSelect: () => {
                    conf.formData.sameCompanyFilter.expire = o.value
                  },
                }))
              "
            >
              <button
                type="button"
                class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium cursor-pointer"
              >
                {{ getExpireLabel(conf.formData.sameCompanyFilter.expire) }}
              </button>
            </UDropdownMenu>
          </div>

          <!-- 相同 HR 过滤 -->
          <div
            class="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between"
            :title="formInfoData.sameHrFilter['data-help']"
          >
            <div>
              <UCheckbox v-model="conf.formData.sameHrFilter.value" label="同 HR 过滤" size="sm" />
              <div class="text-[10px] text-neutral-400 pl-6 mt-0.5">不重复投递同招聘人</div>
            </div>
            <UDropdownMenu
              :items="
                expireOptions.map((o) => ({
                  label: o.label,
                  onSelect: () => {
                    conf.formData.sameHrFilter.expire = o.value
                  },
                }))
              "
            >
              <button
                type="button"
                class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium cursor-pointer"
              >
                {{ getExpireLabel(conf.formData.sameHrFilter.expire) }}
              </button>
            </UDropdownMenu>
          </div>
        </div>
      </div>

      <!-- 4. 高德地图通勤过滤 -->
      <div
        v-if="conf.configLevel.advanced"
        class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 space-y-2"
      >
        <div
          class="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-700/60"
        >
          <UIcon name="i-lucide-map-pin" class="text-primary size-4" />
          <span>地理位置与通勤距离过滤 (高德 API)</span>
        </div>
        <Address />
      </div>
    </UForm>

    <!-- 底部保存栏 -->
    <div
      class="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700"
    >
      <div class="text-xs text-neutral-400">所有筛选条件修改后，请点击右侧保存</div>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-rotate-ccw" @click="conf.confReload">
          重载筛选
        </UButton>
        <UButton color="primary" icon="i-lucide-save" @click="conf.confSaving">
          保存筛选配置
        </UButton>
      </div>
    </div>
  </div>
</template>
