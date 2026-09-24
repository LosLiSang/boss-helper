<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ComponentPublicInstance } from 'vue'
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import JobCard from '@/components/JobCard.vue'
import { useConf } from '@/composables/conf'
import type { JobData } from '@/composables/useHelper'
import { useHelper } from '@/composables/useHelper'

const jobSetRef = ref<Record<string, Element | ComponentPublicInstance | null>>({})
const following = ref(true)
const changingBatch = ref(false)

const cards = ref<HTMLDivElement>()
const contextMenuRef = ref<HTMLElement>()
const helper = useHelper()
const conf = useConf()

const filterItemsChecked = ref<Record<string, boolean>>({})

const contextMenu = reactive<{
  visible: boolean
  x: number
  y: number
  job: JobData | null
  keyword: string
}>({
  visible: false,
  x: 0,
  y: 0,
  job: null,
  keyword: '',
})

const filterItems = computed<(DropdownMenuItem & { value: string })[]>(() =>
  (
    [
      { type: 'checkbox', value: 'success', label: '投递成功', color: 'success' },
      ...(helper.workflow?.pipeline.value.map(
        (item) =>
          ({
            type: 'checkbox',
            label: item.label ?? item.id,
            value: item.id,
          }) satisfies DropdownMenuItem,
      ) ?? []),
      { type: 'checkbox', value: 'error', label: '投递错误', color: 'error' },
      { type: 'checkbox', value: 'blocked', label: '已屏蔽', color: 'warning' },
      { type: 'checkbox', value: 'not_started', label: '未开始' },
    ] satisfies DropdownMenuItem[]
  ).map((item) => ({
    ...item,
    checked: filterItemsChecked.value[item.value] ?? true,
    onUpdateChecked(checked: boolean) {
      filterItemsChecked.value[item.value] = checked
    },
    onSelect(e: Event) {
      e.preventDefault()
    },
  })),
)

const isFiltered = computed(() => {
  return filterItems.value.some((item) => item.checked === false)
})

const jobList = computed(() => {
  return helper.jobList.value.filter((job) => {
    const res = helper.jobResultMaps.get(job.key)
    const blocked = isJobBlocked(job) || res?.id === 'blockedCompany' || res?.id === 'blockedHr'

    if (blocked && filterItemsChecked.value.blocked === false) {
      return false
    }

    if (!res || !res.id) {
      if (blocked) {
        return filterItemsChecked.value.blocked ?? true
      }
      return filterItemsChecked.value.not_started ?? true
    }
    if (res.status === 'success') {
      return filterItemsChecked.value.success ?? true
    }
    if (res.status === 'error') {
      return filterItemsChecked.value.error ?? true
    }
    if (filterItemsChecked.value[res.id] === false) {
      return false
    }
    return true
  })
})

function filterSelectAll() {
  filterItems.value.forEach((item) => (filterItemsChecked.value[item.value] = true))
}

function filterToggle() {
  filterItems.value.forEach(
    (item) =>
      (filterItemsChecked.value[item.value] = !(filterItemsChecked.value[item.value] ?? true)),
  )
}

function isJobBlocked(job: JobData) {
  const company = job.brand.name.trim().toLowerCase()
  const hr = job.boss.name.trim().toLowerCase()
  const isCompanyBlocked = conf.formData.blockedCompanies.some(
    (item) => item.trim().toLowerCase() === company,
  )
  const isHrBlocked = hr && conf.formData.blockedHrs.some(
    (item) => item.trim().toLowerCase() === hr,
  )
  return Boolean(isCompanyBlocked || isHrBlocked)
}

function closeContextMenu() {
  contextMenu.visible = false
  contextMenu.job = null
}

function normalizeRule(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function hasRule(values: string[], value: string) {
  const target = value.trim().toLowerCase()
  return values.some((item) => item.trim().toLowerCase() === target)
}

function addRule(values: string[], value: string) {
  const target = normalizeRule(value)
  if (target && !hasRule(values, target)) {
    values.push(target)
  }
}

function removeRule(values: string[], value: string) {
  const target = value.trim().toLowerCase()
  const index = values.findIndex((item) => item.trim().toLowerCase() === target)
  if (index >= 0) {
    values.splice(index, 1)
  }
}

async function toggleContextMenuRule(kind: 'company' | 'hr') {
  const job = contextMenu.job
  if (!job) {
    return
  }
  const value = kind === 'company' ? job.brand.name : job.boss.name
  const values = kind === 'company' ? conf.formData.blockedCompanies : conf.formData.blockedHrs
  if (hasRule(values, value)) {
    removeRule(values, value)
  } else {
    addRule(values, value)
  }
  await conf.confSaving()
}

async function addJdPreference() {
  const keyword = normalizeRule(contextMenu.keyword)
  if (!keyword) {
    return
  }
  const preference = conf.formData.jdPreference
  addRule(preference.value, keyword)
  preference.value = preference.value.filter(Boolean)
  preference.enable = true
  preference.include = true
  contextMenu.keyword = keyword
  await conf.confSaving()
}

async function changeBatch() {
  if (changingBatch.value || helper.workflowRunning.value) {
    return
  }
  changingBatch.value = true
  closeContextMenu()
  try {
    const changed = await helper.loadMoreJob(
      new Promise((resolve) => {
        setTimeout(resolve, 1200)
      }),
    )
    following.value = true
    useToast().add({
      color: changed ? 'success' : 'warning',
      title: changed ? '已换一批' : '没有更多职位',
    })
  } catch (error) {
    useToast().add({
      color: 'error',
      title: '换一批失败',
      description: error instanceof Error ? error.message : String(error),
    })
  } finally {
    changingBatch.value = false
  }
}

async function openContextMenu(job: JobData, event: MouseEvent) {
  event.preventDefault()
  const selectedText = normalizeRule(window.getSelection()?.toString() ?? '')
  contextMenu.job = job
  contextMenu.keyword = selectedText.length <= 80 ? selectedText : ''
  contextMenu.visible = true

  await nextTick()
  const menu = contextMenuRef.value
  if (!menu) {
    return
  }
  const rect = menu.getBoundingClientRect()
  contextMenu.x = Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))
  contextMenu.y = Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))
}

function onGlobalPointerDown(event: PointerEvent) {
  if (!contextMenu.visible) {
    return
  }
  const path = event.composedPath()
  if (contextMenuRef.value && path.includes(contextMenuRef.value)) {
    return
  }
  closeContextMenu()
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu()
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', onGlobalPointerDown, true)
  window.addEventListener('keydown', onGlobalKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onGlobalPointerDown, true)
  window.removeEventListener('keydown', onGlobalKeydown, true)
})

function onWheel(e: any) {
  e.preventDefault()
  if (!cards.value) {
    return
  }
  const left = -e.wheelDelta || e.deltaY / 2
  cards.value.scrollLeft = cards.value.scrollLeft + left
  following.value = false
}
function scrollHandler(key = helper.currentJob.value) {
  if (!key) {
    return
  }
  const d = jobSetRef.value[key]
  if (!d || !cards.value) {
    return
  }

  const cardEl = (d && '$el' in d ? d.$el : d) as HTMLElement | null
  if (cardEl && cards.value) {
    const cardLeft = cardEl.offsetLeft
    const cardWidth = cardEl.offsetWidth
    const containerWidth = cards.value.clientWidth
    cards.value.scrollTo({
      left: cardLeft - containerWidth / 2 + cardWidth / 2,
      behavior: 'smooth',
    })
  }
}

watch(
  () => helper.currentJob.value,
  (v) => {
    if (following.value && v) {
      scrollHandler(v)
    }
  },
)
</script>

<template>
  <div style="order: -1" class="boss-helper-card relative">
    <div ref="cards" class="card-grid" @wheel.stop="onWheel" @scroll="closeContextMenu">
      <JobCard
        v-for="job in jobList"
        :ref="
          (ref) => {
            jobSetRef[job.key] = ref
          }
        "
        :key="job.key"
        :job="job"
        hover
        @contextmenu="openContextMenu(job, $event)"
      />
    </div>
    <div class="flex items-center gap-2 absolute bottom-4 left-4 z-10 p-1.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-xl shadow-md border border-neutral-200/80 dark:border-neutral-800">
      <UButton
        size="sm"
        :color="following ? 'primary' : 'neutral'"
        :variant="following ? 'soft' : 'outline'"
        @click="following = !following"
        icon="i-lucide-locate-fixed"
        :title="following ? '自动跟随：开启中 (投递时自动滚动居中当前岗位)' : '自动跟随：已暂停 (点击开启跟随)'"
        data-help="自动跟随：批量投递时自动将当前处理的职位卡片居中展示。手动滑动卡片列表会临时关闭跟随，点击可重新开启"
      >
        {{ following ? '自动跟随' : '跟随已暂停' }}
      </UButton>
      <UButton
        size="sm"
        color="primary"
        variant="outline"
        :disabled="helper.workflowRunning.value"
        :loading="changingBatch"
        icon="i-lucide-refresh-cw"
        :title="helper.workflowRunning.value ? '投递运行中暂不可换一批' : '换一批：加载下一页岗位并追加到卡片列表中 (快捷翻页)'"
        data-help="换一批：调用 Boss 直聘翻页接口加载下一页岗位数据并追加到卡片列表中"
        @click="changeBatch"
      >
        换一批
      </UButton>
      <UDropdownMenu :items="filterItems" :content="{ side: 'top' }" :ui="{ content: 'w-56' }">
        <UButton
          size="sm"
          :color="isFiltered ? 'primary' : 'neutral'"
          :variant="isFiltered ? 'soft' : 'outline'"
          icon="i-lucide-list-filter"
          title="卡片筛选：按投递与过滤状态显示或隐藏下方卡片"
          data-help="卡片筛选：根据投递状态筛选下方卡片列表展示 (如只看投递成功或未开始的职位)"
        >
          卡片筛选
          <span
            v-if="isFiltered"
            class="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/15 font-mono"
          >
            {{ jobList.length }}/{{ helper.jobList.value.length }}
          </span>
        </UButton>
        <template #content-top>
          <div class="p-2.5 border-b border-neutral-100 dark:border-neutral-800">
            <div class="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span>卡片显示筛选</span>
              <span class="text-[11px] font-mono text-neutral-400">显示 {{ jobList.length }}/{{ helper.jobList.value.length }}</span>
            </div>
            <div class="mt-2 flex gap-1.5">
              <UButton size="xs" variant="soft" color="neutral" @click="filterSelectAll" label="全选" />
              <UButton size="xs" variant="soft" color="neutral" @click="filterToggle" label="反选" />
            </div>
          </div>
        </template>
      </UDropdownMenu>
    </div>

    <div class="card-grid-overlay" />

    <div
      v-if="contextMenu.visible && contextMenu.job"
      ref="contextMenuRef"
      class="job-context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @contextmenu.prevent
      @pointerdown.stop
    >
      <div class="context-menu-title">
        {{ contextMenu.job.jobName }}
      </div>
      <UButton
        class="context-menu-action"
        color="neutral"
        icon="i-lucide-building-2"
        variant="ghost"
        @click="toggleContextMenuRule('company')"
      >
        {{
          hasRule(conf.formData.blockedCompanies, contextMenu.job.brand.name)
            ? '取消屏蔽公司'
            : '屏蔽该公司'
        }}
      </UButton>
      <UButton
        v-if="contextMenu.job.boss.name"
        class="context-menu-action"
        color="neutral"
        icon="i-lucide-user-x"
        variant="ghost"
        @click="toggleContextMenuRule('hr')"
      >
        {{
          hasRule(conf.formData.blockedHrs, contextMenu.job.boss.name) ? '取消屏蔽 HR' : '屏蔽该 HR'
        }}
      </UButton>

      <div class="context-menu-separator" />
      <label class="context-menu-label">JD 倾向关键词</label>
      <input
        v-model="contextMenu.keyword"
        class="context-menu-input"
        placeholder="选中 JD 文本或手动输入"
        type="text"
        @keydown.enter.prevent="addJdPreference"
      />
      <UButton
        class="context-menu-action"
        color="primary"
        :disabled="!normalizeRule(contextMenu.keyword)"
        icon="i-lucide-heart-handshake"
        variant="soft"
        @click="addJdPreference"
      >
        增加 JD 倾向
      </UButton>
      <div v-if="conf.formData.jdPreference.value.length" class="context-menu-rules">
        <span
          v-for="item in conf.formData.jdPreference.value.slice(-6)"
          :key="item"
          class="context-menu-chip"
        >
          {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>
