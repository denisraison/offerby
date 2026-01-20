<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  size?: 'sm' | 'md' | 'lg'
  src?: string
  initials?: string
}>()

const displayInitials = computed(() => {
  if (props.initials) return props.initials.toUpperCase().slice(0, 2)
  return props.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <div class="app-avatar" :class="`size-${size ?? 'md'}`">
    <img v-if="src" :src="src" :alt="name" class="avatar-image" />
    <span v-else class="avatar-initials">{{ displayInitials }}</span>
  </div>
</template>

<style scoped>
.app-avatar {
  border-radius: 50%;
  background: var(--forest);
  color: var(--cream);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  overflow: hidden;
}

.size-sm {
  width: 32px;
  height: 32px;
  font-size: 0.75rem;
}

.size-md {
  width: 40px;
  height: 40px;
  font-size: 0.875rem;
}

.size-lg {
  width: 56px;
  height: 56px;
  font-size: 1.125rem;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  line-height: 1;
}
</style>
