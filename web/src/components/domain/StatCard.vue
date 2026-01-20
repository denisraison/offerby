<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  highlight?: boolean
  showPulse?: boolean
  showDecoration?: boolean
}>()
</script>

<template>
  <div class="stat-card" :class="{ highlight }">
    <span class="stat-value">{{ value }}</span>
    <span class="stat-label">{{ label }}</span>
    <div v-if="showDecoration && !highlight" class="stat-decoration" />
    <div v-if="showPulse && highlight" class="stat-pulse" />
  </div>
</template>

<style scoped>
.stat-card {
  position: relative;
  background: white;
  padding: var(--space-xl);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s var(--ease-out);
  border: 1px solid rgba(26, 47, 35, 0.04);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(26, 47, 35, 0.08);
}

.stat-card.highlight {
  background: var(--forest);
  color: var(--cream);
}

.stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 600;
  line-height: 1;
  margin-bottom: var(--space-sm);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--charcoal-soft);
  font-weight: 500;
}

.stat-card.highlight .stat-label {
  color: var(--sage-light);
}

.stat-decoration {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: var(--sage-light);
  opacity: 0.3;
  border-radius: 50%;
}

.stat-pulse {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  width: 10px;
  height: 10px;
  background: var(--coral);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}
</style>
