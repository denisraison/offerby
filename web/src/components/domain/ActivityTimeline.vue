<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/utils/currency'
import type { Offer } from '@/types/api'

const props = defineProps<{
  offers: Offer[]
  sellerName: string
}>()

const sortedOffers = computed(() => {
  return [...props.offers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-AU', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const getInitial = (name: string) => name.charAt(0).toUpperCase()
</script>

<template>
  <div class="activity-timeline">
    <header class="timeline-header">
      <h3 class="timeline-title">Activity</h3>
      <span class="timeline-count">{{ sortedOffers.length }}</span>
    </header>

    <div v-if="sortedOffers.length === 0" class="empty-state">
      <p>No offers yet</p>
    </div>

    <ol v-else class="timeline-list">
      <li
        v-for="(entry, idx) in sortedOffers"
        :key="entry.id"
        class="timeline-item"
        :class="entry.proposedBy"
        :style="{ '--delay': `${idx * 50}ms` }"
      >
        <div class="item-rail">
          <span class="rail-dot" />
          <span v-if="idx < sortedOffers.length - 1" class="rail-line" />
        </div>

        <div class="item-content">
          <div class="item-row">
            <span class="actor-avatar" :class="entry.proposedBy">
              {{ getInitial(entry.proposedBy === 'buyer' ? entry.buyerName : sellerName) }}
            </span>

            <span class="action-text">
              <strong class="actor-name">
                {{ entry.proposedBy === 'buyer' ? entry.buyerName : sellerName }}
              </strong>
              offered
            </span>

            <span class="amount" :class="entry.proposedBy">
              {{ formatCurrency(entry.amount) }}
            </span>
          </div>

          <time class="timestamp">{{ formatTime(entry.createdAt) }}</time>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.timeline-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--charcoal);
  margin: 0;
}

.timeline-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--sage);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 9px;
}

.empty-state {
  padding: var(--space-lg);
  text-align: center;
  color: var(--charcoal-soft);
  font-size: 0.875rem;
  background: var(--cream);
  border-radius: 8px;
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: var(--space-sm);
  animation: slideIn 0.3s var(--ease-out) backwards;
  animation-delay: var(--delay);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
}

.item-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  padding-top: 6px;
  flex-shrink: 0;
}

.rail-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cream-dark);
  flex-shrink: 0;
  transition: transform 0.2s var(--ease-bounce);
}

.timeline-item:hover .rail-dot {
  transform: scale(1.25);
}

.timeline-item.buyer .rail-dot {
  background: var(--forest);
}

.timeline-item.seller .rail-dot {
  background: var(--coral);
}

.rail-line {
  width: 1px;
  flex: 1;
  min-height: 12px;
  background: var(--cream-dark);
  margin: 4px 0;
}

.item-content {
  flex: 1;
  padding-bottom: var(--space-md);
  min-width: 0;
}

.timeline-item:last-child .item-content {
  padding-bottom: 0;
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.actor-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--sage-light);
  flex-shrink: 0;
  color: var(--forest);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: var(--font-display);
}

.actor-avatar.seller {
  background: var(--coral-soft);
  color: var(--coral);
}

.action-text {
  font-size: 0.8125rem;
  color: var(--charcoal-soft);
  line-height: 1.4;
}

.actor-name {
  font-weight: 500;
  color: var(--charcoal);
}

.amount {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-left: auto;
  flex-shrink: 0;
}

.amount.buyer {
  color: var(--forest);
}

.amount.seller {
  color: var(--coral);
}

.timestamp {
  display: block;
  font-size: 0.6875rem;
  color: var(--charcoal-soft);
  opacity: 0.6;
  margin-top: 2px;
}
</style>
