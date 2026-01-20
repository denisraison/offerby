<script setup lang="ts">
import AppButton from '@/components/base/AppButton.vue'
import NegotiationTimeline, { type TimelineEvent } from './NegotiationTimeline.vue'
import { formatCurrency } from '@/utils/currency'

defineProps<{
  product: string
  counterparty: string
  timeline: TimelineEvent[]
  currentOffer: number
  askingPrice: number
  productId: number
}>()

defineEmits<{
  accept: []
  counter: []
}>()
</script>

<template>
  <article class="negotiation-card">
    <div class="neg-header">
      <h3 class="neg-product">{{ product }}</h3>
      <span class="neg-buyer">with {{ counterparty }}</span>
    </div>

    <NegotiationTimeline :events="timeline" :asking-price="askingPrice" />

    <div class="neg-actions">
      <AppButton variant="secondary" @click="$emit('accept')">
        Accept {{ formatCurrency(currentOffer) }}
      </AppButton>
      <AppButton variant="outline" @click="$emit('counter')">
        Counter Offer
      </AppButton>
    </div>
  </article>
</template>

<style scoped>
.negotiation-card {
  background: white;
  border-radius: 24px;
  padding: var(--space-xl);
  border: 1px solid rgba(26, 47, 35, 0.04);
  transition: all 0.3s var(--ease-out);
}

.negotiation-card:hover {
  box-shadow: 0 16px 40px rgba(26, 47, 35, 0.08);
}

.neg-header {
  margin-bottom: var(--space-lg);
}

.neg-product {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 500;
  color: var(--charcoal);
  margin-bottom: var(--space-xs);
}

.neg-buyer {
  font-size: 0.8125rem;
  color: var(--charcoal-soft);
}

.neg-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.neg-actions > * {
  flex: 1;
}
</style>
