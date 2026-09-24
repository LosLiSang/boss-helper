<script setup lang="ts">
import { computed, ref } from 'vue'

import { useConf } from '@/composables/conf'
import { JobStatus } from '@/composables/useApplying/type'
import { JobData, useHelper } from '@/composables/useHelper'

const helper = useHelper()
const conf = useConf()

const props = defineProps<{
  job: JobData
  hover?: boolean
}>()

const jobResult = computed(() => {
  return helper.jobResultMaps.get(props.job.key)
})

const stateMaps: Record<JobStatus, string> = {
  pending: '#CECECE',
  wait: '#CECECE',
  error: '#e74c3c',
  warn: '#f39c12',
  success: '#2ecc71',
  running: '#98F5F9',
  request: '#3498db',
  ai: '#9b59b6',
}

const jobStatus = computed(() => {
  const status = jobResult.value?.status ?? 'pending'
  const data = stateMaps[status]
  return {
    status,
    color: data,
    show: jobResult.value?.status !== 'pending' ? 'flex' : 'none',
  }
})

const showDescription = ref(false)
const showDescriptionLoading = ref(false)
const showDescriptionMessage = ref<string | null>(null)

const isCompanyBlocked = computed(() => {
  const company = props.job.brand.name.trim().toLowerCase()
  return conf.formData.blockedCompanies.some((item) => item.trim().toLowerCase() === company)
})

const isHrBlocked = computed(() => {
  const hr = props.job.boss.name.trim().toLowerCase()
  return conf.formData.blockedHrs.some((item) => item.trim().toLowerCase() === hr)
})

const isJdPreferred = computed(() => {
  if (!conf.formData.jdPreference.enable || !props.job.jobDescription) {
    return false
  }
  const description = props.job.jobDescription.toLowerCase()
  return conf.formData.jdPreference.value.some(
    (item) => item && description.includes(item.toLowerCase()),
  )
})

const activeTimeLabel = computed(() => {
  const job = props.job
  if (!job.activeTime && !job.activeTimeStr) {
    return ''
  }
  const date = job.activeTime
    ? new Date(job.activeTime).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      })
    : ''
  return [date, job.activeTimeStr].filter(Boolean).join(' · ')
})

async function showDescriptionHandler() {
  showDescription.value = true
  showDescriptionLoading.value = true
  showDescriptionMessage.value = null
  try {
    await helper.onJobCardClick(props.job.key)
  } catch (e) {
    console.error('showDescriptionHandler error', e)
    showDescriptionMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    showDescriptionLoading.value = false
  }
}

function getActiveTimeType(job: JobData): 'success' | 'warning' | 'error' {
  const activeTime = job.activeTime
  if (!activeTime) return 'error'

  const now = Date.now()
  const diffDays = (now - activeTime) / (1000 * 60 * 60 * 24)

  if (diffDays <= 2) return 'success'
  if (diffDays <= 7) return 'warning'
  return 'error'
}
</script>

<template>
  <div
    class="job-card"
    :class="{
      'job-card-hover': hover,
      'job-card-blocked': isCompanyBlocked || isHrBlocked,
      'job-card-preferred': isJdPreferred,
    }"
    :style="{
      '--state-color': jobStatus.color,
      '--state-show': jobStatus.show,
    }"
    v-if="job"
  >
    <div class="card-tag">
      <span
        v-if="isCompanyBlocked || isHrBlocked"
        class="rule-flag blocked"
        title="公司或 HR 已屏蔽"
      >
        屏蔽
      </span>
      <span v-if="isJdPreferred" class="rule-flag preferred" title="命中 JD 倾向">倾向</span>
      <span class="card-tag-text"
        >{{ job.brand.industry }} · {{ job.degreeName }} · {{ job.brand.scale }}</span
      >
    </div>
    <!-- `https://www.zhipin.com/job_detail/${job.encryptJobId}.html`" -->
    <a :href="job.link" target="_blank" class="card-title">
      {{ job.jobName }}
    </a>
    <div class="salary-row">
      <h3 class="card-salary">
        {{ job.salary }}
      </h3>
      <span
        v-if="activeTimeLabel"
        class="active-pill"
        :class="getActiveTimeType(job)"
        :title="
          job.activeTime ? new Date(job.activeTime).toLocaleString('zh-CN') : job.activeTimeStr
        "
      >
        {{ activeTimeLabel }}
      </span>
    </div>
    <div
      v-show="showDescription"
      class="card-content"
      :title="job.jobDescription"
      @click="showDescription = false"
    >
      <template v-if="showDescriptionLoading">
        加载中...
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-4/5" />
      </template>
      <template v-else-if="showDescriptionMessage">
        {{ showDescriptionMessage }}
      </template>
      <template v-else>
        {{ job.jobDescription }}
      </template>
    </div>
    <div v-show="!showDescription" class="card-content" @click="showDescriptionHandler">
      <div v-if="job.skills.length || job.jobLabels.length">
        <div class="tag-list">
          <span v-for="tag in job.skills" :key="tag" class="tag-chip skill">
            {{ tag }}
          </span>
          <span v-for="tag in job.jobLabels" :key="tag" class="tag-chip label">
            {{ tag }}
          </span>
        </div>
      </div>
      <div v-if="!job.skills.length && !job.jobLabels.length" class="jd-placeholder">
        点击加载 JD，右键可屏蔽公司 / HR 或添加倾向
      </div>
      <div class="card-footer" v-if="job.welfareList && job.welfareList.length > 0">
        <span class="footer-label">福利</span>
        <div class="footer-text">{{ job.welfareList.join(' · ') }}</div>
      </div>
    </div>

    <div class="author-row">
      <img alt="" class="avatar" height="80" :src="job.brand.logo" width="80" />
      <div class="author-text">
        <span class="company-name">{{ job.brand.name }}</span>
        <div v-if="job.boss.name || job.boss.title" class="boss-line">
          {{ [job.boss.name, job.boss.title].filter(Boolean).join(' · ') }}
        </div>
        <!-- <h4>{{ job.cityName }}/{{ job.areaDistrict }}/{{ job.businessDistrict }}</h4> -->
        <h4>{{ job.address }}</h4>
      </div>
    </div>
    <div
      class="card-status flex-row gap-2 justify-center items-center"
      v-if="jobResult"
      :title="jobResult?.reason || jobResult?.msg"
    >
      <UIcon v-if="jobStatus.status === 'running'" name="i-line-md-loading-twotone-loop" />
      <UIcon v-else-if="jobStatus.status === 'request'" name="i-svg-spinners-wifi-fade" />
      <UIcon v-else-if="jobStatus.status === 'ai'" name="i-line-md-hazard-lights-loop" />
      {{ jobResult?.msg || jobResult?.reason || '无内容' }}
    </div>
  </div>
</template>
