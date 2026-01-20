<script setup lang="ts">
import AppHeader from './AppHeader.vue'

defineProps<{
  user?: {
    name: string
    email: string
    avatar?: string
  }
  hideHeader?: boolean
}>()
</script>

<template>
  <div class="page-layout">
    <div class="ambient-bg" />
    <AppHeader v-if="!hideHeader" :user="user" />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.page-layout {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.main-content {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl);
}
</style>
