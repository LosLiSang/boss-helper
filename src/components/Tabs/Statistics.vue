<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"

import Alert from "@/components/Alert.vue"
import { useConf } from "@/composables/conf"
import { useHelper } from "@/composables/useHelper"

const helper = useHelper()
const { todayData, statisticsData } = helper.statistics
const conf = useConf()
const statisticCycle = ref(1)

const statisticCycleData = [
  { label: "近三日投递", help: "近 3 日累计投递成功总数", date: 3 },
  { label: "本周投递", help: "本周累计投递成功总数", date: 7 },
  { label: "本月投递", help: "本月累计投递成功总数", date: 30 },
  { label: "历史投递", help: "所有历史累计投递成功总数", date: -1 },
]

const cycle = computed(() => {
  const date = statisticCycleData[statisticCycle.value]?.date
  let ans = 0
  if (!date) return ans
  for (
    let i = 0;
    (date === -1 || i < date - 1) && i < statisticsData.value.length;
    i++
  ) {
    ans += statisticsData.value[i]?.success ?? 0
  }
  return ans
})

onMounted(() => {
  void helper.statistics.updateStatistics()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 统计指标卡片 Grid -->
    <div v-if="conf.configLevel.intermediate" class="grid grid-cols-5 gap-3">
      <!-- 岗位总数 -->
      <div class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 flex flex-col justify-between" data-help="当天扫描过的岗位总数">
        <div class="text-xs text-neutral-500 font-medium">扫描岗位数</div>
        <div class="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
          {{ todayData.total }} <span class="text-xs font-normal text-neutral-400">个</span>
        </div>
      </div>

      <!-- 过滤比例 -->
      <div class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 flex flex-col justify-between" data-help="被筛选条件过滤的比例">
        <div class="text-xs text-neutral-500 font-medium">条件过滤率</div>
        <div class="text-2xl font-bold font-mono text-rose-500 mt-1">
          {{ todayData.total ? (((todayData.total - todayData.success) / todayData.total) * 100).toFixed(0) : 0 }}<span class="text-xs font-normal text-neutral-400">%</span>
        </div>
      </div>

      <!-- 重复比例 -->
      <div class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 flex flex-col justify-between" data-help="刷到曾经处理过的岗位比例">
        <div class="text-xs text-neutral-500 font-medium">重复命中率</div>
        <div class="text-2xl font-bold font-mono text-amber-500 mt-1">
          {{ todayData.total ? ((todayData.repeat / todayData.total) * 100).toFixed(0) : 0 }}<span class="text-xs font-normal text-neutral-400">%</span>
        </div>
      </div>

      <!-- 活跃比例 -->
      <div class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 flex flex-col justify-between" data-help="未活跃被过滤的比例">
        <div class="text-xs text-neutral-500 font-medium">HR 不活跃率</div>
        <div class="text-2xl font-bold font-mono text-neutral-600 dark:text-neutral-300 mt-1">
          {{ todayData.total ? ((todayData.activityFilter / todayData.total) * 100).toFixed(0) : 0 }}<span class="text-xs font-normal text-neutral-400">%</span>
        </div>
      </div>

      <!-- 周期投递 -->
      <div class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/40 flex flex-col justify-between" :data-help="statisticCycleData[statisticCycle]?.help">
        <UDropdownMenu
          :items="
            statisticCycleData.map((item, index) => ({
              label: item.label,
              onSelect: () => (statisticCycle = index),
            }))
          "
        >
          <button type="button" class="text-xs text-neutral-500 font-medium flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            {{ statisticCycleData[statisticCycle]?.label }}
            <UIcon name="i-lucide-chevron-down" class="size-3" />
          </button>
        </UDropdownMenu>
        <div class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
          {{ cycle + todayData.success }} <span class="text-xs font-normal text-neutral-400">次</span>
        </div>
      </div>
    </div>

    <!-- 运行控制与进度条 -->
    <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 flex flex-col sm:flex-row items-center gap-4">
      <div class="flex items-center gap-2">
        <UButton
          color="primary"
          icon="i-lucide-play"
          size="sm"
          :loading="helper.workflow?.status.value === 'running'"
          @click="helper.start()"
          data-help="点击开始执行自动化投递流程"
        >
          {{ helper.workflow?.status.value === 'stop' ? '继续执行' : '开始自动化投递' }}
        </UButton>

        <UButton
          v-if="helper.workflow?.status.value === 'running'"
          color="warning"
          variant="soft"
          icon="i-lucide-pause"
          size="sm"
          @click="helper.stop()"
          data-help="暂停自动化投递"
        >
          暂停
        </UButton>

        <UButton
          v-if="helper.workflow?.status.value === 'stop'"
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          size="sm"
          @click="helper.reset()"
          data-help="重置筛选状态，重新扫描本页岗位"
        >
          重置
        </UButton>
      </div>

      <!-- 进度条 -->
      <div class="flex-1 w-full space-y-1" data-help="今日投递额度消耗进度">
        <div class="flex justify-between text-xs text-neutral-500">
          <span>今日投递进度</span>
          <span class="font-mono font-medium text-neutral-700 dark:text-neutral-300">
            {{ todayData.success }} / {{ conf.formData.deliveryLimit.value }} ({{ conf.formData.deliveryLimit.value ? ((todayData.success / conf.formData.deliveryLimit.value) * 100).toFixed(0) : 0 }}%)
          </span>
        </div>
        <UProgress
          class="w-full"
          :model-value="(todayData.success / conf.formData.deliveryLimit.value) * 100"
        />
      </div>
    </div>
  </div>
</template>