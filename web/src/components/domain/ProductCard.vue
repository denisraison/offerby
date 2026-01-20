<script setup lang="ts">
import AppBadge from '@/components/base/AppBadge.vue'
import { formatCurrency } from '@/utils/currency'

export type ProductStatus = 'available' | 'negotiating' | 'reserved' | 'sold'

defineProps<{
  name: string
  price: number
  status: ProductStatus
  image?: string | null
  offers?: number
}>()
</script>

<template>
  <article class="product-card">
    <div class="product-image">
      <img v-if="image" :src="image" :alt="name" class="image" />
      <div v-else class="image-placeholder">
        <span>{{ name.charAt(0) }}</span>
      </div>
      <AppBadge :variant="status" class="product-status">
        {{ status }}
      </AppBadge>
    </div>
    <div class="product-info">
      <h3 class="product-name">{{ name }}</h3>
      <div class="product-meta">
        <span class="product-price">{{ formatCurrency(price) }}</span>
        <span v-if="offers && offers > 0" class="product-offers">
          {{ offers }} offer{{ offers > 1 ? 's' : '' }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  gap: var(--space-md);
  background: white;
  border-radius: 16px;
  padding: var(--space-md);
  border: 1px solid rgba(26, 47, 35, 0.04);
  transition: all 0.3s var(--ease-out);
  cursor: pointer;
}

.product-card:hover {
  transform: translateX(8px);
  box-shadow: 0 8px 24px rgba(26, 47, 35, 0.06);
}

.product-image {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--sage-light) 0%, var(--cream-dark) 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--forest);
}

.product-status {
  position: absolute;
  top: -6px;
  right: -6px;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--charcoal);
  margin-bottom: var(--space-xs);
}

.product-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.product-price {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--forest);
}

.product-offers {
  font-size: 0.75rem;
  color: var(--coral);
  font-weight: 500;
}
</style>
