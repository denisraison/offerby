<script setup lang="ts">
import { formatCurrency } from '@/utils/currency'

export interface TimelineEvent {
  type: 'offer' | 'counter'
  from: 'buyer' | 'seller'
  amount: number
  time: string
  buyerName?: string
}

const props = defineProps<{
  events: TimelineEvent[]
  askingPrice: number
}>()

const getMarkerPosition = (amount: number) => {
  return `${(amount / props.askingPrice) * 100}%`
}

const currentOffer = () => {
  const last = props.events[props.events.length - 1] as TimelineEvent | undefined
  return last?.amount ?? 0
}
</script>

<template>
  <div class="timeline">
    <div class="timeline-track">
      <div
        class="timeline-progress"
        :style="{ width: `${(currentOffer() / askingPrice) * 100}%` }"
      />
    </div>
    <div class="timeline-markers">
      <div
        v-for="(event, idx) in events"
        :key="idx"
        class="timeline-marker"
        :class="event.from"
        :style="{ left: getMarkerPosition(event.amount) }"
      >
        <span v-if="event.buyerName" class="marker-buyer">{{ event.buyerName }}</span>
        <span class="marker-amount">{{ formatCurrency(event.amount) }}</span>
        <span class="marker-dot" />
        <span class="marker-time">{{ event.time }}</span>
      </div>
    </div>
    <div class="timeline-endpoints">
      <span class="endpoint start">$0</span>
      <span class="endpoint end">{{ formatCurrency(askingPrice) }}</span>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  position: relative;
  padding: var(--space-2xl) 0 var(--space-lg);
}

.timeline-track {
  height: 6px;
  background: var(--cream-dark);
  border-radius: 3px;
  overflow: hidden;
}

.timeline-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--sage) 0%, var(--coral) 100%);
  border-radius: 3px;
  transition: width 0.5s var(--ease-out);
}

.timeline-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
}

.timeline-marker {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.marker-buyer {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--charcoal-soft);
  white-space: nowrap;
}

.marker-amount {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--charcoal);
  white-space: nowrap;
  background: white;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.marker-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.timeline-marker.buyer .marker-dot {
  background: var(--sage);
}

.timeline-marker.seller .marker-dot {
  background: var(--coral);
}

.marker-time {
  font-size: 0.6875rem;
  color: var(--charcoal-soft);
  white-space: nowrap;
}

.timeline-endpoints {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-sm);
  font-size: 0.75rem;
  color: var(--charcoal-soft);
}
</style>
