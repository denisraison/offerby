<script setup lang="ts">
defineProps<{
  variant?: 'available' | 'negotiating' | 'reserved' | 'sold' | 'neutral'
}>()
</script>

<template>
  <span class="app-badge" :class="`variant-${variant ?? 'neutral'}`">
    <slot />
  </span>
</template>

<style scoped>
.app-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.variant-available {
  background: var(--sage-light);
  color: var(--forest);
}

.variant-negotiating {
  background: var(--coral);
  color: white;
}

.variant-reserved {
  background: var(--forest);
  color: var(--cream);
}

.variant-sold {
  background: var(--charcoal-soft);
  color: white;
}

.variant-neutral {
  background: var(--cream-dark);
  color: var(--charcoal);
}
</style>
