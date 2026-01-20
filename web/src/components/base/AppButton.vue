<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="app-button"
    :class="[`variant-${variant ?? 'primary'}`, `size-${size ?? 'md'}`]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-family: var(--font-body);
  font-weight: 500;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
  border: none;
  text-decoration: none;
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.size-sm {
  padding: var(--space-sm) var(--space-md);
  font-size: 0.8125rem;
}

.size-md {
  padding: var(--space-md) var(--space-lg);
  font-size: 0.9375rem;
}

.size-lg {
  padding: var(--space-lg) var(--space-xl);
  font-size: 1rem;
}

/* Variants */
.variant-primary {
  background: var(--coral);
  color: white;
  box-shadow: 0 4px 20px rgba(232, 93, 76, 0.25);
}

.variant-primary:hover:not(:disabled) {
  background: var(--forest);
  box-shadow: 0 6px 30px rgba(26, 47, 35, 0.3);
  transform: translateY(-2px);
}

.variant-secondary {
  background: var(--forest);
  color: white;
}

.variant-secondary:hover:not(:disabled) {
  background: var(--forest-light);
  transform: translateY(-1px);
}

.variant-outline {
  background: transparent;
  color: var(--charcoal);
  border: 1.5px solid var(--charcoal);
}

.variant-outline:hover:not(:disabled) {
  background: var(--charcoal);
  color: white;
}

.variant-ghost {
  background: transparent;
  color: var(--charcoal-soft);
}

.variant-ghost:hover:not(:disabled) {
  color: var(--charcoal);
  background: rgba(45, 45, 45, 0.05);
}
</style>
