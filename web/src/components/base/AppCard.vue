<script setup lang="ts">
defineProps<{
  header?: string
  hoverable?: boolean
}>()
</script>

<template>
  <div class="app-card" :class="{ hoverable }">
    <div v-if="header || $slots.header" class="card-header">
      <slot name="header">
        <h3 class="card-header-title">{{ header }}</h3>
      </slot>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-card {
  background: white;
  border-radius: 20px;
  border: 1px solid rgba(26, 47, 35, 0.04);
  overflow: hidden;
  transition: all 0.3s var(--ease-out);
}

.app-card.hoverable:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(26, 47, 35, 0.08);
}

.card-header {
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid rgba(26, 47, 35, 0.04);
}

.card-header-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--forest);
}

.card-body {
  padding: var(--space-xl);
}
</style>
