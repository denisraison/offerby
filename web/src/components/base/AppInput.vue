<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'textarea'
  placeholder?: string
  disabled?: boolean
}>()

const model = defineModel<string>()
</script>

<template>
  <div class="app-input-wrapper" :class="{ 'has-error': error }">
    <label v-if="label" class="input-label">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
      v-model="model"
      class="input-field textarea"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    <input
      v-else
      v-model="model"
      class="input-field"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    <span v-if="error" class="input-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.app-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.input-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--charcoal);
}

.input-field {
  padding: var(--space-md) var(--space-lg);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--charcoal);
  background: white;
  border: 1.5px solid var(--cream-dark);
  border-radius: 12px;
  transition: all 0.2s var(--ease-out);
}

.input-field::placeholder {
  color: var(--charcoal-soft);
}

.input-field:focus {
  outline: none;
  border-color: var(--forest);
  box-shadow: 0 0 0 3px rgba(26, 47, 35, 0.1);
}

.input-field:disabled {
  background: var(--cream-dark);
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  min-height: 120px;
}

.has-error .input-field {
  border-color: var(--coral);
}

.has-error .input-field:focus {
  box-shadow: 0 0 0 3px rgba(232, 93, 76, 0.1);
}

.input-error {
  font-size: 0.75rem;
  color: var(--coral);
  font-weight: 500;
}
</style>
